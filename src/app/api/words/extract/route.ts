import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { extractWordsFromFile, generateWordBatch } from "@/lib/ai/anthropic";

// Extraction + meaning-generation for a whole word list now happens in this one request
// (instead of the client orchestrating several follow-up calls), so the work finishes on
// the server even if the user switches away from the browser tab mid-upload.
export const maxDuration = 300;

const MAX_TOTAL_WORDS = 300; // hard cap on words considered from one upload, to bound AI cost

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new BadRequestError("A file is required");

    let existingWords = new Set<string>();
    const existingRaw = formData.get("existingWords");
    if (typeof existingRaw === "string") {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) existingWords = new Set(parsed.map((w) => String(w).trim().toLowerCase()));
      } catch {
        // ignore malformed existingWords — just skip dedup rather than failing the upload
      }
    }

    const isPdf = file.type === "application/pdf";
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const rawWords = await extractWordsFromFile(base64, file.type, isPdf);
    if (!rawWords.length) return NextResponse.json({ words: [] });

    const seen = new Set(existingWords);
    const newWords: string[] = [];
    for (const w of rawWords) {
      const key = w.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      newWords.push(w);
    }

    const allWords = newWords.slice(0, MAX_TOTAL_WORDS);
    const generated = await generateWordBatch(allWords);
    return NextResponse.json({
      words: generated,
      foundCount: rawWords.length,
      newWordsFound: newWords.length,
      processedCount: allWords.length,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
