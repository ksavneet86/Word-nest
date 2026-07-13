import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertLibraryOwnership } from "@/lib/server/tree";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { name } = await request.json();
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!trimmed) throw new BadRequestError("A name is required");
    await assertLibraryOwnership(id, user);

    try {
      const library = await prisma.library.update({ where: { id }, data: { name: trimmed } });
      return NextResponse.json({ library: { id: library.id, name: library.name } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new BadRequestError("A library with that name already exists");
      }
      throw e;
    }
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await assertLibraryOwnership(id, user);

    const folderCount = await prisma.folder.count({ where: { libraryId: id } });
    if (folderCount > 0) {
      throw new BadRequestError("Delete all folders inside this library first.");
    }

    await prisma.library.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
