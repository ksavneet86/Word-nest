"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldCheck, UserRound } from "lucide-react";

interface LearnerRow {
  id: string;
  name: string;
  totalWords: number;
  masteredWords: number;
  masteredPercent: number;
}

interface GuardianRow {
  email: string;
  learners: LearnerRow[];
}

export function AdminOverview() {
  const [guardians, setGuardians] = useState<GuardianRow[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((data) => setGuardians(data.guardians));
  }, []);

  return (
    <div className="min-h-screen bg-[#F7FAFC] px-5 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><ShieldCheck size={22} className="text-[#7C6FF0]" /> Admin overview</h1>
          <Link href="/" className="text-sm font-bold text-slate-500 flex items-center gap-1 min-h-[40px]"><ArrowLeft size={14} /> Back to app</Link>
        </div>

        {!guardians ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" size={24} /></div>
        ) : guardians.length === 0 ? (
          <p className="text-slate-400 text-center py-16">No guardian accounts yet.</p>
        ) : (
          <div className="space-y-5">
            {guardians.map((g) => (
              <div key={g.email} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                <p className="font-extrabold text-slate-700 mb-3">{g.email}</p>
                {g.learners.length === 0 ? (
                  <p className="text-sm text-slate-400">No learner profiles yet.</p>
                ) : (
                  <div className="space-y-2">
                    {g.learners.map((l) => (
                      <div key={l.id} className="flex items-center justify-between bg-slate-50 rounded-2xl p-3">
                        <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><UserRound size={14} /> {l.name}</span>
                        <span className="text-xs font-bold text-slate-500">{l.masteredPercent}% mastered ({l.masteredWords}/{l.totalWords} words)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
