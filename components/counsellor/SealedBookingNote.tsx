"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useE2EE } from "@/components/e2ee/E2EEProvider";
import { createClient } from "@/lib/supabase/client";
import type { SealedBookingNote as Sealed } from "@/lib/schedule-shared";

// Opens a booking note on this device. An old clear note is sealed here, then the server copy is cleared.
export function SealedBookingNote({ appointmentId, note, legacy }: { appointmentId: string; note: Sealed | null; legacy: string | null }) {
  const { client, state } = useE2EE();
  const [text, setText] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!note && !legacy) return;
    if (!client || state !== "ready") return;
    let live = true;
    (async () => {
      try {
        if (note?.senderKey && note.clientId) {
          const body = await client.openFrom(note.clientId, note.ciphertext, note.nonce, note.senderKey);
          if (live) setText(body);
          return;
        }
        if (note) {
          const body = await client.openText(note);
          if (live) setText(body);
          return;
        }
        if (!legacy) return;
        const sealed = await client.sealText(legacy);
        await createClient().rpc("seal_student_booking_note", {
          p_appointment_id: appointmentId,
          p_ciphertext: sealed.ciphertext,
          p_nonce: sealed.nonce,
        });
        if (live) setText(legacy);
      } catch {
        if (live) setBroken(true);
      }
    })();
    return () => { live = false; };
  }, [appointmentId, client, legacy, note, state]);

  if (!note && !legacy) return null;
  if (state !== "ready") {
    return <p className="mt-1 text-xs leading-relaxed text-ilo-ink">Unlock secure messaging to read what they shared when booking.</p>;
  }
  if (broken) {
    return (
      <p className="mt-1 text-xs leading-relaxed text-ilo-ink">
        This note couldn&apos;t be opened on this device. <Link href="/counsellor/inbox" className="font-bold text-ilo-plum underline">Check secure messaging</Link> and try again.
      </p>
    );
  }
  if (text === null) return <p className="mt-1 text-xs text-ilo-ink/70" role="status">Opening their note…</p>;
  if (!text) return null;
  return <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-ilo-ink">{text}</p>;
}
