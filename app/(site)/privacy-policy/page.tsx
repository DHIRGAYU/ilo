import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";

const title = "Privacy policy | ilo";
const description =
  "The ilo privacy policy will be published here before launch. ilo is private, confidential counselling for students on Indian campuses.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

// TODO: replace with the final legal text.
export default function Page() {
  return (
    <>
      <PageIntro title="Privacy policy">
        The ilo privacy policy will be published here before launch.
      </PageIntro>
      <div className="pb-20" />
    </>
  );
}
