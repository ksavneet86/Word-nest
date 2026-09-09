// Manual end-to-end check for the Gemini AI-provider layer (src/lib/ai/gemini.ts).
// It replays the exact generateContent request shape the app sends — systemInstruction,
// generationConfig.responseMimeType + responseSchema, and an inline base64 file part — so
// you can confirm the key, model name, JSON mode and image/PDF upload path all work.
//
// Usage:
//   GEMINI_API_KEY=xxx node scripts/test-gemini.mjs                 # word-generation only
//   GEMINI_API_KEY=xxx node scripts/test-gemini.mjs ./photo.jpeg    # + image/PDF extraction
//
// Optional: GEMINI_MODEL=gemini-3.5-flash  (defaults to gemini-3.5-flash-lite)

import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

if (!API_KEY) {
  console.error("Set GEMINI_API_KEY in the environment first.");
  process.exit(1);
}

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

async function generateContent({ system, parts, maxOutputTokens, responseSchema }) {
  const res = await fetch(`${API_BASE}/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens,
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error(`HTTP ${res.status}\n${raw}`);
    throw new Error("Gemini request failed");
  }
  const data = JSON.parse(raw);
  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  return { text, finishReason: candidate?.finishReason ?? null };
}

async function testWordGeneration() {
  console.log(`\n=== word generation (${MODEL}) ===`);
  const { text, finishReason } = await generateContent({
    system:
      "You are a children's dictionary assistant. For each input word, fill in every field: " +
      "meaning (under 14 words), pos, synonyms (3), antonyms (2-3), sentenceTip, emoji, " +
      "difficulty, category, forms, needsMotion, and visualQuery only when needsMotion is true.",
    parts: [{ text: `Words: ${JSON.stringify(["luminous", "sprint", "cat"])}` }],
    maxOutputTokens: 4096,
    responseSchema: {
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
        required: ["word", "meaning", "pos", "synonyms", "antonyms", "sentenceTip", "emoji", "difficulty", "category", "needsMotion"],
      },
    },
  });
  const parsed = JSON.parse(text);
  console.log(`finishReason: ${finishReason}`);
  console.log(JSON.stringify(parsed, null, 2));
  if (!Array.isArray(parsed) || parsed.length !== 3) throw new Error("expected 3 word objects");
  console.log("OK — structured word data parsed.");
}

async function testFileExtraction(path) {
  const mimeType = MIME_BY_EXT[extname(path).toLowerCase()];
  if (!mimeType) throw new Error(`unsupported extension: ${extname(path)}`);
  console.log(`\n=== word extraction from ${path} (${mimeType}) ===`);
  const base64 = (await readFile(path)).toString("base64");
  const { text, finishReason } = await generateContent({
    system:
      "Extract every distinct English vocabulary word visible in this file. Return a JSON array " +
      "of lowercase strings, no duplicates. Ignore numbers and punctuation.",
    parts: [{ text: "Extract the words." }, { inlineData: { mimeType, data: base64 } }],
    maxOutputTokens: 8192,
    responseSchema: { type: "array", items: { type: "string" } },
  });
  const words = JSON.parse(text);
  console.log(`finishReason: ${finishReason}`);
  console.log(words);
  if (!Array.isArray(words)) throw new Error("expected a JSON array of strings");
  console.log(`OK — extracted ${words.length} word(s).`);
}

try {
  await testWordGeneration();
  const filePath = process.argv[2];
  if (filePath) await testFileExtraction(filePath);
  else console.log("\n(pass an image/PDF path as the first arg to also test extraction)");
  console.log("\nAll checks passed.");
} catch (e) {
  console.error("\nFAILED:", e.message);
  process.exit(1);
}
