import type { Metadata } from "next";
import { LegalDoc, type Section } from "@/components/site/legal-doc";

const title = "Privacy policy | ilo";
const description =
  "How ilo collects, protects and shares your information: end-to-end encrypted messages, who can see what, how long we keep data, and your rights.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

// Set to false once a lawyer has reviewed this text and every [placeholder] is filled in.
const DRAFT = true;

const sections: Section[] = [
  {
    id: "who",
    title: "Who we are",
    blocks: [
      { p: "ilo is run by [Legal name of the company], [registered address] (“ilo”, “we”, “us”). Under India’s Digital Personal Data Protection Act, 2023 (the “DPDP Act”), we are the Data Fiduciary for the personal data described in this policy." },
      { note: "[Lawyer: confirm roles. Where a college or school decides why students’ data is used, it may be a joint or separate Data Fiduciary. Reflect the arrangement in the agreement with each institution.]" },
      { p: "Questions or complaints about your data: [Name and title of the privacy contact], [email address], [postal address]. See “Contact and complaints” at the end." },
    ],
  },
  {
    id: "short",
    title: "The short version",
    blocks: [
      {
        ul: [
          "What you write in messages is locked on your device before it is sent. We cannot read it, and neither can your college.",
          "Your counsellor knows your name and sees what you choose to tell them.",
          "Your college is meant to see only that counselling is happening, as overall numbers. It does not see who attended or what was said. [Update this line when the college dashboard is built.]",
          "We do not sell your information, and we do not show advertising.",
          "ilo does not record calls.",
          "You can ask us to correct or delete your information at any time.",
          "ilo is not an emergency service. If you are in danger, call 112. For emotional support, call Tele-MANAS on 14416 (free, 24×7).",
        ],
      },
    ],
  },
  {
    id: "collect",
    title: "What we collect and why",
    blocks: [
      { p: "We collect only what we need to run ilo." },
      { h: "When you sign in" },
      {
        ul: [
          "Students: your name, college email address and profile picture link, from the Google account you use to sign in. We use these to check that you belong to a registered college and so that your counsellor can greet you by name.",
          "Counsellors: your work email address and a password issued by ilo.",
          "Which college you belong to, and your role in ilo (student or counsellor).",
        ],
      },
      { h: "Your choices" },
      { ul: ["The languages you speak and any preference about your counsellor’s gender. We use these to suggest the counsellor who suits you best. You can change them at any time."] },
      { h: "Bookings" },
      {
        ul: [
          "The counsellor, the date and time, how you will meet (in person, video or phone), and whether a session was kept, cancelled or rescheduled.",
          "An optional note you write to your counsellor (up to 500 characters). This note is stored on our servers behind access rules, not end-to-end encrypted, so keep it short and put the details in the encrypted chat. [Update if booking notes become end-to-end encrypted.]",
        ],
      },
      { h: "Messages" },
      { p: "The content of your messages is end-to-end encrypted (see “How messages are protected”). We hold locked copies only briefly. We can see that a message was sent between two accounts, when, roughly how large it is, and whether it was delivered." },
      { h: "Calls" },
      {
        ul: [
          "Who called whom, when, whether it was audio or video, and whether it was answered.",
          "The call itself runs through our video provider (see “Our service providers”). ilo does not record calls.",
        ],
      },
      { h: "Safety records" },
      { ul: ["If you or your counsellor use the escalation feature, we keep a record that it was used, when, and by whom. It does not include any message text, and only you and your counsellor can see it. [Confirm against the final escalation design.]"] },
      { h: "Counsellor notes" },
      { ul: ["Counsellors can keep private notes about a conversation. They are stored on our servers, visible only to that counsellor, and are not end-to-end encrypted. [Update when notes are encrypted.]"] },
      { h: "Technical information" },
      { ul: ["Your device and browser type, IP address, security and error logs, and sign-in session cookies. We use these to keep ilo secure, prevent misuse and fix problems."] },
      { h: "When you contact us" },
      { ul: ["If you use the contact form on our website: your name, email address, institution and message."] },
      { note: "We do not collect your precise location, your contacts, or government ID numbers. Your camera and microphone are used only during calls, and only after your browser asks your permission." },
    ],
  },
  {
    id: "messages",
    title: "How messages are protected",
    blocks: [
      { p: "When you send a message, ilo locks it on your device using keys that only you and your counsellor hold. The keys are created on your device. We cannot unlock your messages." },
      {
        ul: [
          "Temporary mailbox. We keep the locked message for up to 30 days, only until your counsellor’s device collects it. After that it is deleted, whether it was delivered or not. Delivered messages live on your devices.",
          "History backup. So that you can get your history back on a new device, an encrypted copy of your history is stored on our servers. Only your recovery code can unlock it, and you can erase it.",
          "Recovery code. At set-up you are shown a 24-character recovery code. We never see it. If you lose both the code and your device, we cannot recover your history. Keep the code private: anyone who has it can unlock your history.",
          "One active device. Your messages are active on one device at a time. If you switch devices, the old one stops receiving messages.",
          "Security code. You and your counsellor can compare a short number in the app to check that nobody has swapped your keys.",
        ],
      },
      { h: "What this does and does not do" },
      {
        ul: [
          "It keeps message content from us, from your college, and from anyone who breaks into our servers.",
          "It does not protect messages if someone gets your unlocked device or your recovery code, or if a person you wrote to shares what you told them.",
          "It does not provide “forward secrecy”: if your recovery code or keys are ever exposed, older messages could be read too.",
          "We can see the facts about messages (who, when, how big, delivered or not), but not what they say.",
        ],
      },
    ],
  },
  {
    id: "who-sees",
    title: "Who can see what",
    blocks: [
      {
        ul: [
          "You: everything in your own account.",
          "Your counsellor: your name, your college, your bookings with them, the note you add to a booking, the messages you send them, and details of calls with them. They are bound by professional confidentiality (see “When information may be shared”).",
          "Your college: [today, nothing about individual students]. The college is meant to see overall numbers only, such as how many sessions took place. It does not see names, messages, notes or booking details.",
          "ilo staff: we cannot read messages. A small number of authorised people can see account, booking and technical records when needed for support, security or legal reasons. [Describe access controls and logging.]",
          "Our service providers: see the next section.",
          "Nobody else. We do not share your information with advertisers, data brokers or employers.",
        ],
      },
      { note: "[Confirm and describe: counsellors may be employed or engaged by your institution. Make clear that what they hold as counsellors is kept confidential from the institution’s management and faculty.]" },
    ],
  },
  {
    id: "use",
    title: "How we use your information",
    blocks: [
      {
        ul: [
          "To let you sign in and to match you with a counsellor on your campus.",
          "To run bookings, messages and calls, and to send you notices about them.",
          "To keep people safe: to provide the escalation feature and to prevent abuse of ilo.",
          "To keep ilo secure and working, and to answer your questions.",
          "To count overall use (for example, how many sessions took place) in ways that do not identify anyone.",
          "To meet our legal duties.",
        ],
      },
      { p: "We do not use your messages, notes or booking details for advertising, and we do not sell personal information." },
      { p: "Our basis for using your information is your consent, given when you sign up (and, for people under 18, the consent of a parent or guardian), or another ground allowed by the DPDP Act, such as complying with the law or responding to a medical emergency. You can withdraw consent at any time (see “Your rights”)." },
    ],
  },
  {
    id: "providers",
    title: "Our service providers",
    blocks: [
      { p: "We use these companies to run ilo. They may only use your information to provide their service to us." },
      {
        ul: [
          "Supabase: our database, sign-in and live updates. Data is stored in [region].",
          "Vercel: hosting for the ilo website and app. [Region.]",
          "Google: sign-in for students, using your college Google account.",
          "Daily (Daily.co): audio and video calls. Daily handles the live audio and video, and technical details such as your IP address, to connect the call. It is based in the United States. ilo does not turn on recording. [Link to Daily’s privacy policy.]",
          "[Email or form provider, if any.]",
        ],
      },
      { p: "Some providers store or process information outside India. The DPDP Act allows this except to countries the Government of India restricts, and we will follow any such restriction." },
      { note: "[Lawyer: confirm data processing agreements are in place with each provider.]" },
    ],
  },
  {
    id: "sharing",
    title: "When information may be shared",
    blocks: [
      { p: "What you tell your counsellor is confidential. There are only a few situations where it may be shared." },
      {
        ul: [
          "With your consent, for example if you ask your counsellor to speak to someone on your behalf.",
          "To protect life. If your counsellor believes you or someone else is at serious and immediate risk of harm, they may need to contact emergency services or other people who can help. [Clinical lead and lawyer: define exactly when and with whom, and how this is explained to students.]",
          "When the law requires it. For example, laws that protect children from sexual abuse require some reports to be made, and a court or authority may order information to be produced. [Lawyer: confirm the list.]",
        ],
      },
      { p: "ilo cannot read message content, so we cannot hand it over, even if we are asked. If we receive a lawful request, we will share only the records we hold and are legally required to give. [Lawyer: confirm this statement in light of the IT Act.]" },
      { p: "If ilo is bought by or merged with another company, we will tell you before your information is transferred, and the new owner must follow this policy." },
    ],
  },
  {
    id: "retention",
    title: "How long we keep information",
    blocks: [
      {
        ul: [
          "Locked messages in the temporary mailbox: up to 30 days.",
          "Messages on your own device: until you delete them or clear ilo’s data from that device.",
          "Encrypted history backup: until you erase it or delete your account.",
          "Account details: while your account is active.",
          "Bookings and call records: [24 months] after the session.",
          "Counsellor notes: [period set with clinical and legal advice].",
          "Security and access logs: [at least one year, as the law requires].",
          "Website enquiries: [12 months].",
        ],
      },
      { p: "If you delete your account, we delete or anonymise your information within [30 days], except anything the law requires us to keep. [Describe the in-app way to do this when it exists.]" },
    ],
  },
  {
    id: "rights",
    title: "Your rights",
    blocks: [
      {
        ul: [
          "Access: ask for a summary of the personal information we hold about you and who we share it with.",
          "Correction: ask us to correct or update information that is wrong or out of date.",
          "Erasure: ask us to delete your information.",
          "Withdraw consent: you can do this as easily as you gave it. We may then be unable to give you ilo.",
          "Grievance: tell us about any problem with how we handle your information. We will reply within [a reasonable time, never more than 90 days].",
          "Nomination: name someone who can exercise these rights for you if you die or cannot act for yourself.",
        ],
      },
      { p: "To use any of these, email [privacy email address] or use [in-app route]. We may ask you to confirm who you are first. If we have not resolved your complaint, you can complain to the Data Protection Board of India." },
    ],
  },
  {
    id: "children",
    title: "Children and teenagers (under 18)",
    blocks: [
      { p: "Many ilo users are students under 18. Indian law treats them as children. Before we process a child’s personal information, we need verifiable consent from a parent or legal guardian. [Describe exactly how consent is collected and checked, for example through the school plus the parent’s confirmation. To be finalised with your lawyer.]" },
      {
        ul: [
          "We do not track or monitor children’s behaviour for advertising, and we do not show them targeted advertising.",
          "A parent or guardian can ask us about their child’s information and can withdraw consent.",
          "Counselling is confidential for children too. [Clinical and legal review: decide what a parent or guardian may and may not see about a child’s sessions and messages, and say so here.]",
          "If we learn that a child is using ilo without the required consent, we will pause the account until it is in place.",
        ],
      },
    ],
  },
  {
    id: "security",
    title: "How we keep information safe",
    blocks: [
      {
        ul: [
          "Message content is end-to-end encrypted, as described above.",
          "Information is encrypted in transit (HTTPS) and protected by our providers’ security.",
          "Access rules mean each person can only read their own records, and counsellors only see their own students.",
          "Staff access is limited to what is needed. [Describe logging and review.]",
        ],
      },
      { p: "No system is completely secure. If a data breach affects you, we will tell you and the Data Protection Board of India, as the law requires." },
    ],
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    blocks: [
      {
        ul: [
          "Sign-in cookies keep you signed in. ilo cannot work without them.",
          "Storage on your device (your browser’s local storage) holds your encryption keys and message history. Clearing site data removes them.",
          "We do not use advertising or tracking cookies. [Confirm. If you add analytics, describe it here and ask for consent where needed.]",
        ],
      },
    ],
  },
  {
    id: "emergency",
    title: "In an emergency",
    blocks: [
      { p: "ilo is not monitored around the clock and is not an emergency service. If you or someone else is in immediate danger, call 112. For free emotional support at any hour, call Tele-MANAS on 14416 (1800-891-4416) or the KIRAN helpline on 1800-599-0019." },
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    blocks: [
      { p: "We may update this policy. If a change matters, we will tell you [in the app or by email] before it takes effect. The date at the top shows when it was last updated." },
    ],
  },
  {
    id: "contact",
    title: "Contact and complaints",
    blocks: [
      { p: "[Name and title], [email address], [postal address], [phone number]. We will acknowledge your message within [2 working days]." },
    ],
  },
];

export default function Page() {
  return (
    <LegalDoc
      title="Privacy policy"
      updated="[date]"
      intro="ilo helps students reach a counsellor on their own campus. This policy explains what information we collect, why we collect it, who can see it, how long we keep it, and the choices you have. If you are under 18, please read the section for children and teenagers, and share it with a parent or guardian."
      draft={DRAFT}
      sections={sections}
      other={{ href: "/terms", label: "Terms of use" }}
    />
  );
}
