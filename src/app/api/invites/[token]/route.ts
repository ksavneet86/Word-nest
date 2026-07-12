import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, NotFoundError } from "@/lib/server/api-utils";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { token } = await ctx.params;

    const invite = await prisma.learnerInvite.findUnique({
      where: { token },
      include: { learnerProfile: { select: { name: true } } },
    });
    if (!invite) throw new NotFoundError("Invite not found");

    const expired = invite.expiresAt.getTime() < Date.now();
    const emailMatches = invite.invitedEmail.toLowerCase() === user.email.toLowerCase();

    return NextResponse.json({
      learnerName: invite.learnerProfile.name,
      invitedEmail: invite.invitedEmail,
      accepted: !!invite.acceptedAt,
      expired,
      emailMatches,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
