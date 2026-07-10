import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { extractWordsFromFile, generateWordBatch } from "@/lib/ai/anthropic";

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new BadRequestError("A file is required");

    const isPdf = file.type === "application/pdf";
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const words = await extractWordsFromFile(base64, file.type, isPdf);
    if (!words.length) return NextResponse.json({ words: [] });

    const generated = await generateWordBatch(words);
    return NextResponse.json({ words: generated });
  } catch (e) {
    return handleApiError(e);
  }
}
