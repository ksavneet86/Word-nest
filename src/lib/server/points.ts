import "server-only";
import { prisma } from "./db";

export async function awardPoints(learnerProfileId: string, amount: number) {
  if (amount <= 0) return;
  await prisma.learnerProfile.update({
    where: { id: learnerProfileId },
    data: { points: { increment: amount } },
  });
}
