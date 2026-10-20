import type { Metadata } from "next";
import { ContactForm } from "@/components/site/contact-form";
import { PageIntro } from "@/components/site/page-intro";
import { getContactEmail } from "@/components/site/links";
import { body, container, h2, textLink } from "@/components/site/styles";

const title = "Request a demo | Ilo";
const description =
  "Request a demo of Ilo for your college, school or coaching centre. Tell us about your institution and we will get back to you by email.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

export default function ContactPage() {
  const email = getContactEmail();
  return (
    <>
      <PageIntro title="Bring Ilo to your campus">
        Tell us a little about your institution and we will show you how Ilo
        could work for your students and your counsellor.
      </PageIntro>

      <section className="py-14 sm:py-20">
        <div className={`${container} grid gap-12 lg:grid-cols-[1.2fr_0.8fr]`}>
          <div className="min-w-0 rounded-2xl border border-ilo-plum/10 bg-white p-6 sm:p-8">
            <ContactForm />
          </div>
          <div className="min-w-0">
            <h2 className={h2}>Prefer email?</h2>
            <p className={`${body} mt-4`}>
              Write to us at{" "}
              <a href={`mailto:${email}`} className={`${textLink} break-all`}>
                {email}
              </a>
              .
            </p>
            <p className={`${body} mt-4`}>
              Are you a student? You do not need to contact us. Sign in with your
              college email from the home page.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
