import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError } from "@/lib/server/api-utils";
import { assertWordOwnership } from "@/lib/server/tree";
import { assertParentPin } from "@/lib/server/parent-pin";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { pin } = await request.json().catch(() => ({}));
    await assertParentPin(user.id, pin);
    await assertWordOwnership(id, user);
    await prisma.word.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
