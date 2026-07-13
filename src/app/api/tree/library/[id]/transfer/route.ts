import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { assertLibraryOwnership } from "@/lib/server/tree";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { cloneLibraryInto } from "@/lib/server/transfer";
import { prisma } from "@/lib/server/db";

type Ctx = { params: Promise<{ id: string }> };

/** Moves or copies a whole library (with everything inside it) to another learner. */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { targetLearnerId, mode } = await request.json();
    if (!targetLearnerId || (mode !== "move" && mode !== "copy")) {
      throw new BadRequestError("targetLearnerId and a valid mode are required");
    }

    const library = await assertLibraryOwnership(id, user);
    await getLearnerOrThrow(targetLearnerId, user);

    if (mode === "move") {
      try {
        await prisma.library.update({ where: { id }, data: { learnerProfileId: targetLearnerId } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          throw new BadRequestError("That learner already has a library with this name — rename it first.");
        }
        throw e;
      }
      return NextResponse.json({ ok: true });
    }

    const created = await cloneLibraryInto(library.id, targetLearnerId);
    return NextResponse.json({ ok: true, library: { id: created.id, name: created.name } });
  } catch (e) {
    return handleApiError(e);
  }
}
