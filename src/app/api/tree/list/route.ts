import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertFolderOwnership } from "@/lib/server/tree";
import { prisma } from "@/lib/server/db";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { folderId, name } = await request.json();
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!folderId || !trimmed) throw new BadRequestError("folderId and a name are required");
    await assertFolderOwnership(folderId, user);

    const { _max } = await prisma.wordList.aggregate({ where: { folderId }, _max: { order: true } });

    const list = await prisma.wordList.upsert({
      where: { folderId_name: { folderId, name: trimmed } },
      update: {},
      create: { folderId, name: trimmed, order: (_max.order ?? -1) + 1 },
    });
    return NextResponse.json({ list: { id: list.id, name: list.name } });
  } catch (e) {
    return handleApiError(e);
  }
}
