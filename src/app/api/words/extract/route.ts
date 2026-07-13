import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { extractWordsFromFile, generateWordBatch } from "@/lib/ai/anthropic";

const MAX_WORDS_PER_UPLOAD = 40; // first batch — generated with meanings immediately
const MAX_TOTAL_WORDS = 300; // hard cap on words considered from one upload, to bound AI cost

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new BadRequestError("A file is required");

    const isPdf = file.type === "application/pdf";
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const rawWords = await extractWordsFromFile(base64, file.type, isPdf);
    if (!rawWords.length) return NextResponse.json({ words: [] });

    const allWords = rawWords.slice(0, MAX_TOTAL_WORDS);
    const words = allWords.slice(0, MAX_WORDS_PER_UPLOAD);
    const generated = await generateWordBatch(words);
    return NextResponse.json({ words: generated, allWords, foundCount: allWords.length, processedCount: words.length });
  } catch (e) {
    return handleApiError(e);
  }
}
