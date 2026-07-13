import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertListOwnership, assertFolderOwnership } from "@/lib/server/tree";
import { cloneListInto } from "@/lib/server/transfer";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

/** Moves or copies a list (with its words) into a folder — possibly under a different learner. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { targetFolderId, mode } = await request.json();
    if (!targetFolderId || (mode !== "move" && mode !== "copy")) {
      throw new BadRequestError("targetFolderId and a valid mode are required");
    }

    const list = await assertListOwnership(id, user);
    await assertFolderOwnership(targetFolderId, user);

    if (mode === "move") {
      try {
        await prisma.wordList.update({ where: { id }, data: { folderId: targetFolderId } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          throw new BadRequestError("That folder already has a list with this name — rename it first.");
        }
        throw e;
      }
      return NextResponse.json({ ok: true });
    }

    const created = await cloneListInto(list.id, targetFolderId);
    return NextResponse.json({ ok: true, list: { id: created.id, name: created.name } });
  } catch (e) {
    return handleApiError(e);
  }
}
