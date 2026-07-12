"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Trash2, X } from "lucide-react";
import { Btn } from "@/components/ui/Btn";

interface Share {
  userId: string;
  email: string;
}
interface PendingInvite {
  id: string;
  email: string;
  expiresAt: number;
}

export function ShareModal({ learnerId, onClose }: { learnerId: string; onClose: () => void }) {
  const [shares, setShares] = useState<Share[] | null>(null);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await fetch(`/api/learners/${learnerId}/shares`);
    if (res.ok) {
      const data = await res.json();
      setShares(data.shares);
      setPending(data.pendingInvites);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standard fetch-on-mount/deps-change pattern
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnerId]);

  const sendInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/learners/${learnerId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't send invite");
      }
      setMessage(`Invite sent to ${email.trim()}.`);
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send invite. Try again.");
    }
    setSending(false);
  };

  const revoke = async (userId: string) => {
    await fetch(`/api/learners/${learnerId}/shares/${userId}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2"><Mail size={18} /> Share this learner</h3>
          <button onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={20} className="text-slate-400" /></button>
        </div>
        <p className="text-xs text-slate-400">Invite another guardian (e.g. a co-parent) to see and manage this learner&apos;s progress. They&apos;ll get full access except managing sharing.</p>

        {shares === null ? (
          <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" size={20} /></div>
        ) : (
          <>
            {shares.length > 0 && (
              <div className="space-y-2">
                {shares.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between bg-slate-50 rounded-2xl px-3 py-2">
                    <span className="text-sm font-semibold text-slate-700">{s.email}</span>
                    <button onClick={() => revoke(s.userId)} className="text-slate-400 hover:text-red-400 min-w-[40px] min-h-[40px] flex items-center justify-center"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
            {pending.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pending invites</p>
                {pending.map((p) => (
                  <p key={p.id} className="text-sm text-slate-500">{p.email} — awaiting acceptance</p>
                ))}
              </div>
            )}
          </>
        )}

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <label className="text-sm font-bold text-slate-700">Invite by email</label>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendInvite()}
              placeholder="guardian@example.com"
              type="email"
              className="flex-1 px-3 py-2 rounded-xl text-sm border-2 border-slate-200"
            />
            <Btn onClick={sendInvite} disabled={sending || !email.trim()}>
              {sending ? <Loader2 className="animate-spin" size={16} /> : "Send"}
            </Btn>
          </div>
          {message && <p className="text-xs text-green-600">{message}</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
