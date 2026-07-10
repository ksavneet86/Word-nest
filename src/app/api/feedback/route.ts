import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { getLearnerOrThrow } from "@/lib/server/learners";
import { getSectionTree } from "@/lib/server/tree";
import { wordStatus } from "@/lib/server/srs";
import { generateFeedback } from "@/lib/ai/anthropic";
import { prisma } from "@/lib/server/db";
import { SECTIONS } from "@/lib/constants";
import type { Section } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const learnerId = request.nextUrl.searchParams.get("learnerId");
    if (!learnerId) throw new BadRequestError("learnerId is required");
    await getLearnerOrThrow(learnerId, user);

    const reports = await prisma.feedbackReport.findMany({
      where: { learnerProfileId: learnerId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({
      reports: reports.map((r) => ({ id: r.id, reportText: r.reportText, createdAt: r.createdAt.getTime() })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { learnerId, section } = await request.json();
    if (!learnerId || !section || !(section in SECTIONS)) {
      throw new BadRequestError("learnerId and a valid section are required");
    }
    await getLearnerOrThrow(learnerId, user);

    const tree = await getSectionTree(learnerId, section as Section);
    const rows: Array<{ list: string; total: number; mastered: number; needsPractice: number }> = [];
    const weakWords: string[] = [];

    for (const library of Object.values(tree)) {
      for (const folder of Object.values(library.folders)) {
        for (const [listName, list] of Object.entries(folder.lists)) {
          const words = list.words;
          if (!words.length) continue;
          const mastered = words.filter((w) => wordStatus(w) === "mastered").length;
          const practice = words.filter((w) => wordStatus(w) === "practice").length;
          rows.push({ list: listName, total: words.length, mastered, needsPractice: practice });
          words.filter((w) => (w.timesWrong || 0) > 0).forEach((w) => weakWords.push(w.word));
        }
      }
    }

    const recentSessions = await prisma.quizSession.findMany({
      where: { learnerProfileId: learnerId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const reportText = await generateFeedback({
      lists: rows,
      recentSessions: recentSessions.map((s) => ({ type: s.type, correct: s.correct, total: s.total })),
      weakWords: weakWords.slice(0, 15),
    });

    const saved = await prisma.feedbackReport.create({
      data: { learnerProfileId: learnerId, reportText },
    });

    return NextResponse.json({ report: { id: saved.id, reportText, createdAt: saved.createdAt.getTime() } });
  } catch (e) {
    return handleApiError(e);
  }
}
