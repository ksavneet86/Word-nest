import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { handleApiError, BadRequestError } from "@/lib/server/api-utils";
import { listLearners, createLearner } from "@/lib/server/learners";
import type { LearnerSummary } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const all = request.nextUrl.searchParams.get("all") === "1";
    const learners = await listLearners(user, all);
    const summaries: LearnerSummary[] = learners.map((l) => ({
      id: l.id,
      name: l.name,
      avatarEmoji: l.avatarEmoji,
      hasPin: !!l.pinHash,
      ownerEmail: "owner" in l ? (l as unknown as { owner: { email: string } }).owner.email : undefined,
    }));
    return NextResponse.json({ learners: summaries });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) throw new BadRequestError("Learner name is required");
    const learner = await createLearner(user, name, body?.avatarEmoji);
    return NextResponse.json({ learner: { id: learner.id, name: learner.name, avatarEmoji: learner.avatarEmoji, hasPin: false } });
  } catch (e) {
    return handleApiError(e);
  }
}
