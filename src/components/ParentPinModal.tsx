"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Lock, X } from "lucide-react";
import { Btn } from "@/components/ui/Btn";

/**
 * Gate shown when a guardian taps a word's delete button. It figures out whether the account
 * already has a Parent PIN: if not, it walks the guardian through creating one first; if so,
 * it asks for it. `onConfirm(pin)` performs the actual delete and should throw an Error whose
 * message is shown to the user when the PIN is rejected.
 */
export function ParentPinModal({
  action,
  onClose,
  onConfirm,
}: {
  action: string;
  onClose: () => void;
  onConfirm: (pin: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"loading" | "enter" | "create">("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/account/pin")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setMode(d?.hasPin ? "enter" : "create");
      })
      .catch(() => {
        if (alive) setMode("enter");
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "loading") pinRef.current?.focus();
  }, [mode]);

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  const submit = async () => {
    if (busy) return;
    if (!/^\d{4}$/.test(pin)) {
      setError("Enter a 4-digit PIN.");
      return;
    }
    if (mode === "create" && pin !== confirmPin) {
      setError("The two PINs don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (mode === "create") {
        const res = await fetch("/api/account/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.error || "Couldn't save the PIN — try again.");
        }
      }
      await onConfirm(pin);
      onClose();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That didn't work — try again.");
      setPin("");
      setConfirmPin("");
      pinRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-[60] flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-xs w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <Lock size={18} /> Parent PIN
          </h3>
          <button onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {mode === "loading" ? (
          <p className="text-sm text-slate-400 flex items-center gap-2 py-4">
            <Loader2 className="animate-spin" size={14} /> Checking…
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              {mode === "create" ? (
                <>Deleting words is protected. Create a 4-digit Parent PIN to continue — you&apos;ll enter it whenever a word is deleted, so children can&apos;t.</>
              ) : (
                <>Enter your Parent PIN to <span className="font-semibold text-slate-700">{action.toLowerCase()}</span>.</>
              )}
            </p>

            <input
              ref={pinRef}
              value={pin}
              onChange={(e) => { setPin(digits(e.target.value)); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && mode === "enter" && submit()}
              inputMode="numeric"
              autoComplete="off"
              placeholder="••••"
              aria-label={mode === "create" ? "New Parent PIN" : "Parent PIN"}
              className="w-full px-3 py-2.5 rounded-xl text-lg tracking-[0.5em] text-center border-2 border-slate-200"
            />

            {mode === "create" && (
              <input
                value={confirmPin}
                onChange={(e) => { setConfirmPin(digits(e.target.value)); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Confirm PIN"
                aria-label="Confirm new Parent PIN"
                className="w-full px-3 py-2.5 rounded-xl text-lg tracking-[0.5em] text-center border-2 border-slate-200"
              />
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <Btn color="#DC2626" onClick={submit} disabled={busy} className="w-full justify-center">
              {busy ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}
              {mode === "create" ? "Set PIN & delete" : "Confirm & delete"}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
