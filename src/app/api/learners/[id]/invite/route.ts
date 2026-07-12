import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getOwnedLearnerOrThrow } from "@/lib/server/learners";
import { sendEmail } from "@/lib/server/email";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

/** Owner-only — invites another guardian (by email) to share access to this learner. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const learner = await getOwnedLearnerOrThrow(id, user);

    const { email } = await request.json();
    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      throw new BadRequestError("A valid email is required");
    }

    const token = randomUUID();
    await prisma.learnerInvite.create({
      data: {
        learnerProfileId: learner.id,
        invitedEmail: email.toLowerCase(),
        token,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    const acceptUrl = `${request.nextUrl.origin}/invites/${token}`;
    await sendEmail({
      to: [email],
      subject: `You've been invited to help with ${learner.name} on WordNest`,
      html: `
        <div style="font-family:sans-serif;color:#182A33;">
          <h2 style="margin:0 0 10px;">WordNest invite</h2>
          <p>You've been invited to help manage <strong>${learner.name}</strong>'s vocabulary practice on WordNest.</p>
          <p><a href="${acceptUrl}" style="display:inline-block;margin-top:12px;padding:10px 18px;background:#FF7A59;color:white;border-radius:12px;text-decoration:none;font-weight:bold;">Accept invite</a></p>
          <p style="color:#667;font-size:13px;margin-top:16px;">This link expires in 24 hours. If you weren't expecting this, you can ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
