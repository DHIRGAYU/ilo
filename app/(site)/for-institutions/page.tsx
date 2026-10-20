import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand } from "@/components/site/cta-band";
import { PageIntro } from "@/components/site/page-intro";
import { PrivacyPromise } from "@/components/site/privacy-promise";
import { btn, body, container, h2, h3 } from "@/components/site/styles";

const title = "Ilo for colleges, schools and coaching centres | Ilo";
const description =
  "Ilo gives Indian colleges, schools and coaching centres an affordable way to run counselling, support their counsellor and meet UGC and CBSE norms.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

const benefits = [
  ["Lightweight to start", "Students sign in with their college email and reach the counsellor already on your campus."],
  ["Affordable to run", "Designed for institutions that do not have the budget of a premium Tier-1 campus."],
  ["Easy to grow", "Start with one counsellor and add more as your students need them."],
];

const kinds = [
  ["Colleges", "Give every student a clear, private way to reach campus support."],
  ["Schools", "Make counselling easy to approach for older students who want to talk."],
  ["Coaching centres", "Support students through long, high-pressure preparation."],
];

export default function ForInstitutionsPage() {
  return (
    <>
      <PageIntro title="Counselling your students will actually use">
        Many smaller institutions have one overloaded counsellor, or none.
        Ilo makes it simple to offer counselling that students trust and your
        counsellor can manage.
      </PageIntro>

      <section className="py-14 sm:py-20">
        <div className={container}>
          <h2 className={h2}>What Ilo gives you</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {benefits.map(([t, d]) => (
              <div key={t} className="min-w-0 border-t border-ilo-plum/20 pt-6">
                <h3 className={h3}>{t}</h3>
                <p className={`${body} mt-2`}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ilo-deep py-16 sm:py-20">
        <div className={container}>
          <PrivacyPromise className="text-3xl text-white sm:text-5xl" />
          <p className="mt-6 max-w-prose text-base leading-relaxed text-ilo-blush">
            Students use counselling when they trust it. Ilo is built so your
            institution can see that support is happening without seeing who
            used it.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className={container}>
          <h2 className={h2}>Who Ilo is for</h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3">
            {kinds.map(([t, d]) => (
              <div key={t} className="min-w-0 border-t border-ilo-plum/20 pt-6">
                <h3 className={h3}>{t}</h3>
                <p className={`${body} mt-2`}>{d}</p>
              </div>
            ))}
          </div>
          <Link href="/contact" className={`${btn("primary")} mt-12`}>
            Request a demo
          </Link>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
