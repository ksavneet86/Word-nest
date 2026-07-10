import "server-only";

export function wordStatus(w: { timesWrong: number; srsInterval: number }): "practice" | "mastered" | "learning" {
  if ((w.timesWrong || 0) > 0) return "practice";
  if ((w.srsInterval || 0) >= 8) return "mastered";
  return "learning";
}

/** Ports QuizFlow.handleAnswer()'s SRS math from the reference artifact — server is the source of truth. */
export function nextSrsState(current: { timesWrong: number; srsInterval: number }, correct: boolean) {
  const now = new Date();
  if (correct) {
    const newInterval = current.srsInterval ? Math.min(current.srsInterval * 2, 30) : 1;
    return {
      timesWrong: Math.max(0, (current.timesWrong || 0) - 1),
      srsInterval: newInterval,
      srsDue: new Date(now.getTime() + newInterval * 86400000),
    };
  }
  return {
    timesWrong: (current.timesWrong || 0) + 1,
    srsInterval: 0,
    srsDue: now,
  };
}
