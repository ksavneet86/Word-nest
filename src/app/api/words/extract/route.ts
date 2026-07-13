import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { extractWordsFromFile, generateWordBatch } from "@/lib/ai/anthropic";

const MAX_WORDS_PER_UPLOAD = 40;

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new BadRequestError("A file is required");

    const isPdf = file.type === "application/pdf";
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const allWords = await extractWordsFromFile(base64, file.type, isPdf);
    if (!allWords.length) return NextResponse.json({ words: [] });

    const words = allWords.slice(0, MAX_WORDS_PER_UPLOAD);
    const generated = await generateWordBatch(words);
    return NextResponse.json({ words: generated, foundCount: allWords.length, processedCount: words.length });
  } catch (e) {
    return handleApiError(e);
  }
}
