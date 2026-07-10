import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await getLearnerOrThrow(id, user);
    const queue = await prisma.extendedQueue.findUnique({ where: { learnerProfileId: id } });
    return NextResponse.json({ remaining: queue?.remainingWords.length ?? 0 });
  } catch (e) {
    return handleApiError(e);
  }
}
