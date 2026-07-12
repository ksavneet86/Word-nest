import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db";
import { sendEmail } from "@/lib/server/email";

export const runtime = "nodejs";

function renderEmail(learnerNames: string[]): string {
  const rows = learnerNames.map((n) => `<li>${n}</li>`).join("");
  return `
    <div style="font-family:sans-serif;color:#182A33;">
      <h2 style="margin:0 0 10px;">WordNest practice reminder</h2>
      <p>These learners haven't practiced yet today:</p>
      <ul style="margin:8px 0;padding-left:20px;">${rows}</ul>
      <p style="color:#667;font-size:13px;margin-top:16px;">A few minutes of flashcards or a quick quiz keeps the streak going. You can turn this reminder off any time in a learner's settings.</p>
    </div>
  `;
}

/** Daily cron (see vercel.json) — emails guardians whose learners have reminders enabled and haven't practiced yet today. */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const candidates = await prisma.learnerProfile.findMany({
    where: { settings: { path: ["remindersEnabled"], equals: true } },
    include: { owner: { select: { email: true } } },
  });

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: "no learners have reminders enabled" });
  }

  const sessionCounts = await prisma.quizSession.groupBy({
    by: ["learnerProfileId"],
    where: { learnerProfileId: { in: candidates.map((c) => c.id) }, createdAt: { gte: startOfToday } },
    _count: { _all: true },
  });
  const practicedToday = new Set(sessionCounts.map((s) => s.learnerProfileId));

  const dueByOwner = new Map<string, { email: string; names: string[] }>();
  for (const learner of candidates) {
    if (practicedToday.has(learner.id)) continue;
    const existing = dueByOwner.get(learner.ownerUserId);
    if (existing) existing.names.push(learner.name);
    else dueByOwner.set(learner.ownerUserId, { email: learner.owner.email, names: [learner.name] });
  }

  let sent = 0;
  for (const { email, names } of dueByOwner.values()) {
    await sendEmail({
      to: [email],
      subject: `WordNest: ${names.length} learner${names.length === 1 ? "" : "s"} haven't practiced yet today`,
      html: renderEmail(names),
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, dueGuardians: dueByOwner.size });
}
