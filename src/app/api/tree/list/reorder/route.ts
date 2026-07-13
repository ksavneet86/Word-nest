import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertFolderOwnership } from "@/lib/server/tree";
import { prisma } from "@/lib/server/db";

/** Persists a new order for a folder's lists. */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const { folderId, orderedIds } = await request.json();
    if (!folderId || !Array.isArray(orderedIds) || !orderedIds.length) {
      throw new BadRequestError("folderId and orderedIds are required");
    }
    await assertFolderOwnership(folderId, user);

    const lists = await prisma.wordList.findMany({ where: { folderId, id: { in: orderedIds } } });
    if (lists.length !== orderedIds.length) throw new BadRequestError("Some lists weren't found");

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) => prisma.wordList.update({ where: { id }, data: { order: index } }))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
