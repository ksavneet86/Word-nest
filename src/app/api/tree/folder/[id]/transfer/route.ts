import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertFolderOwnership, assertLibraryOwnership } from "@/lib/server/tree";
import { cloneFolderInto } from "@/lib/server/transfer";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

/** Moves or copies a folder (with everything inside it) into a library — possibly under a different learner. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { targetLibraryId, mode } = await request.json();
    if (!targetLibraryId || (mode !== "move" && mode !== "copy")) {
      throw new BadRequestError("targetLibraryId and a valid mode are required");
    }

    const folder = await assertFolderOwnership(id, user);
    const targetLibrary = await assertLibraryOwnership(targetLibraryId, user);
    if (targetLibrary.section !== folder.library.section) {
      throw new BadRequestError("You can only move or copy within the same section");
    }

    if (mode === "move") {
      try {
        await prisma.folder.update({ where: { id }, data: { libraryId: targetLibraryId } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          throw new BadRequestError("That library already has a folder with this name — rename it first.");
        }
        throw e;
      }
      return NextResponse.json({ ok: true });
    }

    const created = await cloneFolderInto(folder.id, targetLibraryId);
    return NextResponse.json({ ok: true, folder: { id: created.id, name: created.name } });
  } catch (e) {
    return handleApiError(e);
  }
}
