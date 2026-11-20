export type Feeling = {
  id: string;
  label: string;
  text: string;
  start: { href: string; label: string };
};

export const FEELINGS: Feeling[] = [
  {
    id: "anxious",
    label: "Anxious",
    text: "Thoughts can speed up, and your body can feel tight or restless. Naming it is enough for this moment.",
    start: { href: "/self-check", label: "Try a 2-minute pause" },
  },
  {
    id: "low",
    label: "Low",
    text: "A low day can make ordinary tasks feel heavy. You don't have to explain it or fix it here.",
    start: { href: "/learn#low-days", label: "Read a short note on low days" },
  },
  {
    id: "overloaded",
    label: "Overloaded",
    text: "Too many deadlines at once can make everything feel equally urgent. One small next step is allowed.",
    start: { href: "/learn#workload", label: "Read about a crowded week" },
  },
  {
    id: "lonely",
    label: "Lonely",
    text: "You can be around people all day and still feel unseen. That doesn't mean you are doing campus wrong.",
    start: { href: "/messages", label: "Message your counsellor" },
  },
  {
    id: "angry",
    label: "Angry",
    text: "Anger often shows up when something felt unfair or too much. You can notice it without acting on it.",
    start: { href: "/self-check", label: "Try a 2-minute pause" },
  },
  {
    id: "numb",
    label: "Numb",
    text: "Feeling flat or far away can follow a long stretch of pressure. A blank feeling is still a feeling.",
    start: { href: "/learn#numb", label: "Read about feeling flat" },
  },
  {
    id: "homesick",
    label: "Homesick",
    text: "Missing home, food, or people who know you is common when a campus is new. It can sit beside doing well.",
    start: { href: "/learn#settling-in", label: "Read about settling in" },
  },
  {
    id: "unsure",
    label: "Not sure",
    text: "You don't need a precise name. 'Not sure' is a fine place to start, including with your counsellor.",
    start: { href: "/request", label: "Send a request" },
  },
];

export type Guide = { id: string; title: string; summary: string; body: string[] };

export const GUIDES: Guide[] = [
  {
    id: "viva",
    title: "Before a viva",
    summary: "When your mind goes blank just before you speak.",
    body: [
      "A viva asks you to talk about work you already did. Blankness in the first minute is common, and it usually eases once you hear your own voice.",
      "The night before, pick three things you can explain without notes: what you did, why you did it, and what you would change. Practise saying them out loud once.",
      "If you freeze in the room, it is fine to say you need a moment, take one breath, and start with the part you know best.",
    ],
  },
  {
    id: "roommate",
    title: "Sharing a room",
    summary: "Noise, guests, and the small things that pile up.",
    body: [
      "Most roommate friction is about sleep, mess, or guests, not about whether you like each other.",
      "One specific request works better than a general complaint. 'Can we keep lights low after 11?' is easier to hear than 'you are impossible'.",
      "If it feels unsafe, or a conversation has already gone badly, tell your counsellor. You don't have to sort a hostel conflict alone.",
    ],
  },
  {
    id: "perfectionism",
    title: "When good enough feels dangerous",
    summary: "Rewriting, delaying, and the fear of an ordinary mark.",
    body: [
      "Perfectionism often looks like working hard. Underneath, it can be the fear that one ordinary result says something final about you.",
      "For the next task, decide the finish line before you start: a time, or a version you will submit even if you could polish it again.",
      "A counsellor can help you tell the difference between care for the work and a standard no one could meet.",
    ],
  },
  {
    id: "placement",
    title: "Placement season",
    summary: "Tests, interviews, and other people's offers.",
    body: [
      "A placement cycle compresses a lot of judgment into a few weeks. Other people's news can make your own pace feel like failure.",
      "Keep the next application separate from the story about your whole future. One form, one interview, then a break you actually take.",
      "If sleep, food, or mood are slipping while you prepare, that is a reason to talk to your counsellor, not a reason to push harder.",
    ],
  },
  {
    id: "workload",
    title: "A crowded week",
    summary: "When every deadline looks like the most important one.",
    body: [
      "Write the deadlines that are actually this week. Circle the one that is due first, and give that one a block of time before you touch the rest.",
      "Tell one person the plan, even if it is just a message to your counsellor. A plan that stays in your head is easier to abandon at midnight.",
    ],
  },
  {
    id: "low-days",
    title: "Low days",
    summary: "When getting started is the hard part.",
    body: [
      "A low day is not a verdict on the semester. It can be sleep, a result, homesickness, or nothing you can name.",
      "Pick one small thing that would make the next hour kinder: water, a meal, a short walk, or a message. Then stop there.",
      "If low days are stacking up, or you are having thoughts of not wanting to be here, call Tele-MANAS on 14416 and tell your counsellor.",
    ],
  },
  {
    id: "numb",
    title: "Feeling flat",
    summary: "When you can't tell what you feel.",
    body: [
      "Numbness can follow a long stretch of pressure. It is not the same as being fine, and it is not a failure to 'open up'.",
      "You can tell your counsellor 'I feel flat and I don't know why'. That sentence is a complete starting point.",
    ],
  },
  {
    id: "settling-in",
    title: "Settling in",
    summary: "A new hostel, a new city, people who don't know you yet.",
    body: [
      "Missing home does not mean you chose the wrong college. The first months ask you to rebuild ordinary life from scratch.",
      "One regular thing helps: a meal, a call home, a class you sit in the same seat for. You don't have to make a whole social life this week.",
    ],
  },
];
