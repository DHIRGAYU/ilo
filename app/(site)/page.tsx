import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Fingerprint,
  FileLock2,
  EyeOff,
  HeartHandshake,
  Lock,
  Mail,
  MessageSquareOff,
  Phone,
  ScanSearch,
  ShieldCheck,
  Smile,
  Wind,
  Clock,
} from "lucide-react";
import { CtaBand } from "@/components/site/cta-band";
import { EntryButtons } from "@/components/site/entry-buttons";
import { HELPLINES, STUDENT_PATH, COUNSELLOR_PATH } from "@/components/site/links";
import { PhoneMockup } from "@/components/site/phone-mockup";
import { btn, body, card, container, eyebrow, h1, h2, h3, iconBox, pill, small } from "@/components/site/styles";

const title = "ilo | Better Within - private campus counselling for students";
const description =
  "ilo connects students to the counsellor already on their campus, with private, encrypted support for colleges, schools and coaching centres across India.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

const steps = [
  {
    title: "Sign in privately",
    text: "Authenticate via your campus credentials. The platform instantly mints an anonymous safe alias protecting your true identity.",
    tone: "bg-ilo-deep",
  },
  {
    title: "Reach your campus counsellor",
    text: "Match directly with your institution's resident counsellors and certified clinical psychologists who understand campus life.",
    tone: "bg-ilo-plum",
  },
  {
    title: "Book / Message / Call",
    text: "Communicate on your terms through encrypted text dialogue, secure audio, or in-person safe room slot booking.",
    tone: "bg-ilo-ink",
  },
  {
    title: "Support when you need it",
    text: "Guided self-care tools, proactive grounding check-ins, and verified 24/7 emergency escalation backup at every step.",
    tone: "bg-ilo-crisis",
  },
];

const privacy = [
  {
    icon: EyeOff,
    title: "Your college sees that counselling happened, never who.",
    text: "Administrative deans receive aggregate wellness metrics to improve campus programs, with zero student identifiable data or attendance manifests.",
    foot: { icon: ShieldCheck, label: "Institutional alias protection" },
  },
  {
    icon: MessageSquareOff,
    title: "Never what was said.",
    text: "Your dialogues, chats, reflections, and session insights are strictly confidential between you and your licensed counsellor. Nothing is shared with faculty or peers.",
    foot: { icon: Fingerprint, label: "Protected clinical privilege" },
  },
  {
    icon: Lock,
    title: "Encrypted end to end.",
    text: "All clinical messages, session notes, and audio connections are safeguarded by state-of-the-art cryptographic standards, stored locally on sovereign Indian servers.",
    foot: { icon: Lock, label: "DPDP Act 2023 compliant" },
  },
];

const tools = [
  {
    icon: Wind,
    title: "Quick self-check",
    text: "A quiet 2-minute breath and reflection check to release chest tension and unspool racing thoughts before sleep or lectures.",
    link: "Start 2-min pause",
  },
  {
    icon: Smile,
    title: "What am I feeling?",
    text: "A somatic emotion wheel and naming path that helps you untangle numbness, academic impostor guilt, and chronic fatigue.",
    link: "Explore emotion wheel",
  },
  {
    icon: BookOpen,
    title: "Browse resources",
    text: "Curated, bite-sized guides on navigating viva nervousness, roommate conflict, perfectionism, and placement cycle anxiety.",
    link: "Read wellness guides",
  },
];

const practitioner = [
  {
    icon: Clock,
    title: "Lightened administrative burden",
    text: "Eliminate endless coordination emails, fragmented paper files, and schedule conflicts. Save 14+ hours every week.",
  },
  {
    icon: ScanSearch,
    title: "Automated confidential triage",
    text: "Intelligent intake markers assist with risk profiling, so urgent student concerns are prioritized safely and with dignified discretion.",
  },
  {
    icon: FileLock2,
    title: "Streamlined session logging",
    text: "Zero-knowledge encrypted case notes and follow-up reminders crafted strictly to RCI clinical ethics and statutory mandates.",
  },
];

export default function HomePage() {
  const t = HELPLINES.telemanas;
  const k = HELPLINES.kiran;
  return (
    <>
      {/* Hero */}
      <section className="site-hero-in bg-linear-to-b from-ilo-bg to-ilo-blush/30">
        <div className={`${container} grid items-center gap-14 py-14 sm:py-20 lg:grid-cols-2`}>
          <div className="min-w-0">
            <span className={pill}>
              <span className="size-1.5 rounded-full bg-ilo-crisis" aria-hidden="true" />
              Campus mental healthcare
            </span>
            <h1 className={`${h1} mt-6`}>Better Within.</h1>
            <p className={`${body} mt-5`}>
              Reach the counsellor who is already on your campus. Encrypted
              end-to-end, from the first message.
            </p>
            <EntryButtons className="mt-8" />
            <p className={`${small} mt-4 text-xs`}>
              Your college gives you access. Sign in with your campus Google account.
            </p>
            <p className="mt-6 inline-flex max-w-full items-start gap-2 rounded-xl bg-ilo-blush/60 px-4 py-3 text-xs leading-relaxed text-ilo-ink">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-ilo-plum" aria-hidden="true" />
              <span>
                Your college sees that counselling happened.{" "}
                <strong className="text-ilo-deep">Never who. Never what was said.</strong>
              </span>
            </p>
          </div>
          <PhoneMockup />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-ilo-blush/25 py-16 sm:py-24">
        <div className={container}>
          <div className="text-center">
            <p className={eyebrow}>Student journey</p>
            <h2 className={`${h2} mt-3`}>How it works for students</h2>
            <p className={`${body} mx-auto mt-3`}>
              Dignified, stigma-free support built around your pace and privacy.
            </p>
          </div>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className={`${card} p-6`}>
                <span
                  className={`inline-flex size-10 items-center justify-center rounded-full text-sm font-semibold text-white ${s.tone}`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-ilo-deep">{s.title}</h3>
                <p className={`${small} mt-2`}>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="scroll-mt-20 py-16 sm:py-24">
        <div className={container}>
          <div className="text-center">
            <p className={eyebrow}>Ironclad confidentiality</p>
            <h2 className={`${h2} mt-3`}>What stays private</h2>
            <p className={`${body} mx-auto mt-3`}>
              Campus counselling that honours your boundaries. Clear, verifiable
              separation between university admin and clinical care.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {privacy.map(({ icon: Icon, title: t2, text, foot }) => (
              <div key={t2} className={`${card} flex flex-col p-8`}>
                <span className={iconBox}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className={`${h3} mt-6 text-2xl leading-snug`}>{t2}</h3>
                <p className={`${small} mt-3`}>{text}</p>
                <p className="mt-auto flex items-center gap-2 pt-8 text-xs font-medium text-ilo-ink">
                  <foot.icon className="size-4 shrink-0 text-ilo-plum" aria-hidden="true" />
                  {foot.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools */}
      <section id="resources" className="scroll-mt-20 bg-ilo-blush/25 py-16 sm:py-24">
        <div className={container}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className={eyebrow}>Daily support</p>
              <h2 className={`${h2} mt-3`}>Quick tools for students</h2>
            </div>
            <p className={`${body} md:max-w-sm`}>
              Gentle exercises designed for overwhelmed moments during exams,
              submissions, or late dorm nights.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {tools.map(({ icon: Icon, title: t3, text, link }) => (
              <div key={t3} className={`${card} flex flex-col p-6`}>
                <div className="flex items-start justify-between gap-3">
                  <span className={iconBox}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-full bg-ilo-blush/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ilo-ink">
                    Not a diagnosis
                  </span>
                </div>
                <h3 className={`${h3} mt-5 text-2xl`}>{t3}</h3>
                <p className={`${small} mt-2`}>{text}</p>
                {/* The tools live in the student app, so these go to sign in. */}
                <Link
                  href={STUDENT_PATH}
                  className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-ilo-plum hover:text-ilo-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum"
                >
                  {link}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Practitioner suite */}
      <section className="py-16 sm:py-24">
        <div className={`${container} grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]`}>
          <div className="min-w-0">
            <span className={pill}>
              <HeartHandshake className="size-3.5" aria-hidden="true" />
              Practitioner suite
            </span>
            <h2 className={`${h2} mt-5 sm:text-5xl`}>Honouring the work of campus counsellors.</h2>
            <p className={`${body} mt-5`}>
              Resident psychologists carry tremendous emotional weight for
              thousands of young adults. ilo takes away administrative friction
              so your focus stays entirely clinical.
            </p>
            <Link href={COUNSELLOR_PATH} className={`${btn("primary")} mt-8`}>
              I&apos;m a counsellor
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid min-w-0 gap-4 md:grid-cols-3">
            {practitioner.map(({ icon: Icon, title: t4, text }) => (
              <div key={t4} className={card}>
                <span className={iconBox}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ilo-deep">{t4}</h3>
                <p className="mt-2 text-xs leading-relaxed text-ilo-ink">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety and immediate help */}
      <section id="help" className="scroll-mt-20 bg-ilo-blush/70 py-10">
        <div className={`${container} flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="flex min-w-0 items-start gap-4 lg:max-w-xl">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ilo-crisis text-white">
              <HeartHandshake className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-ilo-deep">Safety and Immediate Help</h2>
              <p className={`${small} mt-1`}>
                If you or someone on campus is in acute distress, free
                government helplines and licensed crisis counsellors are
                available 24/7 across India.
              </p>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-3">
              <p className="rounded-full bg-white px-4 py-2 text-sm text-ilo-ink">
                {t.label}: <strong className="text-ilo-deep">{t.short}</strong> / {t.long}
              </p>
              <p className="rounded-full bg-white px-4 py-2 text-sm text-ilo-ink">
                {k.label}: <strong className="text-ilo-deep">{k.long}</strong>
              </p>
            </div>
            <a href={`tel:${t.short}`} className={`${btn("soft", "sm")} mt-3`}>
              <Phone className="size-4" aria-hidden="true" />
              Need help now &mdash; {t.short}
            </a>
          </div>
        </div>
      </section>

      {/* Institutions */}
      <section className="py-16 sm:py-24">
        <div className={`${container} text-center`}>
          <p className={eyebrow}>Higher education leadership</p>
          <h2 className={`${h2} mt-3`}>Bring ilo to your campus.</h2>
          <p className={`${body} mx-auto mt-5`}>
            Higher education mental wellness requires proactive infrastructure,
            not reactionary crisis management. ilo provides institutional
            leaders with full regulatory compliance readiness (DPDP Act 2023,
            UGC &amp; CBSE grievance mandates), significantly reduced counsellor
            administrative burden, and aggregate anonymised campus wellness
            insights without surveillance.
          </p>
          <Link href="/contact" className={`${btn("secondary")} mt-8`}>
            Talk to us
            <Mail className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
