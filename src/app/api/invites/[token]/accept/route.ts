import { NextRequest, NextResponse } from "next/server";
import { requireUser, ForbiddenError } from "@/lib/server/auth";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/server/api-utils";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ token: string }> };

export async function POST(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { token } = await ctx.params;

    const invite = await prisma.learnerInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundError("Invite not found");
    if (invite.acceptedAt) throw new BadRequestError("This invite has already been accepted");
    if (invite.expiresAt.getTime() < Date.now()) throw new BadRequestError("This invite has expired");
    if (invite.invitedEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("This invite was sent to a different email address");
    }

    await prisma.$transaction([
      prisma.learnerAccess.upsert({
        where: { learnerProfileId_userId: { learnerProfileId: invite.learnerProfileId, userId: user.id } },
        update: {},
        create: { learnerProfileId: invite.learnerProfileId, userId: user.id },
      }),
      prisma.learnerInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true, learnerProfileId: invite.learnerProfileId });
  } catch (e) {
    return handleApiError(e);
  }
}
