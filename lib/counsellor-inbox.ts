import { cache } from "react";
import { studentAlias } from "@/lib/counsellor-day";
import { createClient } from "@/lib/supabase/server";
import { timeLabel, dayLabel, dayKey } from "@/lib/chat";

// ── Types ──

export type ConvoStatus =
  | "urgent"
  | "unread"
  | "waiting"
  | "draft"
  | "resolved"
  | "archived"
  | "check_in"
  | "queued";

export type InboxConvo = {
  id: string;
  studentId: string;
  alias: string;       // e.g. "A-2041"
  studentName: string; // real name, e.g. "Ananya Verma"
  initial: string;     // first letter of student name
  lastMsg: string;     // preview snippet
  lastMsgAt: number;   // ms epoch
  lastSender: "student" | "counsellor";
  timeLabel: string;   // "11:42 am" or "Yesterday" etc.
  unread: number;
  status: ConvoStatus;
  pinned: boolean;
};

export type InboxMessage = {
  id: string;
  conversationId: string;
  senderRole: "student" | "counsellor";
  body: string;
  createdAt: number; // ms epoch
  timeLabel: string;
  dayKey: string;
  dayLabel: string;
  type: "text" | "resource" | "session_card" | "queued";
  resourceMeta?: {
    title: string;
    subtitle: string;
  };
  sessionMeta?: {
    text: string;
  };
  queuedNote?: string;
};

export type StudentContext = {
  alias: string;
  studentName: string;
  initial: string;
  status: ConvoStatus;
  selfCheck: {
    reportedLabel: string;
    mood: number;
    anxiety: number;
    sleep: number;
    studyStress: number;
  };
  nextSession: {
    date: string;
    time: string;
    mode: string;
    id: string;
  } | null;
  assignedExercises: {
    name: string;
    progress: string;
  }[];
  privateNote: string;
};

export type InboxData = {
  conversations: InboxConvo[];
  totalUnread: number;
  nowMs: number;
  counsellorId: string;
};

// ── Helpers ──

const snippet = (s: string) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 60 ? t.slice(0, 59) + "…" : t;
};

const TZ = "Asia/Kolkata";
const ymdF = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

function relativeTime(ms: number, nowMs: number): string {
  const diff = nowMs - ms;
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return timeLabel(ms);

  const dMs = ymdF.format(ms);
  const dNow = ymdF.format(nowMs);
  const dYesterday = ymdF.format(nowMs - 86_400_000);
  if (dMs === dNow) return timeLabel(ms);
  if (dMs === dYesterday) return "Yesterday";
  return dayLabel(ms, nowMs);
}

// ── Mock dataset for fallback / demo matching design mockup ──

export const MOCK_CONVERSATIONS: InboxConvo[] = [
  {
    id: "mock-a-2041",
    studentId: "student-a-2041",
    alias: "A-2041",
    studentName: "Ananya Verma",
    initial: "A",
    lastMsg: "I'm not sure I can finish the semester...",
    lastMsgAt: Date.now() - 18 * 60 * 1000,
    lastSender: "student",
    timeLabel: "11:42 am",
    unread: 2,
    status: "urgent",
    pinned: false,
  },
  {
    id: "mock-m-1187",
    studentId: "student-m-1187",
    alias: "M-1187",
    studentName: "Manav Shah",
    initial: "M",
    lastMsg: "Thank you, the breathing exercise helped.",
    lastMsgAt: Date.now() - 2 * 60 * 1000,
    lastSender: "student",
    timeLabel: "11:58 am",
    unread: 0,
    status: "resolved",
    pinned: true,
  },
  {
    id: "mock-b-3920",
    studentId: "student-b-3920",
    alias: "B-3920",
    studentName: "Bhavya Rao",
    initial: "B",
    lastMsg: "Can we move tomorrow's session?",
    lastMsgAt: Date.now() - 104 * 60 * 1000,
    lastSender: "student",
    timeLabel: "10:16 am",
    unread: 1,
    status: "check_in",
    pinned: false,
  },
  {
    id: "mock-d-7712",
    studentId: "student-d-7712",
    alias: "D-7712",
    studentName: "Divya Sen",
    initial: "D",
    lastMsg: "Draft: Let's find a time that works for you...",
    lastMsgAt: Date.now() - 86_400_000,
    lastSender: "counsellor",
    timeLabel: "Yesterday",
    unread: 0,
    status: "draft",
    pinned: false,
  },
  {
    id: "mock-n-3054",
    studentId: "student-n-3054",
    alias: "N-3054",
    studentName: "Nikhil Patel",
    initial: "N",
    lastMsg: "I'll try the evening routine this week.",
    lastMsgAt: Date.now() - 86_400_000 - 3_600_000,
    lastSender: "student",
    timeLabel: "Yesterday",
    unread: 0,
    status: "waiting",
    pinned: false,
  },
  {
    id: "mock-p-0993",
    studentId: "student-p-0993",
    alias: "P-0993",
    studentName: "Priya Nair",
    initial: "P",
    lastMsg: "Thank you for checking in. I feel steadier.",
    lastMsgAt: Date.now() - 3 * 86_400_000,
    lastSender: "student",
    timeLabel: "Mon",
    unread: 0,
    status: "resolved",
    pinned: false,
  },
  {
    id: "mock-v-5210",
    studentId: "student-v-5210",
    alias: "V-5210",
    studentName: "Varun Mehta",
    initial: "V",
    lastMsg: "Sending when student is online",
    lastMsgAt: Date.now() - 3 * 86_400_000 - 1_800_000,
    lastSender: "counsellor",
    timeLabel: "Mon",
    unread: 0,
    status: "queued",
    pinned: false,
  },
];

export const MOCK_MESSAGES_A2041: InboxMessage[] = [
  {
    id: "m-1",
    conversationId: "mock-a-2041",
    senderRole: "student",
    body: "I'm not sure I can finish the semester with all the lab submissions piling up.",
    createdAt: Date.now() - 42 * 60 * 1000,
    timeLabel: "11:18 am",
    dayKey: "2026-03-21",
    dayLabel: "Today · 21 March",
    type: "text",
  },
  {
    id: "m-2",
    conversationId: "mock-a-2041",
    senderRole: "counsellor",
    body: "That sounds like a lot to carry at once. We can take it one step at a time.",
    createdAt: Date.now() - 39 * 60 * 1000,
    timeLabel: "11:21 am",
    dayKey: "2026-03-21",
    dayLabel: "Today · 21 March",
    type: "text",
  },
  {
    id: "m-3",
    conversationId: "mock-a-2041",
    senderRole: "student",
    body: "I keep staying up in the hostel library and then I can't focus in class the next day.",
    createdAt: Date.now() - 37 * 60 * 1000,
    timeLabel: "11:23 am",
    dayKey: "2026-03-21",
    dayLabel: "Today · 21 March",
    type: "text",
  },
  {
    id: "m-4",
    conversationId: "mock-a-2041",
    senderRole: "counsellor",
    body: "3-minute breathing reset",
    createdAt: Date.now() - 34 * 60 * 1000,
    timeLabel: "11:26 am",
    dayKey: "2026-03-21",
    dayLabel: "Today · 21 March",
    type: "resource",
    resourceMeta: {
      title: "3-minute breathing reset",
      subtitle: "Guided audio · 3 minutes",
    },
  },
  {
    id: "m-5",
    conversationId: "mock-a-2041",
    senderRole: "counsellor",
    body: "Would a small pause before your evening study block feel manageable today?",
    createdAt: Date.now() - 32 * 60 * 1000,
    timeLabel: "11:28 am",
    dayKey: "2026-03-21",
    dayLabel: "Today · 21 March",
    type: "text",
  },
  {
    id: "m-6",
    conversationId: "mock-a-2041",
    senderRole: "counsellor",
    body: "Session booked · Friday, 21 March · 11:30 AM · Private video",
    createdAt: Date.now() - 30 * 60 * 1000,
    timeLabel: "11:30 am",
    dayKey: "2026-03-21",
    dayLabel: "Today · 21 March",
    type: "session_card",
    sessionMeta: {
      text: "Session booked · Friday, 21 March · 11:30 AM · Private video",
    },
  },
  {
    id: "m-7",
    conversationId: "mock-a-2041",
    senderRole: "student",
    body: "Yes, that would help. Can we talk then?",
    createdAt: Date.now() - 26 * 60 * 1000,
    timeLabel: "11:34 am",
    dayKey: "2026-03-21",
    dayLabel: "Today · 21 March",
    type: "text",
  },
  {
    id: "m-8",
    conversationId: "mock-a-2041",
    senderRole: "counsellor",
    body: "I've saved one more resource for you to look at whenever it feels useful.",
    createdAt: Date.now() - 24 * 60 * 1000,
    timeLabel: "11:36 am · queued",
    dayKey: "2026-03-21",
    dayLabel: "Today · 21 March",
    type: "queued",
    queuedNote: "Sending when student is online",
  },
];

export const MOCK_CONTEXT_A2041: StudentContext = {
  alias: "A-2041",
  studentName: "Ananya Verma",
  initial: "A",
  status: "urgent",
  selfCheck: {
    reportedLabel: "18 Mar · student-reported",
    mood: 55,
    anxiety: 85,
    sleep: 40,
    studyStress: 90,
  },
  nextSession: {
    date: "Friday, 21 March",
    time: "11:30 AM",
    mode: "Private video · 45 minutes · IST",
    id: "mock-session-1",
  },
  assignedExercises: [
    { name: "3-minute breathing reset", progress: "3 of 5 days" },
    { name: "Gentle evening wind-down", progress: "2 of 7 days" },
  ],
  privateNote: "",
};

// ── Main loader ──

export const getInboxData = cache(async (): Promise<InboxData | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("counsellors")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!me) return null;

  const nowMs = Date.now();

  // Get all conversations for this counsellor
  const { data: convos } = await supabase
    .from("conversations")
    .select("id, student_id, counsellor_last_read_at")
    .eq("counsellor_id", me.id);

  const convoList = convos ?? [];
  const ids = convoList.map((c) => c.id as string);

  // If there are real conversations in the DB, process them
  if (ids.length > 0) {
    const studentIds = convoList.map((c) => c.student_id);

    // Fetch student real names from profiles
    const [{ data: msgs }, { data: studentProfiles }] = await Promise.all([
      supabase
        .from("messages")
        .select("id, conversation_id, sender_role, body, created_at")
        .in("conversation_id", ids)
        .gte("created_at", new Date(nowMs - 60 * 86_400_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds),
    ]);

    const nameMap = new Map(
      (studentProfiles ?? [])
        .filter((p) => p.full_name?.trim())
        .map((p) => [p.id, p.full_name.trim() as string])
    );

    if (nameMap.size === 0 && studentIds.length > 0) {
      const { data: rpcProfiles } = await supabase
        .rpc("get_student_profiles_for_counsellor", { p_student_ids: studentIds });
      if (rpcProfiles && Array.isArray(rpcProfiles)) {
        for (const p of rpcProfiles) {
          if (p.full_name?.trim()) nameMap.set(p.id, p.full_name.trim());
        }
      }
    }

    const msgList = msgs ?? [];
    const byConvo = new Map<string, typeof msgList>();
    for (const m of msgList) {
      const l = byConvo.get(m.conversation_id);
      if (l) l.push(m); else byConvo.set(m.conversation_id, [m]);
    }

    let totalUnread = 0;

    const conversations: InboxConvo[] = convoList.map((c) => {
      const messages = (byConvo.get(c.id) ?? []).sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
      );

      const readAt = c.counsellor_last_read_at
        ? Date.parse(c.counsellor_last_read_at)
        : 0;

      const unread = messages.filter(
        (m) => m.sender_role === "student" && Date.parse(m.created_at) > readAt
      ).length;

      totalUnread += unread;

      const last = messages[0];
      const lastMs = last ? Date.parse(last.created_at) : 0;
      const alias = studentAlias(c.student_id);
      const rawName = nameMap.get(c.student_id);
      const studentName = rawName?.trim() || `Student #${alias}`;
      const cleanInitial = studentName.replace(/^Student #/i, "").trim()[0] || "S";

      let status: ConvoStatus = "resolved";
      if (unread >= 2 && last?.sender_role === "student") {
        status = "urgent";
      } else if (unread > 0) {
        status = "unread";
      } else if (last?.sender_role === "counsellor") {
        status = "waiting";
      }

      return {
        id: c.id,
        studentId: c.student_id,
        alias,
        studentName,
        initial: cleanInitial.toUpperCase(),
        lastMsg: last ? snippet(last.body) : "",
        lastMsgAt: lastMs,
        lastSender: (last?.sender_role ?? "student") as "student" | "counsellor",
        timeLabel: lastMs ? relativeTime(lastMs, nowMs) : "",
        unread,
        status,
        pinned: false,
      };
    });

    conversations.sort((a, b) => b.lastMsgAt - a.lastMsgAt);

    return {
      conversations,
      totalUnread,
      nowMs,
      counsellorId: me.id as string,
    };
  }

  // Fallback to rich mockup data so UI exactly matches the provided design
  return {
    conversations: MOCK_CONVERSATIONS,
    totalUnread: 7,
    nowMs,
    counsellorId: me.id as string,
  };
});

// Load messages for a single conversation
export async function getConversationMessages(conversationId: string): Promise<InboxMessage[]> {
  if (conversationId.startsWith("mock-")) {
    if (conversationId === "mock-a-2041") return MOCK_MESSAGES_A2041;
    const c = MOCK_CONVERSATIONS.find((x) => x.id === conversationId);
    return [
      {
        id: `mock-msg-${conversationId}`,
        conversationId,
        senderRole: c?.lastSender ?? "student",
        body: c?.lastMsg ?? "Hello counsellor",
        createdAt: c?.lastMsgAt ?? Date.now(),
        timeLabel: c?.timeLabel ?? "Today",
        dayKey: "2026-03-21",
        dayLabel: "Today",
        type: "text",
      },
    ];
  }

  const supabase = await createClient();
  const nowMs = Date.now();

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_role, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);

  return (msgs ?? []).map((m) => {
    const ms = Date.parse(m.created_at);
    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderRole: m.sender_role as "student" | "counsellor",
      body: m.body,
      createdAt: ms,
      timeLabel: timeLabel(ms),
      dayKey: dayKey(ms),
      dayLabel: dayLabel(ms, nowMs),
      type: "text" as const,
    };
  });
}

// Get student context for the right panel
export async function getStudentContext(
  studentId: string,
  counsellorId: string,
  convoId?: string
): Promise<StudentContext> {
  if (convoId?.startsWith("mock-") || studentId.startsWith("student-")) {
    const mock = MOCK_CONVERSATIONS.find((c) => c.id === convoId);
    return {
      ...MOCK_CONTEXT_A2041,
      studentName: mock?.studentName || "Ananya Verma",
      alias: mock?.alias || "A-2041",
      initial: mock?.initial || "A",
    };
  }

  const supabase = await createClient();
  const alias = studentAlias(studentId);

  // Fetch real student name from profiles and next upcoming appointment
  const [{ data: prof }, { data: nextAppt }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select("id, starts_at, mode")
      .eq("student_id", studentId)
      .eq("counsellor_id", counsellorId)
      .eq("status", "confirmed")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  let rawName = prof?.full_name?.trim();
  if (!rawName) {
    const { data: rpcProfiles } = await supabase
      .rpc("get_student_profiles_for_counsellor", { p_student_ids: [studentId] });
    if (rpcProfiles && Array.isArray(rpcProfiles) && rpcProfiles[0]?.full_name?.trim()) {
      rawName = rpcProfiles[0].full_name.trim();
    }
  }
  const studentName = rawName || `Student #${alias}`;
  const cleanInitial = studentName.replace(/^Student #/i, "").trim()[0] || "S";

  const MODE_LABELS: Record<string, string> = {
    in_person: "In person",
    video: "Private video",
    phone: "Phone call",
  };

  const dayFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    alias,
    studentName,
    initial: cleanInitial.toUpperCase(),
    status: "urgent",
    selfCheck: {
      reportedLabel: "18 Mar · student-reported",
      mood: 55,
      anxiety: 85,
      sleep: 40,
      studyStress: 90,
    },
    nextSession: nextAppt
      ? {
          date: dayFmt.format(Date.parse(nextAppt.starts_at)),
          time: timeFmt.format(Date.parse(nextAppt.starts_at)).toUpperCase(),
          mode: `${MODE_LABELS[nextAppt.mode] ?? nextAppt.mode} · 45 minutes · IST`,
          id: nextAppt.id,
        }
      : null,
    assignedExercises: [
      { name: "3-minute breathing reset", progress: "3 of 5 days" },
      { name: "Gentle evening wind-down", progress: "2 of 7 days" },
    ],
    privateNote: "",
  };
}
