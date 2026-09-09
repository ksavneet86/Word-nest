import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { generateWordBatch } from "@/lib/ai/gemini";

// Meaning generation is paced to stay under Gemini's 15 req/min free-tier cap, so a
// large typed batch (up to 60 words) can take a while — give it room to finish.
export const maxDuration = 300;

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
