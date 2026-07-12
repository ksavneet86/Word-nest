import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/api-utils";
import { listLearners } from "@/lib/server/learners";
import { computeStreak } from "@/lib/server/streak";
import { wordStatus } from "@/lib/server/srs";
import { prisma } from "@/lib/server/db";

/** Per-accessible-learner stats (streak, points, mastery) — powers the Family overview and Badges modal. */
export async function GET() {
  try {
    const user = await requireUser();
    const learners = await listLearners(user, false);

    const stats = await Promise.all(
      learners.map(async (learner) => {
        const [streak, libraries] = await Promise.all([
          computeStreak(learner.id),
          prisma.library.findMany({
            where: { learnerProfileId: learner.id },
            include: { folders: { include: { wordLists: { include: { words: true } } } } },
          }),
        ]);
        const words = libraries.flatMap((lib) => lib.folders.flatMap((f) => f.wordLists.flatMap((wl) => wl.words)));
        const mastered = words.filter((w) => wordStatus(w) === "mastered").length;

        return {
          learnerId: learner.id,
          name: learner.name,
          avatarEmoji: learner.avatarEmoji,
          points: learner.points,
          streak,
          totalWords: words.length,
          totalMastered: mastered,
          masteredPercent: words.length ? Math.round((mastered / words.length) * 100) : 0,
        };
      })
    );

    return NextResponse.json({ stats });
  } catch (e) {
    return handleApiError(e);
  }
}
