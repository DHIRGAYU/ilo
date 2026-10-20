# ilo — Project Context

> Paste or attach this file at the start of any new chat/session about ilo so the assistant has full context.

---

## 1. What ilo is

**ilo** is a student counselling and mental wellness platform for educational institutions and coaching centers in India.

- **Who builds it:** Dhirgayu (student at IIT (BHU) Varanasi; Product Intern at Divergent Classes).
- **Core idea:** Give institutions that can't afford premium counselling systems an affordable, lightweight, scalable way to deliver real counselling, rather than a compliance checkbox.
- **Regulatory forcing function:** UGC and CBSE mandates require institutions to provide counselling. ilo positions itself as the practical way to meet them.

---

## 2. Problem & root cause (5 Whys)

Source: `5_whys_root_cause.pptx` (staircase layout).

| # | Why? | Answer |
|---|------|--------|
| 1 | Why aren't students getting adequate support? | Most institutions lack accessible counselling infrastructure, often one overloaded counsellor for thousands of students. |
| 2 | Why is infrastructure absent or overloaded? | Counselling is treated as a compliance checkbox for UGC/CBSE mandates, not a resourced, ongoing service. |
| 3 | Why a checkbox, not a real service? | No affordable, scalable system exists to deliver counselling; alternatives are built for large, well-funded institutions. |
| 4 | Why don't affordable systems exist for smaller institutions? | Existing players rely on high-touch consulting or premium pricing suited to Tier-1 institutions. |
| 5 | Why do incumbents structurally exclude this segment? | Serving many students on thin per-institution budgets needs a different product and go-to-market model; no one has built for this tier. |

**Root cause:** The market lacks a lightweight, affordable counselling platform built for Tier-2/3 institutions. Existing players are architecturally and commercially designed for a premium segment.

---

## 3. Positioning & market

- **Incumbents:** YourDOST, BRDS, SILICA, all built for premium Tier-1 institutions.
- **Differentiation:** The Tier-2/3 wedge. Competing head-on with established players is not viable, so the underserved segment is the entry point.
- **Targeting update (important):** The go-to-market has been revised to **start with IITs** (Tier-1, where the founder already sits at IIT BHU) as the first market, then expand. The 5 Whys deck and earlier framing were Tier-2/3-only.
  - ⚠️ **Open tension:** the root-cause narrative (Tier-2/3 underserved) and the beachhead (IITs) need to be reconciled in the pitch, e.g. IITs as a proof/credibility beachhead, Tier-2/3 as the scale thesis.
- **Expansion wedge under consideration:** coaching institutes → corporate wellness → wearables.

---

## 4. Personas (4)

Built with a Jobs-to-be-Done framework:

1. The Overwhelmed Achiever
2. The Quietly Struggling Student
3. The Career-Undecided First-Gen Student
4. The Overloaded Counsellor

Customer segmentation covers **B2B institutional segments** and **B2C student personas** (`customer_segments.pptx`).

---

## 5. Existing artifacts

| Artifact | Format | Notes |
|----------|--------|-------|
| 5 Whys root cause slide | PPTX | Staircase visual layout |
| Customer segmentation deck | `customer_segments.pptx` | B2B segments + B2C personas |
| Stakeholder map + 7-slide pitch deck | PPTX | Teal-navy / sage / coral palette |
| User personas deck | PPTX | 4 personas with JTBD |
| Data Governance Framework | DOCX | Mapped to DPDP Act 2023 |
| ilo branding kit | SVG | Teal-seafoam palette used as default until brand colors are formally swapped in |
| MVP UI/UX | In progress | Screen-by-screen build using the branding kit |

---

## 6. Product / MVP

- **Form factor:** Web app (MVP as a website).
- **Tech stack:** Next.js + Supabase.
- **Architecture idea under consideration:** Local-first chat, with history in IndexedDB on each device and a temporary encrypted mailbox for offline delivery.
- **Design approach:** Screen-by-screen UI/UX build with the ilo branding kit.
- **Public website:** Wants a public ilo website (asked for ideas and a basic outline, Oct 2026).

---

## 7. Regulatory constraints (DPDP Act 2023)

- **Minors:** Verifiable parental consent is required for under-18 users.
- **Behavioral monitoring** is banned for minors, which conflicts with the wearables phase.
- **Fiduciary vs. Processor:** Roles are ambiguous and need contractual resolution per institution.
- **Erasure rights** create tension with the continuity-of-care value proposition.
- **Medical emergency exception** is the legal basis for the crisis escalation pathway design.
- **Breach notification** carries the highest penalty exposure and is the priority compliance area.
- **Other references:** UGC Uniform Policy, CBSE mandates, NAAC accreditation criteria.

---

## 8. Roadmap / next steps

1. Finish the MVP screen-by-screen UI/UX build.
2. Merge existing pitch deck slides into one unified PPTX (requires uploading the actual binary files).
3. Possibly add a product/solution slide with MVP screens to the pitch deck.
4. Draft the public website outline.
5. Reconcile the IIT-first beachhead with the Tier-2/3 root-cause narrative.
6. Plan the expansion path (coaching → corporate wellness → wearables) within DPDP limits.

---

## 9. Tools & working conventions

- `pptxgenjs` for programmatic PowerPoint generation
- `docx` library for Word documents
- `react-icons` and `sharp` for UI and deck assets
- Palette: teal-navy / sage / coral (pitch deck); teal-seafoam (default brand)

---

## 10. Quick-start prompt for new chats

> I'm building **ilo**, a student counselling platform for Indian educational institutions. Read `context.md` for full background. Today I want to work on: **[task]**.
