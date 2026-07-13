import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertLibraryOwnership } from "@/lib/server/tree";
import { prisma } from "@/lib/server/db";

/** Persists a new order for a library's folders. */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const { libraryId, orderedIds } = await request.json();
    if (!libraryId || !Array.isArray(orderedIds) || !orderedIds.length) {
      throw new BadRequestError("libraryId and orderedIds are required");
    }
    await assertLibraryOwnership(libraryId, user);

    const folders = await prisma.folder.findMany({ where: { libraryId, id: { in: orderedIds } } });
    if (folders.length !== orderedIds.length) throw new BadRequestError("Some folders weren't found");

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) => prisma.folder.update({ where: { id }, data: { order: index } }))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
