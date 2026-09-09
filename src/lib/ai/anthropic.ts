import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { fetchPictogramId } from "@/lib/arasaac";
import type { GeneratedWord } from "@/lib/types";
import { BadRequestError } from "@/lib/server/api-utils";

const MODEL = "claude-sonnet-5";

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey });
}

function extractText(content: Anthropic.Messages.ContentBlock[]) {
  return content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n");
}

/**
 * Pulls the human-readable message out of an Anthropic API error. The SDK nests it at
 * `error.error.message` (the raw JSON body `{ type: "error", error: { type, message } }`),
 * with a flatter `error.message` on some versions — try both, then the SDK's own composed
 * `.message` as a last resort.
 */
function anthropicErrorDetail(e: unknown): string | null {
  if (!(e instanceof Anthropic.APIError)) return null;
  const body = e.error as { message?: unknown; error?: { message?: unknown } } | undefined;
  const candidates = [body?.error?.message, body?.message, e.message];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

/**
 * Wraps client().messages.create() so a rejection from Claude's API (bad image data,
 * unsupported format, etc.) becomes a BadRequestError with a message users actually see,
 * instead of an unhandled exception that api-utils.ts flattens into "Something went wrong".
 * The real Anthropic error text is surfaced to the user in every environment, since the
 * generic fallback strings hid what was actually wrong and server logs aren't always reachable.
 */
async function createMessage(params: Anthropic.MessageCreateParamsNonStreaming) {
  try {
    return await client().messages.create(params);
  } catch (e) {
    console.error("[anthropic] request failed", e);
    const detail = anthropicErrorDetail(e);
    if (e instanceof Anthropic.APIError && e.status === 400) {
      throw new BadRequestError(
        detail
          ? `Claude rejected that request: ${detail}`
          : "Couldn't read that file — try a different photo (JPEG, PNG, GIF, WEBP) or a PDF instead."
      );
    }
    throw new BadRequestError(
      detail
        ? `The AI service had trouble with that request: ${detail}`
        : "The AI service had trouble with that request — please try again in a moment."
    );
  }
}

async function callClaudeJSON<T>(
  system: string,
  content: Anthropic.Messages.MessageParam["content"],
  maxTokens = 1000,
  truncatedMessage = "That took too much to generate in one go — try again with fewer words."
): Promise<T> {
  const res = await createMessage({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content }],
  });
  const text = extractText(res.content).replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new BadRequestError(res.stop_reason === "max_tokens" ? truncatedMessage : "Couldn't understand the AI's response — try again.");
  }
}

const GENERATE_SYSTEM =
  "You are a children's dictionary assistant. Return ONLY a JSON array, no prose, no markdown fences. " +
  "For each input word, produce an object with keys: " +
  "word, meaning (simple, kid-friendly, under 14 words), " +
  "pos (one of: noun, verb, adjective, adverb, pronoun, preposition, conjunction, interjection), " +
  "synonyms (array of 3 simple synonym words), antonyms (array of 2-3 simple antonym words), " +
  "sentenceTip (one short example sentence using the word), " +
  "emoji (a single emoji that best visually represents the word's meaning), " +
  "difficulty (one of: low, moderate, high — for an 11+ exam student), " +
  "category (one of: animals, food, school, nature, feelings, actions, people, objects, places, time, other), " +
  "forms (an object; if pos is noun include {singular, plural}; if pos is verb include {present, past, pastParticiple}; otherwise omit or use {}), " +
  "needsMotion (true if the word describes something hard to show in one still picture, e.g. speed/manner/emotion-over-time adjectives or adverbs like quick, slow, shy, clumsy — otherwise false), " +
  "visualQuery (only if needsMotion is true: a short 1-3 word GIF search tag for this word's meaning — the kind of simple, " +
  "common phrase that finds a well-tagged, recognizable clip on Giphy, e.g. 'shy kid' or 'running fast'. " +
  "Prefer simple everyday tags over elaborate scene descriptions, since long descriptive phrases tend to return irrelevant results.)";

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

/** Ports generateWordBatch() from the reference artifact — batches of 3 words per Claude call, run several batches concurrently so a whole word list can finish inside one request. */
export async function generateWordBatch(words: string[]): Promise<GeneratedWord[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < words.length; i += 3) chunks.push(words.slice(i, i + 3));

  const chunkResults = await mapWithConcurrency(chunks, 5, async (chunk) => {
    const parsed = await callClaudeJSON<GeneratedWord[]>(
      GENERATE_SYSTEM,
      [{ type: "text", text: `Words: ${JSON.stringify(chunk)}` }],
      4096,
      "Some of these words needed too much detail to generate at once — try uploading a smaller batch."
    );
    return Promise.all(parsed.map(async (w) => ({ ...w, pictogramId: await fetchPictogramId(w.word) })));
  });

  return chunkResults.flat();
}

const EXTRACT_SYSTEM =
  "Extract every distinct English vocabulary word visible in this file. Return ONLY a JSON array of lowercase strings, no prose, no duplicates, no markdown fences. Ignore numbers and punctuation.";

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** Ports extractWordsFromFile() from the reference artifact. */
export async function extractWordsFromFile(
  base64: string,
  mediaType: ImageMediaType | "application/pdf",
  isPdf: boolean
): Promise<string[]> {
  const content: Anthropic.Messages.MessageParam["content"] = isPdf
    ? [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: "Extract the words." },
      ]
    : [
        { type: "image", source: { type: "base64", media_type: mediaType as ImageMediaType, data: base64 } },
        { type: "text", text: "Extract the words." },
      ];

  const res = await createMessage({
    model: MODEL,
    max_tokens: 8192,
    system: EXTRACT_SYSTEM,
    messages: [{ role: "user", content }],
  });
  const text = extractText(res.content).replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(text) as string[];
  } catch {
    // Response got cut off mid-array — salvage every complete "word" that was
    // already emitted before the truncation point instead of failing outright.
    const salvaged = [...text.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    if (salvaged.length) return salvaged;
    throw new BadRequestError(
      res.stop_reason === "max_tokens"
        ? "The word list was too long to read in one go — try a smaller photo or a shorter section of the list."
        : "Couldn't understand the AI's response — try again."
    );
  }
}
