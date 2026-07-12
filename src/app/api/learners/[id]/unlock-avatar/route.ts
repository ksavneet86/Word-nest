import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";
import { AVATAR_SHOP } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

/** Spends points to unlock an avatar emoji from AVATAR_SHOP for this learner. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const learner = await getLearnerOrThrow(id, user);
    const { emoji } = await request.json();

    const item = AVATAR_SHOP.find((a) => a.emoji === emoji);
    if (!item) throw new BadRequestError("Unknown avatar");
    if (learner.unlockedAvatars.includes(emoji)) {
      return NextResponse.json({ ok: true, points: learner.points, unlockedAvatars: learner.unlockedAvatars });
    }
    if (learner.points < item.cost) throw new BadRequestError("Not enough points to unlock this avatar");

    const updated = await prisma.learnerProfile.update({
      where: { id: learner.id },
      data: {
        points: { decrement: item.cost },
        unlockedAvatars: { set: [...learner.unlockedAvatars, emoji] },
      },
    });

    return NextResponse.json({ ok: true, points: updated.points, unlockedAvatars: updated.unlockedAvatars });
  } catch (e) {
    return handleApiError(e);
  }
}
