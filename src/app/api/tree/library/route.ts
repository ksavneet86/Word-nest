import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";
import { SECTIONS, canonicalSection, type SectionKey } from "@/lib/constants";
import type { Section } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { learnerId, section, name } = await request.json();
    const trimmed = typeof name === "string" ? name.trim() : "";
    if (!learnerId || !section || !(section in SECTIONS) || !trimmed) {
      throw new BadRequestError("learnerId, a valid section, and a name are required");
    }
    await getLearnerOrThrow(learnerId, user);

    // Vocabulary/Spellings/Synonyms & Antonyms share one pool of libraries per learner, so
    // anything created from any of the three is stored under the same canonical section —
    // otherwise the same name created from two different tabs would create two rows that
    // then collide once merged in the UI.
    const storedSection = canonicalSection(section as SectionKey) as Section;

    const { _max } = await prisma.library.aggregate({
      where: { learnerProfileId: learnerId, section: storedSection },
      _max: { order: true },
    });

    const library = await prisma.library.upsert({
      where: { learnerProfileId_section_name: { learnerProfileId: learnerId, section: storedSection, name: trimmed } },
      update: {},
      create: { learnerProfileId: learnerId, section: storedSection, name: trimmed, order: (_max.order ?? -1) + 1 },
    });
    return NextResponse.json({ library: { id: library.id, name: library.name } });
  } catch (e) {
    return handleApiError(e);
  }
}
