import "server-only";
import { prisma } from "./db";

const DAY_MS = 86400000;

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Consecutive-day practice streak computed from QuizSession.createdAt, in UTC calendar days. */
export async function computeStreak(learnerProfileId: string): Promise<{ current: number; longest: number }> {
  const sessions = await prisma.quizSession.findMany({
    where: { learnerProfileId },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const days = Array.from(new Set(sessions.map((s) => toDateKey(s.createdAt)))).sort().reverse();
  if (days.length === 0) return { current: 0, longest: 0 };

  const dayNumbers = days.map((d) => Math.floor(new Date(`${d}T00:00:00Z`).getTime() / DAY_MS));

  let longest = 1;
  let run = 1;
  for (let i = 1; i < dayNumbers.length; i++) {
    if (dayNumbers[i - 1] - dayNumbers[i] === 1) {
      run += 1;
    } else {
      longest = Math.max(longest, run);
      run = 1;
    }
  }
  longest = Math.max(longest, run);

  const todayNumber = Math.floor(Date.now() / DAY_MS);
  let current = 0;
  if (dayNumbers[0] === todayNumber || dayNumbers[0] === todayNumber - 1) {
    current = 1;
    for (let i = 1; i < dayNumbers.length; i++) {
      if (dayNumbers[i - 1] - dayNumbers[i] === 1) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { current, longest };
}
