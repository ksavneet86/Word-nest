import "server-only";

export interface FeedbackSummary {
  lists: Array<{ list: string; total: number; mastered: number; needsPractice: number }>;
  recentSessions: Array<{ type: string; correct: number; total: number }>;
  weakWords: string[];
}

/**
 * Builds a warm, plain-language progress note from stats alone — no AI call. Mirrors the
 * tone/structure the old Claude-written report used (1-2 strengths, words to practice, one
 * practical suggestion), just assembled from templates instead of generated.
 */
export function buildTemplatedFeedback(summary: FeedbackSummary): string {
  const totalWords = summary.lists.reduce((sum, l) => sum + l.total, 0);
  if (totalWords === 0) {
    return "There's no practice data yet for this learner in this section — add some words and complete a session or two, and a progress note will appear here.";
  }

  const totalMastered = summary.lists.reduce((sum, l) => sum + l.mastered, 0);
  const totalNeedsPractice = summary.lists.reduce((sum, l) => sum + l.needsPractice, 0);
  const masteredPercent = Math.round((totalMastered / totalWords) * 100);

  const sessionsWithTotal = summary.recentSessions.filter((s) => s.total > 0);
  const recentAccuracy = sessionsWithTotal.length
    ? Math.round(
        (sessionsWithTotal.reduce((sum, s) => sum + s.correct, 0) /
          sessionsWithTotal.reduce((sum, s) => sum + s.total, 0)) *
          100
      )
    : null;

  const listsWithWords = summary.lists.filter((l) => l.total > 0);
  const strongestList = [...listsWithWords].sort((a, b) => b.mastered / b.total - a.mastered / a.total)[0];
  const listNeedingPractice = [...summary.lists].sort((a, b) => b.needsPractice - a.needsPractice)[0];

  const parts: string[] = [];

  parts.push(`Great progress so far — ${totalMastered} out of ${totalWords} words (${masteredPercent}%) are now mastered.`);

  if (strongestList) {
    parts.push(`"${strongestList.list}" is going especially well.`);
  }

  if (recentAccuracy !== null) {
    parts.push(`Recent practice sessions are averaging ${recentAccuracy}% correct.`);
  }

  if (summary.weakWords.length) {
    parts.push(`A few words worth another look: ${summary.weakWords.slice(0, 3).join(", ")}.`);
  } else if (listNeedingPractice && listNeedingPractice.needsPractice > 0 && listNeedingPractice.list !== strongestList?.list) {
    const n = listNeedingPractice.needsPractice;
    parts.push(`"${listNeedingPractice.list}" has ${n} word${n === 1 ? "" : "s"} that could use more practice.`);
  }

  parts.push(
    totalNeedsPractice > 0
      ? "A short daily practice session, even just five minutes, is a simple way to keep chipping away at the words still being learned."
      : "Keep up the regular practice to help these words stick for the long term."
  );

  return parts.join(" ");
}
