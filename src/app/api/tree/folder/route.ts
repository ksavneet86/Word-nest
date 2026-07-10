import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertLibraryOwnership } from "@/lib/server/tree";
import { prisma } from "@/lib/server/db";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { libraryId, name } = await request.json();
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!libraryId || !trimmed) throw new BadRequestError("libraryId and a name are required");
    await assertLibraryOwnership(libraryId, user);

    const folder = await prisma.folder.upsert({
      where: { libraryId_name: { libraryId, name: trimmed } },
      update: {},
      create: { libraryId, name: trimmed },
    });
    return NextResponse.json({ folder: { id: folder.id, name: folder.name } });
  } catch (e) {
    return handleApiError(e);
  }
}
