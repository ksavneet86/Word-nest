import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const learner = await getLearnerOrThrow(id, user);
    const { pin } = await request.json();
    if (typeof pin !== "string") throw new BadRequestError("PIN is required");

    if (!learner.pinHash) return NextResponse.json({ ok: true });
    const ok = await bcrypt.compare(pin, learner.pinHash);
    return NextResponse.json({ ok });
  } catch (e) {
    return handleApiError(e);
  }
}
