import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { getSectionTree } from "@/lib/server/tree";
import { SECTIONS } from "@/lib/constants";
import type { Section } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const learnerId = request.nextUrl.searchParams.get("learnerId");
    const section = request.nextUrl.searchParams.get("section");
    if (!learnerId || !section || !(section in SECTIONS)) {
      throw new BadRequestError("learnerId and a valid section are required");
    }
    await getLearnerOrThrow(learnerId, user);
    const tree = await getSectionTree(learnerId, section as Section);
    return NextResponse.json({ tree });
  } catch (e) {
    return handleApiError(e);
  }
}
