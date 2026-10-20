# ilo: Chat Architecture Context

Handoff summary of the design discussion for the MVP student–counsellor chat. Read this first, then `ilo_schema.sql`.

## Project
- **ilo** is a student counselling platform for Indian educational institutions.
- **First market: IITs** (Tier-1), starting with IIT (BHU) Varanasi, then expanding to other institutions later. Earlier materials (5 Whys slide, segmentation, pitch) framed the problem as Tier-2/3 only.
- **Positioning to reconcile:** present IITs as a beachhead and pilot market. Tier-2/3 stays the scale market that incumbents (built for premium/Tier-1) structurally don't serve. The 5 Whys slide would need updating either way.
- **Stack:** Next.js + Supabase (Postgres, Auth, Realtime, Edge Functions, pg_cron).

## The question
How should student–counsellor chat work for the MVP?
- (a) E2EE chat with the database on ilo's or the institute's server, or
- (b) peer-to-peer WebRTC messaging with local-first storage (IndexedDB), no permanent server-side history.

## Decisions so far
1. **Not pure P2P.** Even with a local outbox and retry, delivery only happens when both devices are online at the same time. Closed tabs, iOS limits, no wake-up notifications, undelivered crisis messages, and lost history when a browser is cleared make it unsuitable on its own. WebRTC still needs signalling and TURN servers anyway.
2. **Chosen: hybrid.** Local-first history on each device (IndexedDB) plus a **temporary encrypted mailbox** on the server.
   - The sender encrypts on-device and sends ciphertext to the server.
   - The server holds it only while the recipient is offline (30-day expiry).
   - On reconnect the recipient receives it, decrypts, saves locally, and acknowledges.
   - The server deletes the row on acknowledgement and the sender gets a delivered receipt.
   - Undelivered messages expire and the sender sees "not delivered" and can resend.
3. **Hosting:** ilo-hosted (Supabase, India/Mumbai region) for the pilot. Design so it can be deployed on an institute's infrastructure later, since IITs have IT teams and data-sovereignty preferences.
4. **Encryption:** true E2EE with a vetted library (libsodium), never custom crypto. Private keys stay on devices. Passphrase-wrapped backup is stored encrypted.
5. **No WebRTC for the MVP.** Supabase Realtime over WebSocket covers real-time delivery. Add WebRTC later only for video/voice sessions.
6. **Crisis escalation is a separate path** (`escalations` table), not dependent on chat delivery, since the server cannot read messages.

## Build artifacts
- `ilo_schema.sql`: Supabase schema with RLS (syntax-checked with a Postgres parser, **not yet run on a live project**).
  - Tables: `institutions`, `profiles`, `assignments`, `user_keys`, `key_backups`, `mailbox`, `delivery_receipts`, `escalations`.
  - Enforces: only an active assigned student↔counsellor pair can message; recipient acknowledges by deleting; roles are not user-editable; users can edit only `display_name`; anon has no access.
  - Triggers: auto-create student profile on sign-up (by email domain), validate assignments, force server timestamps and a 500-pending-message cap, write delivery receipts on delete, stamp escalations with institution.
  - Cron: purge expired mailbox rows (every 10 min) and receipts older than 7 days (daily).
- A message-flow sequence diagram (send, offline hold, reconnect, deliver, ack, delete, receipt) was shown in chat.

## Known gaps and risks
- **Key recovery on a new device** is the hardest part: recovery phrase vs passphrase-wrapped backup in Supabase.
- **IndexedDB can be cleared or evicted** (especially Safari/iOS). Add an encrypted local export or backup, and make the app a PWA.
- **Offline notifications** (web push or email with no message content, via an Edge Function on mailbox insert) are not built yet. iOS web push needs the PWA installed.
- **Metadata** (who messaged whom, and when) is visible to the server until the row is deleted; receipts keep minimal metadata for 7 days.
- **Counsellor records:** case notes and retention rules need their own tables and policy.
- **Under-18 consent** matters less at IITs but returns when expanding to schools and coaching centres.
- **DPDP:** keep retention, erasure, consent, breach-notification and the emergency-exception pathway in view.
- Don't use Supabase realtime broadcast/presence for message content; use the table plus RLS.
- Never expose the service-role key to the client.

## Suggested build order
1. Auth, roles, student↔counsellor assignment
2. Key generation and public key registry
3. Encrypted send → mailbox insert → realtime receive
4. IndexedDB history and delivered receipts
5. Expiry job and offline notifications
6. Key recovery, then the escalation flow
7. Test RLS with two assigned users plus one outsider

## Next steps offered
- RLS test queries
- Next.js + libsodium send/receive code (steps 2–3)
- E2EE key-setup and recovery diagram
- Update the 5 Whys slide to match the IIT-first positioning
