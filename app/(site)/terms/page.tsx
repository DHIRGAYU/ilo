import type { Metadata } from "next";
import { LegalDoc, type Section } from "@/components/site/legal-doc";

const title = "Terms of use | ilo";
const description =
  "The rules for using ilo: who can use it, booking sessions, messages and calls, acceptable use, and how to raise a concern.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

// Set to false once a lawyer has reviewed this text and every [placeholder] is filled in.
const DRAFT = true;

const sections: Section[] = [
  {
    id: "about",
    title: "About these terms",
    blocks: [
      { p: "ilo is provided by [Legal name of the company], [registered address] (“ilo”, “we”, “us”). By signing in or using ilo’s website or app, you agree to these terms. If you do not agree, please do not use ilo." },
      { p: "If your college or school has a separate agreement with us, that agreement covers the institution’s use of ilo. These terms cover yours." },
    ],
  },
  {
    id: "what",
    title: "What ilo is, and is not",
    blocks: [
      { p: "ilo is a platform that helps students reach a counsellor on their own campus: booking sessions, sending private messages, and making audio or video calls." },
      {
        ul: [
          "Counselling is given by counsellors who are [employed or engaged by your institution]. ilo provides the technology. [Confirm the arrangement and who is responsible for counsellors’ qualifications and professional conduct.]",
          "ilo is not an emergency service. It does not diagnose or treat any condition and is not a replacement for medical care.",
          "If you or someone else is in danger, call 112. For free emotional support, call Tele-MANAS on 14416 or KIRAN on 1800-599-0019.",
        ],
      },
    ],
  },
  {
    id: "who",
    title: "Who can use ilo",
    blocks: [
      {
        ul: [
          "Students: you can use ilo if you belong to a college or school that has registered with ilo and you sign in with your institution’s email address.",
          "Counsellors: you can use ilo if ilo has created an account for you.",
          "If you are under 18, you may use ilo only with the consent of a parent or legal guardian. [Describe how consent is given and checked.]",
          "You must give accurate information and use only your own account.",
        ],
      },
    ],
  },
  {
    id: "account",
    title: "Your account and security",
    blocks: [
      {
        ul: [
          "Keep your sign-in details private. You are responsible for what happens under your account.",
          "When you set up secure messaging you will receive a recovery code. Keep it safe and do not share it. ilo cannot recover it for you, and if you lose it together with your device, your message history cannot be restored.",
          "Messages are active on one device at a time.",
          "Tell us straight away if you think someone else has used your account.",
        ],
      },
    ],
  },
  {
    id: "bookings",
    title: "Booking sessions",
    blocks: [
      {
        ul: [
          "Sessions last 45 minutes. Times are shown in Indian Standard Time.",
          "You can cancel or reschedule up to 2 hours before a session. After that, please message your counsellor.",
          "A counsellor may need to change or cancel a session. We will let you know through ilo.",
          "[Explain any rule about repeated missed sessions.]",
        ],
      },
    ],
  },
  {
    id: "messaging",
    title: "Messages and calls",
    blocks: [
      {
        ul: [
          "Counsellors reply during campus working hours. We do not promise a reply time.",
          "Messages and calls are not for emergencies. See “What ilo is, and is not”.",
          "Calls run through a third-party service (Daily). You need a working internet connection and must allow your camera and microphone. Please do not record or share a call unless everyone on it agrees.",
        ],
      },
    ],
  },
  {
    id: "counsellors",
    title: "If you are a counsellor",
    blocks: [
      { p: "If you use ilo as a counsellor, you also agree to:" },
      {
        ul: [
          "keep what students tell you confidential, except where the law or a serious risk to safety requires otherwise;",
          "follow your professional standards and your institution’s rules;",
          "use ilo only for your work with students, and not copy or share messages or notes outside ilo except as your professional duties require;",
          "keep your password and recovery code private, and never let anyone else use your account.",
        ],
      },
    ],
  },
  {
    id: "use",
    title: "Acceptable use",
    blocks: [
      { p: "You agree not to:" },
      {
        ul: [
          "harass, threaten, bully or abuse anyone, or pretend to be someone else;",
          "send anything unlawful, or anything that sexually exploits or endangers a child;",
          "send spam or use ilo to sell anything;",
          "try to break, probe or overload ilo, bypass its security, or collect information from it by automated means;",
          "copy, reverse engineer or resell ilo.",
        ],
      },
    ],
  },
  {
    id: "content",
    title: "Your content and ours",
    blocks: [
      {
        ul: [
          "What you write is yours. You give ilo only the permission it needs to store and deliver it. Because messages are end-to-end encrypted, we cannot read or use them.",
          "ilo’s software, name, logo, design and content belong to us or our licensors. We give you a personal, non-transferable permission to use ilo while these terms apply.",
        ],
      },
    ],
  },
  {
    id: "fees",
    title: "Cost",
    blocks: [{ p: "ilo is free for students. Colleges and schools pay under a separate agreement. [Confirm. Explain any fees if this changes.]" }],
  },
  {
    id: "service",
    title: "Changes to ilo",
    blocks: [
      { p: "We may add, change or remove features, and ilo may sometimes be unavailable for maintenance or for reasons outside our control. We do not promise that ilo will always be available or free of errors. We will give notice of major changes where we can." },
    ],
  },
  {
    id: "ending",
    title: "Stopping or suspending access",
    blocks: [
      {
        ul: [
          "You can stop using ilo at any time, and can ask us to delete your account (see our Privacy policy).",
          "We may suspend or end your access if you break these terms, if we need to protect someone’s safety or the security of ilo, or if your institution’s agreement with us ends. We will explain why where we can.",
          "If you leave your institution, your access through that institution ends. [Describe what happens to your data.]",
        ],
      },
    ],
  },
  {
    id: "disclaimers",
    title: "What we do not promise",
    blocks: [
      { p: "To the extent the law allows, ilo is provided “as is”. We do not guarantee any result from counselling. Advice and opinions given by counsellors are theirs. [Lawyer: confirm the split of responsibility between ilo, counsellors and institutions.]" },
    ],
  },
  {
    id: "liability",
    title: "Limits on our responsibility",
    blocks: [
      { p: "To the extent the law allows, ilo is not responsible for indirect or consequential loss, or for events outside our reasonable control. Our total responsibility to you for any claim relating to ilo is limited to [amount]. Nothing in these terms limits any responsibility that cannot be limited by law, including for fraud or for death or personal injury caused by negligence. [Lawyer: confirm.]" },
    ],
  },
  {
    id: "privacy",
    title: "Your privacy",
    blocks: [{ p: "Our Privacy policy explains how we handle your information. By using ilo you confirm that you have read it." }],
  },
  {
    id: "complaints",
    title: "Complaints",
    blocks: [
      { p: "Grievance officer: [Name], [email address], [postal address]. We will acknowledge complaints within [24 hours] and aim to resolve them within [15 days]. [Lawyer: confirm timelines under the IT (Intermediary Guidelines) Rules and the DPDP Rules.]" },
    ],
  },
  {
    id: "law",
    title: "Law and disputes",
    blocks: [
      { p: "These terms are governed by the laws of India. The courts at [city], India have jurisdiction, [subject to any arbitration clause your lawyer adds]." },
    ],
  },
  {
    id: "changes",
    title: "Changes to these terms",
    blocks: [
      { p: "We may update these terms. If a change matters, we will tell you [in the app or by email] before it takes effect. If you keep using ilo after that, you accept the new terms. If you do not agree, you can stop using ilo." },
    ],
  },
  {
    id: "general",
    title: "General",
    blocks: [
      { p: "If part of these terms cannot be enforced, the rest still applies. If we do not enforce a term straight away, we can still enforce it later. You may not transfer your rights under these terms to anyone else. Contact: [email address]." },
    ],
  },
];

export default function Page() {
  return (
    <LegalDoc
      title="Terms of use"
      updated="[date]"
      intro="These terms are the rules for using ilo. Please read them together with our Privacy policy. If you are under 18, please read them with a parent or guardian."
      draft={DRAFT}
      sections={sections}
      other={{ href: "/privacy-policy", label: "Privacy policy" }}
    />
  );
}
