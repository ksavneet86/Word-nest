import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertWordOwnership } from "@/lib/server/tree";
import { nextSrsState } from "@/lib/server/srs";
import { awardPoints } from "@/lib/server/points";
import { prisma } from "@/lib/server/db";

const MAX_POINTS_PER_ANSWER = 10;

/** Server-side source of truth for spaced repetition — ports QuizFlow.handleAnswer()'s math exactly. */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { wordId, correct, points } = await request.json();
    if (!wordId || typeof correct !== "boolean") {
      throw new BadRequestError("wordId and correct (boolean) are required");
    }
    const word = await assertWordOwnership(wordId, user);
    const next = nextSrsState(word, correct);

    const updated = await prisma.word.update({
      where: { id: wordId },
      data: next,
    });

    if (correct && typeof points === "number" && points > 0) {
      await awardPoints(word.wordList.folder.library.learnerProfileId, Math.min(points, MAX_POINTS_PER_ANSWER));
    }

    return NextResponse.json({
      word: {
        id: updated.id,
        timesWrong: updated.timesWrong,
        srsInterval: updated.srsInterval,
        srsDue: updated.srsDue.getTime(),
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}
