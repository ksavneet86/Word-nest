import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertFolderOwnership } from "@/lib/server/tree";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { name } = await request.json();
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) throw new BadRequestError("A name is required");
    await assertFolderOwnership(id, user);

    try {
      const folder = await prisma.folder.update({ where: { id }, data: { name: trimmed } });
      return NextResponse.json({ folder: { id: folder.id, name: folder.name } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new BadRequestError("A folder with that name already exists in this library");
      }
      throw e;
    }
  } catch (e) {
    return handleApiError(e);
  }
}
