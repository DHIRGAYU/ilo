"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CancelButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().rpc("cancel_appointment", { p_appointment_id: id });
    setBusy(false);
    if (error) {
      setError(/cannot_cancel/.test(error.message)
        ? "This session can no longer be cancelled online. Please message your counsellor."
        : "We couldn't cancel. Please try again.");
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 w-full text-center text-[11px] font-semibold text-ilo-crisis underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ilo-crisis">
        Cancel session
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-xl bg-ilo-crisis/10 p-3 text-xs text-ilo-ink" role="alertdialog" aria-label="Confirm cancellation">
      <p className="font-semibold text-ilo-crisis">Cancel this session?</p>
      <p className="mt-0.5 text-[11px]">Your slot goes back to other students. You can book again any time.</p>
      {error && <p role="alert" className="mt-2 text-[11px] font-medium text-ilo-crisis">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className="h-8 flex-1 rounded-full border border-ilo-plum/20 bg-white text-[11px] font-bold text-ilo-plum">
          Keep session
        </button>
        <button type="button" onClick={cancel} disabled={busy} className="h-8 flex-1 rounded-full bg-ilo-crisis text-[11px] font-bold text-white disabled:opacity-60">
          {busy ? "Cancelling…" : "Yes, cancel"}
        </button>
      </div>
    </div>
  );
}
