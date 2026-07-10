import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";
import { SECTIONS } from "@/lib/constants";
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

    const library = await prisma.library.upsert({
      where: { learnerProfileId_section_name: { learnerProfileId: learnerId, section: section as Section, name: trimmed } },
      update: {},
      create: { learnerProfileId: learnerId, section: section as Section, name: trimmed },
    });
    return NextResponse.json({ library: { id: library.id, name: library.name } });
  } catch (e) {
    return handleApiError(e);
  }
}
