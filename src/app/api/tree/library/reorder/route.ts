import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";
import { SECTIONS, SHARED_SECTION_GROUP, type SectionKey } from "@/lib/constants";
import type { Section } from "@prisma/client";

/** Persists a new left-to-right order for a learner's libraries within one section. */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser();
    const { learnerId, section, orderedIds } = await request.json();
    if (!learnerId || !section || !(section in SECTIONS) || !Array.isArray(orderedIds) || !orderedIds.length) {
      throw new BadRequestError("learnerId, a valid section, and orderedIds are required");
    }
    await getLearnerOrThrow(learnerId, user);

    const sectionFilter = SHARED_SECTION_GROUP.includes(section as SectionKey)
      ? { in: SHARED_SECTION_GROUP as Section[] }
      : (section as Section);
    const libraries = await prisma.library.findMany({
      where: { learnerProfileId: learnerId, section: sectionFilter, id: { in: orderedIds } },
    });
    if (libraries.length !== orderedIds.length) throw new BadRequestError("Some libraries weren't found");

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) => prisma.library.update({ where: { id }, data: { order: index } }))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
