import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/api-utils";
import { assertWordOwnership } from "@/lib/server/tree";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await assertWordOwnership(id, user);
    await prisma.word.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
