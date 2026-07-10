import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";
import { SETTINGS_DEFAULTS } from "@/lib/constants";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const learner = await getLearnerOrThrow(id, user);
    return NextResponse.json({
      learner: {
        id: learner.id,
        name: learner.name,
        avatarEmoji: learner.avatarEmoji,
        hasPin: !!learner.pinHash,
        settings: { ...SETTINGS_DEFAULTS, ...(learner.settings as object) },
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const learner = await getLearnerOrThrow(id, user);
    const body = await request.json();

    const data: { name?: string; avatarEmoji?: string | null; settings?: object } = {};
    if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body?.avatarEmoji === "string" || body?.avatarEmoji === null) data.avatarEmoji = body.avatarEmoji;
    if (body?.settings && typeof body.settings === "object") {
      data.settings = { ...SETTINGS_DEFAULTS, ...(learner.settings as object), ...body.settings };
    }

    const updated = await prisma.learnerProfile.update({ where: { id: learner.id }, data });
    return NextResponse.json({
      learner: {
        id: updated.id,
        name: updated.name,
        avatarEmoji: updated.avatarEmoji,
        hasPin: !!updated.pinHash,
        settings: { ...SETTINGS_DEFAULTS, ...(updated.settings as object) },
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const learner = await getLearnerOrThrow(id, user);
    await prisma.learnerProfile.delete({ where: { id: learner.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
