import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/api-utils";
import { getOwnedLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** Owner-only — revokes another guardian's shared access to this learner. */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, userId } = await ctx.params;
    await getOwnedLearnerOrThrow(id, user);

    await prisma.learnerAccess.deleteMany({ where: { learnerProfileId: id, userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
