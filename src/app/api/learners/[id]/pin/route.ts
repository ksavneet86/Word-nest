import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

/** Sets or clears a learner's optional 4-digit device PIN (a soft "who's using this" gate, not real auth). */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const learner = await getLearnerOrThrow(id, user);
    const { pin } = await request.json();

    if (pin === null || pin === "") {
      await prisma.learnerProfile.update({ where: { id: learner.id }, data: { pinHash: null } });
      return NextResponse.json({ ok: true, hasPin: false });
    }
    if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
      throw new BadRequestError("PIN must be exactly 4 digits");
    }
    const pinHash = await bcrypt.hash(pin, 10);
    await prisma.learnerProfile.update({ where: { id: learner.id }, data: { pinHash } });
    return NextResponse.json({ ok: true, hasPin: true });
  } catch (e) {
    return handleApiError(e);
  }
}
