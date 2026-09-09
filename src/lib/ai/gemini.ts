import "server-only";
import { fetchPictogramId } from "@/lib/arasaac";
import type { GeneratedWord } from "@/lib/types";
import { BadRequestError } from "@/lib/server/api-utils";

// Fast, generous-free-tier multimodal model. Override with GEMINI_MODEL if needed.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// --- Rate limiting ----------------------------------------------------------
// Gemini's free tier allows 15 requests/minute. A photo of a long word list can
// fan out into dozens of calls, so we (a) space out call *starts* to ~14/min and
// (b) transparently retry on 429s. Both keep a big job under the cap instead of
// surfacing an error. The spacing gate is per server instance; concurrent HTTP
// requests each throttle independently, and the retry loop covers any overlap.
const MIN_CALL_SPACING_MS = Number(process.env.GEMINI_MIN_CALL_SPACING_MS) || 4300;
const MAX_RATE_LIMIT_RETRIES = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let nextCallSlot = 0;
/** Blocks until this caller's turn, reserving the slot so concurrent callers stack up rather than collide. */
async function waitForCallSlot(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextCallSlot);
  nextCallSlot = slot + MIN_CALL_SPACING_MS;
  if (slot > now) await sleep(slot - now);
}

/** How long Gemini asks us to wait after a 429 — from the Retry-After header or error.details[].retryDelay ("38s"). */
function retryAfterMs(headers: Headers, body: unknown): number | null {
  const header = headers.get("retry-after");
  if (header) {
    const secs = Number(header);
    if (Number.isFinite(secs)) return secs * 1000;
    const when = Date.parse(header);
    if (Number.isFinite(when)) return Math.max(0, when - Date.now());
  }
  const details = (body as { error?: { details?: { retryDelay?: string }[] } })?.error?.details;
  const raw = details?.find((d) => typeof d?.retryDelay === "string")?.retryDelay;
  const match = raw ? /^([\d.]+)s$/.exec(raw.trim()) : null;
  return match ? Math.round(parseFloat(match[1]) * 1000) : null;
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Minimal shape of a Gemini generateContent response we rely on. */
type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
};

/** Pulls the human-readable message out of a Gemini error body: `{ error: { code, message, status } }`. */
function geminiErrorDetail(body: unknown): string | null {
  const message = (body as { error?: { message?: unknown } })?.error?.message;
  return typeof message === "string" && message.trim() ? message.trim() : null;
}

/**
 * Wraps a Gemini generateContent REST call so a rejection from the API (bad image data,
 * unsupported format, quota, etc.) becomes a BadRequestError with a message users actually
 * see, instead of an unhandled exception that api-utils.ts flattens into "Something went wrong".
 * The real Gemini error text is surfaced to the user in every environment, since the generic
 * fallback strings hid what was actually wrong and server logs aren't always reachable.
 */
async function generateContent(opts: {
  system: string;
  parts: GeminiPart[];
  maxOutputTokens: number;
  responseSchema?: Record<string, unknown>;
}): Promise<{ text: string; finishReason: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const requestBody = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: opts.maxOutputTokens,
      ...(opts.responseSchema
        ? { responseMimeType: "application/json", responseSchema: opts.responseSchema }
        : {}),
    },
  };

  for (let attempt = 0; ; attempt++) {
    await waitForCallSlot();

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/models/${MODEL}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify(requestBody),
      });
    } catch (e) {
      if (attempt < 2) {
        console.warn(`[gemini] network error, retrying (attempt ${attempt + 1})`, e);
        await sleep(2000 * (attempt + 1));
        continue;
      }
      console.error("[gemini] request could not be sent", e);
      throw new BadRequestError(
        "The AI service had trouble with that request — please try again in a moment."
      );
    }

    const rawBody = await res.text();
    let parsedBody: unknown = null;
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      /* leave parsedBody null; rawBody is used as the detail fallback */
    }

    // Rate limited (429) or transient overload (503) — back off and retry silently.
    if ((res.status === 429 || res.status === 503) && attempt < MAX_RATE_LIMIT_RETRIES) {
      const waitMs = retryAfterMs(res.headers, parsedBody) ?? Math.min(4000 * 2 ** attempt, 45000);
      console.warn(
        `[gemini] ${res.status}; backing off ${waitMs}ms (attempt ${attempt + 1}/${MAX_RATE_LIMIT_RETRIES})`
      );
      // Push the shared slot out too, so other in-flight calls also slow down.
      nextCallSlot = Math.max(nextCallSlot, Date.now() + waitMs);
      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      console.error("[gemini] request failed", res.status, rawBody);
      const detail = geminiErrorDetail(parsedBody) ?? (rawBody.trim() || null);
      if (res.status === 429 || res.status === 503) {
        throw new BadRequestError(
          "The AI service is very busy right now — please wait a minute and try again."
        );
      }
      if (res.status === 400) {
        throw new BadRequestError(
          detail
            ? `Gemini rejected that request: ${detail}`
            : "Couldn't read that file — try a different photo (JPEG, PNG, GIF, WEBP) or a PDF instead."
        );
      }
      throw new BadRequestError(
        detail
          ? `The AI service had trouble with that request: ${detail}`
          : "The AI service had trouble with that request — please try again in a moment."
      );
    }

    const data = parsedBody as GeminiResponse;
    const candidate = data?.candidates?.[0];
    if (!candidate) {
      const blocked = data?.promptFeedback?.blockReasonMessage || data?.promptFeedback?.blockReason;
      console.error("[gemini] response had no candidates", rawBody);
      throw new BadRequestError(
        blocked
          ? `Gemini blocked that request: ${blocked}`
          : "The AI service returned nothing — please try again in a moment."
      );
    }

    const text = (candidate.content?.parts ?? []).map((p) => p.text ?? "").join("");
    return { text, finishReason: candidate.finishReason ?? null };
  }
}

/** Thrown when Gemini hit its output-token limit mid-JSON, so the caller can split the batch and retry. */
class TruncatedResponseError extends Error {}

/**
 * Calls Gemini in native JSON mode (responseMimeType + responseSchema) and parses the result.
 * Far more reliable than instructing "return only JSON" in the prompt text.
 * Throws TruncatedResponseError when the response was cut off at the token limit.
 */
async function callGeminiJSON<T>(
  system: string,
  parts: GeminiPart[],
  responseSchema: Record<string, unknown>,
  maxOutputTokens: number
): Promise<T> {
  const { text, finishReason } = await generateContent({ system, parts, maxOutputTokens, responseSchema });
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    if (finishReason === "MAX_TOKENS") throw new TruncatedResponseError("Gemini response was truncated");
    throw new BadRequestError("Couldn't understand the AI's response — try again.");
  }
}

const GENERATE_SYSTEM =
  "You are a children's dictionary assistant. For each input word, fill in every field: " +
  "meaning (simple, kid-friendly, under 14 words), " +
  "pos (the word's part of speech), " +
  "synonyms (3 simple synonym words), antonyms (2-3 simple antonym words), " +
  "sentenceTip (one short example sentence using the word), " +
  "emoji (a single emoji that best visually represents the word's meaning), " +
  "difficulty (judged for an 11+ exam student), " +
  "category (the best-fitting category), " +
  "forms (if pos is noun set singular and plural; if pos is verb set present, past and pastParticiple; otherwise leave the object empty), " +
  "needsMotion (true if the word describes something hard to show in one still picture, e.g. speed/manner/emotion-over-time adjectives or adverbs like quick, slow, shy, clumsy — otherwise false), " +
  "visualQuery (only when needsMotion is true: a short 1-3 word GIF search tag for this word's meaning — the kind of simple, " +
  "common phrase that finds a well-tagged, recognizable clip on Giphy, e.g. 'shy kid' or 'running fast'. " +
  "Prefer simple everyday tags over elaborate scene descriptions, since long descriptive phrases tend to return irrelevant results).";

const WORD_BATCH_SCHEMA: Record<string, unknown> = {
  type: "array",
  items: {
    type: "object",
    properties: {
      word: { type: "string" },
      meaning: { type: "string" },
      pos: {
        type: "string",
        enum: ["noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "interjection"],
      },
      synonyms: { type: "array", items: { type: "string" } },
      antonyms: { type: "array", items: { type: "string" } },
      sentenceTip: { type: "string" },
      emoji: { type: "string" },
      difficulty: { type: "string", enum: ["low", "moderate", "high"] },
      category: {
        type: "string",
        enum: ["animals", "food", "school", "nature", "feelings", "actions", "people", "objects", "places", "time", "other"],
      },
      forms: {
        type: "object",
        properties: {
          singular: { type: "string" },
          plural: { type: "string" },
          present: { type: "string" },
          past: { type: "string" },
          pastParticiple: { type: "string" },
        },
      },
      needsMotion: { type: "boolean" },
      visualQuery: { type: "string" },
    },
    required: [
      "word",
      "meaning",
      "pos",
      "synonyms",
      "antonyms",
      "sentenceTip",
      "emoji",
      "difficulty",
      "category",
      "needsMotion",
    ],
    propertyOrdering: [
      "word",
      "meaning",
      "pos",
      "synonyms",
      "antonyms",
      "sentenceTip",
      "emoji",
      "difficulty",
      "category",
      "forms",
      "needsMotion",
      "visualQuery",
    ],
  },
};

/** Runs `fn` over `items` with at most `limit` calls in flight at once, preserving order. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Words per Gemini call. Kept small so a rich JSON response for the group fits well
// inside the 8192-token budget; if a group still overflows, generateForGroup splits
// it and retries. The rate limiter in generateContent paces the resulting calls.
const WORDS_PER_CALL = 5;

/** Generates full word data for one small group; on a truncated response, splits the group in half and retries so a big page still completes. */
async function generateForGroup(words: string[]): Promise<GeneratedWord[]> {
  try {
    const parsed = await callGeminiJSON<GeneratedWord[]>(
      GENERATE_SYSTEM,
      [{ text: `Words: ${JSON.stringify(words)}` }],
      WORD_BATCH_SCHEMA,
      8192
    );
    return Promise.all(parsed.map(async (w) => ({ ...w, pictogramId: await fetchPictogramId(w.word) })));
  } catch (e) {
    if (!(e instanceof TruncatedResponseError)) throw e;
    if (words.length <= 1) {
      throw new BadRequestError(
        `"${words[0]}" needed too much detail to generate — try again, or remove it from the list.`
      );
    }
    const mid = Math.ceil(words.length / 2);
    const first = await generateForGroup(words.slice(0, mid));
    const second = await generateForGroup(words.slice(mid));
    return [...first, ...second];
  }
}

/** Generates full word data in groups of WORDS_PER_CALL, a few groups at a time (the rate limiter in generateContent paces the actual calls). */
export async function generateWordBatch(words: string[]): Promise<GeneratedWord[]> {
  const groups: string[][] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_CALL) groups.push(words.slice(i, i + WORDS_PER_CALL));

  const groupResults = await mapWithConcurrency(groups, 3, (group) => generateForGroup(group));

  return groupResults.flat();
}

const EXTRACT_SYSTEM =
  "Extract every distinct English vocabulary word visible in this file. Return a JSON array of lowercase strings, " +
  "no duplicates. Ignore numbers and punctuation.";

const EXTRACT_SCHEMA: Record<string, unknown> = { type: "array", items: { type: "string" } };

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/**
 * Extracts vocabulary words from an uploaded image or PDF. The file is sent as inline base64
 * data (Gemini's `inlineData` part); images and PDFs use the identical shape, so `isPdf` is
 * retained only for call-site compatibility.
 */
export async function extractWordsFromFile(
  base64: string,
  mediaType: ImageMediaType | "application/pdf",
  isPdf: boolean
): Promise<string[]> {
  void isPdf; // `mediaType` already distinguishes PDFs; kept for call-site signature parity.
  const parts: GeminiPart[] = [
    { text: "Extract the words." },
    { inlineData: { mimeType: mediaType, data: base64 } },
  ];

  const { text, finishReason } = await generateContent({
    system: EXTRACT_SYSTEM,
    parts,
    maxOutputTokens: 8192,
    responseSchema: EXTRACT_SCHEMA,
  });

  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as string[];
  } catch {
    // Response got cut off mid-array — salvage every complete "word" that was
    // already emitted before the truncation point instead of failing outright.
    const salvaged = [...cleaned.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    if (salvaged.length) return salvaged;
    throw new BadRequestError(
      finishReason === "MAX_TOKENS"
        ? "The word list was too long to read in one go — try a smaller photo or a shorter section of the list."
        : "Couldn't understand the AI's response — try again."
    );
  }
}
