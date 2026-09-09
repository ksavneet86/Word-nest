import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { extractWordsFromFile, generateWordBatch } from "@/lib/ai/anthropic";

// Extraction + meaning-generation for a whole word list now happens in this one request
// (instead of the client orchestrating several follow-up calls), so the work finishes on
// the server even if the user switches away from the browser tab mid-upload.
export const maxDuration = 300;

const MAX_TOTAL_WORDS = 300; // hard cap on words considered from one upload, to bound AI cost

type SupportedMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

/**
 * Detects the file type from its leading bytes rather than trusting the browser-supplied
 * `file.type`. The same plain JPEG can arrive as "image/jpeg", "image/jpg", "image/pjpeg"
 * or "" depending on the client's OS/MIME registry, and Claude's API only accepts the four
 * canonical image media types — so forwarding `file.type` verbatim made valid JPEGs fail.
 * Returns null when the bytes aren't a format we support.
 */
function detectMediaType(buffer: Buffer): SupportedMediaType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 8 && buffer.toString("latin1", 0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("latin1", 0, 6))) return "image/gif";
  if (
    buffer.length >= 12 &&
    buffer.toString("latin1", 0, 4) === "RIFF" &&
    buffer.toString("latin1", 8, 12) === "WEBP"
  )
    return "image/webp";
  // A few PDFs carry junk bytes before the header, so scan the start rather than byte 0 only.
  if (buffer.toString("latin1", 0, 1024).includes("%PDF-")) return "application/pdf";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new BadRequestError("A file is required");

    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaType = detectMediaType(buffer);
    if (!mediaType) {
      throw new BadRequestError(
        "That image format isn't supported yet — please use a JPEG, PNG, GIF or WEBP photo, or a PDF. " +
          "Some phones save camera photos as HEIC by default; switch your camera's format to \"Most Compatible\" (JPEG) or take a screenshot instead."
      );
    }
    const isPdf = mediaType === "application/pdf";

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

    const base64 = buffer.toString("base64");

    const rawWords = await extractWordsFromFile(base64, mediaType, isPdf);
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
