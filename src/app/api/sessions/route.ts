import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { prisma } from "@/lib/server/db";
import { SECTIONS } from "@/lib/constants";
import type { Section, SessionType } from "@prisma/client";
import type { SessionEntry } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const learnerId = request.nextUrl.searchParams.get("learnerId");
    if (!learnerId) throw new BadRequestError("learnerId is required");
    await getLearnerOrThrow(learnerId, user);

    const sessions = await prisma.quizSession.findMany({
      where: { learnerProfileId: learnerId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const entries: SessionEntry[] = sessions
      .reverse()
      .map((s) => ({
        id: s.id,
        type: s.type,
        section: s.section,
        listId: s.listId,
        correct: s.correct,
        total: s.total,
        createdAt: s.createdAt.getTime(),
      }));
    return NextResponse.json({ sessions: entries });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { learnerId, type, section, listId, correct, total } = await request.json();
    if (!learnerId || !type || !section || !(section in SECTIONS) || typeof correct !== "number" || typeof total !== "number") {
      throw new BadRequestError("learnerId, type, section, correct, and total are required");
    }
    await getLearnerOrThrow(learnerId, user);

    const session = await prisma.quizSession.create({
      data: {
        learnerProfileId: learnerId,
        type: type as SessionType,
        section: section as Section,
        listId: listId ?? null,
        correct,
        total,
      },
    });
    return NextResponse.json({ ok: true, id: session.id });
  } catch (e) {
    return handleApiError(e);
  }
}
