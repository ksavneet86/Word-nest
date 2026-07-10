import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, NotFoundError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { generateWordBatch } from "@/lib/ai/anthropic";
import { prisma } from "@/lib/server/db";
import { difficultyForWord } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

const LIBRARY_NAME = "11+ Vocabulary (by Claude)";
const FOLDER_NAME = "General";
const LIST_NAME = "Extended List (500+ words)";
const CHUNK_SIZE = 5;

/** Processes one chunk of the 11+ extended word queue — mirrors ExtendedGenerator.run()'s per-iteration behavior in the reference artifact. */
export async function POST(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await getLearnerOrThrow(id, user);

    const queue = await prisma.extendedQueue.findUnique({ where: { learnerProfileId: id } });
    if (!queue || queue.remainingWords.length === 0) {
      return NextResponse.json({ added: [], remaining: 0 });
    }

    const list = await prisma.wordList.findFirst({
      where: { name: LIST_NAME, folder: { name: FOLDER_NAME, library: { learnerProfileId: id, name: LIBRARY_NAME } } },
    });
    if (!list) throw new NotFoundError("Extended list not found for this learner");

    const chunk = queue.remainingWords.slice(0, CHUNK_SIZE);
    const remaining = queue.remainingWords.slice(CHUNK_SIZE);

    const generated = await generateWordBatch(chunk);
    await prisma.word.createMany({
      data: generated.map((w) => ({
        wordListId: list.id,
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
    await prisma.extendedQueue.update({ where: { learnerProfileId: id }, data: { remainingWords: remaining } });

    return NextResponse.json({ added: generated, remaining: remaining.length });
  } catch (e) {
    return handleApiError(e);
  }
}
