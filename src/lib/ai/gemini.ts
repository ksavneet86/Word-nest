import "server-only";
import { fetchPictogramId } from "@/lib/arasaac";
import type { GeneratedWord } from "@/lib/types";
import { BadRequestError } from "@/lib/server/api-utils";

// Fast, generous-free-tier multimodal model. Override with GEMINI_MODEL if needed.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

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

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody),
    });
  } catch (e) {
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

  if (!res.ok) {
    console.error("[gemini] request failed", res.status, rawBody);
    const detail = geminiErrorDetail(parsedBody) ?? (rawBody.trim() || null);
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

/**
 * Calls Gemini in native JSON mode (responseMimeType + responseSchema) and parses the result.
 * Far more reliable than instructing "return only JSON" in the prompt text.
 */
async function callGeminiJSON<T>(
  system: string,
  parts: GeminiPart[],
  responseSchema: Record<string, unknown>,
  maxOutputTokens: number,
  truncatedMessage: string
): Promise<T> {
  const { text, finishReason } = await generateContent({ system, parts, maxOutputTokens, responseSchema });
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new BadRequestError(
      finishReason === "MAX_TOKENS"
        ? truncatedMessage
        : "Couldn't understand the AI's response — try again."
    );
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

/** Batches of 3 words per Gemini call, run several batches concurrently so a whole word list can finish inside one request. */
export async function generateWordBatch(words: string[]): Promise<GeneratedWord[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += 3) chunks.push(words.slice(i, i + 3));

  const chunkResults = await mapWithConcurrency(chunks, 5, async (chunk) => {
    const parsed = await callGeminiJSON<GeneratedWord[]>(
      GENERATE_SYSTEM,
      [{ text: `Words: ${JSON.stringify(chunk)}` }],
      WORD_BATCH_SCHEMA,
      4096,
      "Some of these words needed too much detail to generate at once — try uploading a smaller batch."
    );
    return Promise.all(parsed.map(async (w) => ({ ...w, pictogramId: await fetchPictogramId(w.word) })));
  });

  return chunkResults.flat();
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
