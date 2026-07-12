import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/api-utils";
import { getOwnedLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

/** Owner-only — lists guardians who currently have shared access, plus any pending invites. */
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await getOwnedLearnerOrThrow(id, user);

    const [access, invites] = await Promise.all([
      prisma.learnerAccess.findMany({
        where: { learnerProfileId: id },
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.learnerInvite.findMany({
        where: { learnerProfileId: id, acceptedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    return NextResponse.json({
      shares: access.map((a) => ({ userId: a.userId, email: a.user.email })),
      pendingInvites: invites.map((i) => ({ id: i.id, email: i.invitedEmail, expiresAt: i.expiresAt.getTime() })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
