"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { Btn } from "@/components/ui/Btn";

interface ReportEntry {
  id: string;
  reportText: string;
  createdAt: number;
}

export function FeedbackReport({ learnerId, section, color }: { learnerId: string; section: string; color: string }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<ReportEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch(`/api/feedback?learnerId=${learnerId}`)
      .then((r) => r.json())
      .then((data) => setHistory(data.reports || []))
      .catch(() => {});
  }, [learnerId]);

  const generate = async () => {
    setLoading(true);
    setError("");
    setReport("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId, section }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReport(data.report.reportText);
      setHistory((h) => [data.report, ...h]);
    } catch {
      setError("Couldn't generate feedback right now — try again.");
    }
    setLoading(false);
  };

  const pastReports = history.filter((r) => r.reportText !== report);

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
      <h3 className="font-extrabold text-slate-700 mb-3 flex items-center gap-2"><Sparkles size={18} style={{ color }} /> Feedback report</h3>
      {!report && !loading && (
        <Btn color={color} onClick={generate}><Wand2 size={16} /> Generate feedback for a parent or teacher</Btn>
      )}
      {loading && <p className="text-sm flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin" size={16} /> Writing feedback…</p>}
      {report && (
        <>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{report}</p>
          <Btn variant="soft" color={color} className="mt-3" onClick={generate}><RotateCcw size={14} /> Regenerate</Btn>
        </>
      )}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

      {pastReports.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button onClick={() => setShowHistory((s) => !s)} className="text-xs font-bold flex items-center gap-1 min-h-[40px]" style={{ color }}>
            {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {showHistory ? "Hide" : "Show"} past reports ({pastReports.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-3">
              {pastReports.map((r) => (
                <div key={r.id} className="text-sm text-slate-500 bg-slate-50 rounded-2xl p-3">
                  <p className="text-xs font-bold text-slate-400 mb-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                  <p className="whitespace-pre-line">{r.reportText}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
