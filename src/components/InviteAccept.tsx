"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Btn } from "@/components/ui/Btn";

interface InviteInfo {
  learnerName: string;
  invitedEmail: string;
  accepted: boolean;
  expired: boolean;
  emailMatches: boolean;
}

export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setInvite)
      .catch(() => setNotFound(true));
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't accept invite");
      }
      setAccepted(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't accept invite. Try again.");
    }
    setAccepting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7FAFC] px-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-sm border border-slate-100">
        <div className="rounded-2xl bg-slate-800 p-3 inline-flex mb-4"><Sparkles size={20} className="text-white" /></div>

        {notFound && <p className="text-slate-500">This invite link isn&apos;t valid.</p>}

        {!notFound && !invite && <Loader2 className="animate-spin text-slate-400 mx-auto" size={24} />}

        {invite && !accepted && (
          <>
            {invite.accepted ? (
              <p className="text-slate-500">This invite has already been accepted.</p>
            ) : invite.expired ? (
              <p className="text-slate-500 flex items-center justify-center gap-2"><TriangleAlert size={16} className="text-amber-500" /> This invite has expired. Ask for a new one.</p>
            ) : !invite.emailMatches ? (
              <p className="text-slate-500">This invite was sent to <strong>{invite.invitedEmail}</strong>, which doesn&apos;t match your signed-in account.</p>
            ) : (
              <>
                <h1 className="text-lg font-extrabold text-slate-800 mb-2">You&apos;ve been invited to help with {invite.learnerName}</h1>
                <p className="text-sm text-slate-500 mb-5">Accepting will let you see and manage {invite.learnerName}&apos;s vocabulary practice.</p>
                <Btn onClick={accept} disabled={accepting} className="w-full justify-center">
                  {accepting ? <Loader2 className="animate-spin" size={16} /> : "Accept invite"}
                </Btn>
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
              </>
            )}
          </>
        )}

        {accepted && (
          <p className="text-green-600 font-semibold flex items-center justify-center gap-2"><CheckCircle2 size={18} /> Access granted — redirecting…</p>
        )}
      </div>
    </div>
  );
}
