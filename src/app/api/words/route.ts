import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertListOwnership } from "@/lib/server/tree";
import { prisma } from "@/lib/server/db";
import { difficultyForWord } from "@/lib/constants";
import type { GeneratedWord } from "@/lib/types";
import type { Prisma } from "@prisma/client";

/** Saves generated/typed words into an existing list — mirrors AddWordsPanel.save() in the reference artifact. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { listId, words } = (await request.json()) as { listId: string; words: GeneratedWord[] };
    if (!listId || !Array.isArray(words) || words.length === 0) {
      throw new BadRequestError("listId and a non-empty words array are required");
    }
    await assertListOwnership(listId, user);

    await prisma.word.createMany({
      data: words.map((w) => ({
        wordListId: listId,
        word: w.word,
        meaning: w.meaning,
        pos: w.pos ?? null,
        synonyms: w.synonyms ?? [],
        antonyms: w.antonyms ?? [],
        sentenceTip: w.sentenceTip ?? null,
        emoji: w.emoji ?? null,
        pictogramId: w.pictogramId ?? null,
        category: w.category || "other",
        difficulty: w.difficulty || difficultyForWord(w.word),
        forms: (w.forms ?? {}) as Prisma.InputJsonValue,
        needsMotion: !!w.needsMotion,
        visualQuery: w.visualQuery ?? null,
      })),
    });

    return NextResponse.json({ ok: true, count: words.length });
  } catch (e) {
    return handleApiError(e);
  }
}
