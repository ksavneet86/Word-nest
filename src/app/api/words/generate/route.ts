import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { generateWordBatch } from "@/lib/ai/anthropic";

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const { words } = await request.json();
    if (!Array.isArray(words) || words.length === 0) {
      throw new BadRequestError("A non-empty words array is required");
    }
    const cleaned = words.map((w) => String(w).trim()).filter(Boolean).slice(0, 60);
    const generated = await generateWordBatch(cleaned);
    return NextResponse.json({ words: generated });
  } catch (e) {
    return handleApiError(e);
  }
}
