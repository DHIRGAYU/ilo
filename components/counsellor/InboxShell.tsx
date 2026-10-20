"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search, MoreHorizontal, Pin, Phone, Video, ShieldAlert,
  Paperclip, Bookmark, Mic, Send, Lock, CheckCheck,
  Calendar, Clock, ExternalLink, Smile, ChevronRight,
  Headphones, Moon, PanelRightClose, PanelRightOpen,
} from "lucide-react";
import type { InboxConvo, InboxMessage, StudentContext, ConvoStatus } from "@/lib/counsellor-inbox";
import { createClient } from "@/lib/supabase/client";

// ── Constants & Helpers ──

const STATUS_LABEL: Record<ConvoStatus, string> = {
  urgent: "Urgent",
  unread: "Unread",
  waiting: "Waiting on student",
  draft: "Draft",
  resolved: "Resolved",
  archived: "Archived",
  check_in: "Check in",
  queued: "Queued",
};

const STATUS_CLASSES: Record<ConvoStatus, string> = {
  urgent: "bg-red-50 text-red-600 font-semibold ring-1 ring-red-200/50",
  unread: "bg-purple-50 text-ilo-plum font-semibold ring-1 ring-ilo-plum/15",
  waiting: "bg-emerald-50 text-emerald-700 font-semibold ring-1 ring-emerald-200/50",
  draft: "bg-stone-100 text-stone-600 font-semibold ring-1 ring-stone-200/50",
  resolved: "bg-stone-100 text-stone-500 font-semibold ring-1 ring-stone-200/50",
  archived: "bg-gray-100 text-gray-500 font-semibold ring-1 ring-gray-200",
  check_in: "bg-stone-100 text-stone-700 font-semibold ring-1 ring-stone-200/50",
  queued: "bg-amber-50 text-amber-700 font-semibold ring-1 ring-amber-200/50",
};

const AVATAR_COLORS = [
  "bg-[#F3E8F0] text-ilo-plum",
  "bg-[#FEF3C7] text-amber-800",
  "bg-[#E0F2FE] text-sky-800",
  "bg-[#DCFCE7] text-emerald-800",
  "bg-[#FFE4E6] text-rose-800",
  "bg-[#EDE9FE] text-violet-800",
  "bg-[#CCFBF1] text-teal-800",
  "bg-[#FFEDD5] text-orange-800",
];

function avatarColor(initial: string) {
  const code = initial ? initial.charCodeAt(0) : 65;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

type FilterTab = "all" | "unread" | "urgent" | "waiting" | "archived";
const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "urgent", label: "Urgent" },
  { key: "waiting", label: "Waiting" },
  { key: "archived", label: "Archived" },
];

const QUICK_REPLIES = [
  "I hear you.",
  "One step at a time.",
  "Let's find a time.",
];

function StatusBadge({ status }: { status: ConvoStatus }) {
  if (status === "resolved") {
    return (
      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-stone-100 text-stone-600">
        Resolved
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] ${STATUS_CLASSES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── Left panel: Conversation List ──

function ConvoListItem({
  convo,
  active,
  onClick,
}: {
  convo: InboxConvo;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-all ${
        active
          ? "border-l-4 border-l-ilo-plum bg-[#F9F5F8] shadow-sm ring-1 ring-ilo-plum/10"
          : "hover:bg-black/[0.02]"
      }`}
    >
      {/* Avatar */}
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(
          convo.initial
        )}`}
      >
        {convo.initial}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 truncate">
            <span className="truncate text-xs font-bold text-ilo-deep">
              {convo.studentName || `Student #${convo.alias}`}
            </span>
            {convo.pinned && (
              <Pin className="h-3 w-3 shrink-0 text-ilo-plum rotate-45" fill="currentColor" />
            )}
          </div>
          <span className="shrink-0 text-[10px] text-stone-400">
            {convo.timeLabel}
          </span>
        </div>

        <p className="mt-0.5 truncate text-[11px] leading-snug text-stone-600">
          {convo.lastMsg}
        </p>

        <div className="mt-1.5 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={convo.status} />
            {convo.lastSender === "counsellor" && (
              <CheckCheck className="h-3.5 w-3.5 text-stone-400" />
            )}
          </div>

          {convo.unread > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#381630] px-1 text-[10px] font-bold text-white">
              {convo.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ConversationList({
  conversations,
  totalUnread,
  activeId,
  onSelect,
}: {
  conversations: InboxConvo[];
  totalUnread: number;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = conversations;
    if (filter === "unread") list = list.filter((c) => c.unread > 0);
    else if (filter === "urgent") list = list.filter((c) => c.status === "urgent");
    else if (filter === "waiting") list = list.filter((c) => c.status === "waiting");
    else if (filter === "archived") list = list.filter((c) => c.status === "archived");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          (c.studentName && c.studentName.toLowerCase().includes(q)) ||
          c.alias.toLowerCase().includes(q) ||
          c.lastMsg.toLowerCase().includes(q)
      );
    }
    return list;
  }, [conversations, filter, search]);

  return (
    <div className="flex h-full flex-col border-r border-ilo-plum/10 bg-white">
      {/* Header */}
      <div className="shrink-0 px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl text-ilo-deep">Inbox</h1>
          {totalUnread > 0 && (
            <span className="flex items-center rounded-full bg-[#F3E8F0] px-2.5 py-0.5 text-[11px] font-bold text-ilo-plum">
              {totalUnread} unread
            </span>
          )}
        </div>

        {/* Search */}
        <label className="mt-3 flex h-9 items-center gap-2 rounded-xl border border-ilo-plum/10 bg-ilo-bg px-3 text-xs text-stone-400">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            type="text"
            placeholder="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-ilo-ink outline-none placeholder:text-stone-400"
          />
        </label>

        {/* Filter Pills */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map((t) => {
            const isActive = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#381630] text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversations Section Title */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
          Conversations
        </p>
        <button type="button" className="p-1 text-stone-400 hover:text-stone-700">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4 scrollbar-hide">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-stone-400">
            {search ? "No matching conversations." : "No conversations in this filter."}
          </p>
        ) : (
          filtered.map((c) => (
            <ConvoListItem
              key={c.id}
              convo={c}
              active={c.id === activeId}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Middle panel: Chat Thread ──

function MessageBubble({ msg, isOwn }: { msg: InboxMessage; isOwn: boolean }) {
  if (msg.type === "resource") {
    return (
      <div className="flex justify-end">
        <div className="max-w-sm rounded-2xl border border-ilo-plum/15 bg-white p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F3E8F0] text-ilo-plum">
              <Headphones className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ilo-deep">
                {msg.resourceMeta?.title ?? msg.body}
              </p>
              <p className="text-[11px] text-stone-500">
                {msg.resourceMeta?.subtitle ?? "Guided audio · 3 minutes"}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-stone-400 hover:text-ilo-plum cursor-pointer" />
          </div>
          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-[10px] text-stone-400">{msg.timeLabel}</span>
            <CheckCheck className="h-3.5 w-3.5 text-ilo-plum/60" />
          </div>
        </div>
      </div>
    );
  }

  if (msg.type === "session_card") {
    return (
      <div className="my-2 flex justify-center">
        <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-4 py-2 text-xs text-stone-700 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-ilo-plum" />
          <span>{msg.sessionMeta?.text ?? msg.body}</span>
        </div>
      </div>
    );
  }

  if (msg.type === "queued") {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
          <Clock className="h-3 w-3" />
          <span>{msg.queuedNote ?? "Sending when student is online"}</span>
        </div>
        <div className="max-w-[75%] rounded-2xl bg-[#381630] px-4 py-2.5 text-white shadow-sm">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.body}</p>
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/60">
            <span>{msg.timeLabel}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isOwn
            ? "bg-[#381630] text-white shadow-sm"
            : "border border-stone-200/70 bg-white text-stone-800 shadow-sm"
        }`}
      >
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.body}</p>
        <div className={`mt-1 flex items-center gap-1 ${isOwn ? "justify-end text-white/60" : "justify-start text-stone-400"}`}>
          <span className="text-[10px]">{msg.timeLabel}</span>
          {isOwn && <CheckCheck className="h-3.5 w-3.5 text-white/60" />}
        </div>
      </div>
    </div>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="h-px flex-1 bg-stone-200/80" />
      <span className="text-[11px] font-medium text-stone-400">
        {label}
      </span>
      <span className="h-px flex-1 bg-stone-200/80" />
    </div>
  );
}

function ChatThread({
  convo,
  messages,
  onSend,
  sendError,
  onClearError,
}: {
  convo: InboxConvo;
  messages: InboxMessage[];
  onSend: (text: string) => void;
  sendError?: string | null;
  onClearError?: () => void;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const grouped = useMemo(() => {
    const groups: { dayLabel: string; messages: InboxMessage[] }[] = [];
    let lastKey = "";
    for (const m of messages) {
      if (m.dayKey !== lastKey) {
        groups.push({ dayLabel: m.dayLabel, messages: [] });
        lastKey = m.dayKey;
      }
      groups[groups.length - 1].messages.push(m);
    }
    return groups;
  }, [messages]);

  return (
    <div className="flex h-full flex-col bg-[#FAF8F9]">
      {/* Chat header */}
      <div className="flex shrink-0 items-center justify-between border-b border-ilo-plum/10 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(
              convo.initial
            )}`}
          >
            {convo.initial}
          </span>
          <div>
            <h2 className="text-sm font-bold text-ilo-deep">
              {convo.studentName || `Student #${convo.alias}`}
            </h2>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active conversation
              </span>
              <StatusBadge status={convo.status} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Phone className="h-3.5 w-3.5 text-stone-500" /> Call
          </button>
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5 text-stone-500" /> Book session
          </button>
          <button
            type="button"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200/80 bg-white px-3 text-xs font-semibold text-red-600 hover:bg-red-50/50 transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-red-500" /> Escalate
          </button>
        </div>
      </div>

      {/* Privacy banner */}
      <div className="flex shrink-0 items-center justify-between border-b border-ilo-plum/5 bg-[#F9F6F8] px-5 py-2 text-[11px] text-stone-500">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-stone-400" />
          <span>
            <strong className="font-semibold text-stone-700">End-to-end encrypted</strong> Messages are stored on your device
          </span>
        </div>
        <span className="text-stone-400">Private to you</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-400">
            <Smile className="h-8 w-8" />
            <p className="text-xs">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.dayLabel}>
              <DaySeparator label={g.dayLabel} />
              <div className="space-y-3">
                {g.messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    isOwn={m.senderRole === "counsellor"}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Replies */}
      <div className="flex shrink-0 items-center gap-2 border-t border-ilo-plum/5 bg-white px-5 pt-3">
        {QUICK_REPLIES.map((qr) => (
          <button
            key={qr}
            type="button"
            onClick={() => onSend(qr)}
            className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-600 transition-colors hover:border-ilo-plum hover:text-ilo-plum"
          >
            {qr}
          </button>
        ))}
      </div>

      {/* Send Error Banner */}
      {sendError && (
        <div className="mx-5 mb-1 flex items-center justify-between rounded-xl bg-amber-50 px-3.5 py-2 text-xs text-amber-900 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-800">Action required:</span>
            <span>{sendError}</span>
          </div>
          <button
            type="button"
            onClick={onClearError}
            className="text-stone-400 hover:text-stone-700 font-bold ml-2 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Message Input Box */}
      <div className="shrink-0 bg-white px-5 pb-4 pt-2">
        <div className="rounded-2xl border border-stone-200 bg-[#FAF8F9] p-3 shadow-sm focus-within:border-ilo-plum/30">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Write a private message…"
            rows={2}
            className="w-full resize-none bg-transparent text-xs text-stone-800 outline-none placeholder:text-stone-400 leading-relaxed"
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-400">
              <button type="button" title="Attach file" className="p-1 hover:text-stone-600 transition-colors">
                <Paperclip className="h-4 w-4" />
              </button>
              <button type="button" title="Saved notes" className="p-1 hover:text-stone-600 transition-colors">
                <Bookmark className="h-4 w-4" />
              </button>
              <button type="button" title="Voice memo" className="p-1 hover:text-stone-600 transition-colors">
                <Mic className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex h-8 items-center gap-1.5 rounded-full bg-[#381630] px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#4E1E44] disabled:opacity-40 disabled:hover:bg-[#381630]"
            >
              <Send className="h-3 w-3" /> Send
            </button>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-stone-400">
          Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}

// ── Right panel: Student Context ──

function StudentContextPanel({
  convo,
  context,
  onToggle,
}: {
  convo: InboxConvo;
  context: StudentContext | null;
  onToggle?: () => void;
}) {
  const [note, setNote] = useState(context?.privateNote ?? "");

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white border-l border-ilo-plum/10 scrollbar-hide">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-ilo-plum/10 px-5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
          Student context
        </p>
        <button
          type="button"
          onClick={onToggle}
          title="Toggle panel"
          className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 p-5">
        {/* Case Snapshot Card */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Case snapshot
            </p>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(
                convo.initial
              )}`}
            >
              {convo.initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ilo-deep">
                {context?.studentName ?? convo.studentName ?? `Student #${convo.alias}`}
              </p>
              <p className="text-[10px] text-stone-400">Student</p>
            </div>
            <StatusBadge status={context?.status ?? convo.status} />
          </div>

          {/* Self-check sliders */}
          <div className="mt-4 space-y-2.5 border-t border-stone-100 pt-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-stone-700">Last self-check</span>
              <span className="text-[10px] text-stone-400">
                {context?.selfCheck?.reportedLabel ?? "18 Mar · student-reported"}
              </span>
            </div>

            {[
              { label: "Mood", pct: context?.selfCheck?.mood ?? 55 },
              { label: "Anxiety", pct: context?.selfCheck?.anxiety ?? 85 },
              { label: "Sleep", pct: context?.selfCheck?.sleep ?? 40 },
              { label: "Study stress", pct: context?.selfCheck?.studyStress ?? 90 },
            ].map((bar) => (
              <div key={bar.label} className="space-y-1">
                <div className="flex justify-between text-[10px] text-stone-500">
                  <span>{bar.label}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <div
                    className="h-full rounded-full bg-[#521C42] transition-all"
                    style={{ width: `${bar.pct}%` }}
                  />
                </div>
              </div>
            ))}

            <p className="pt-1 text-[10px] italic text-stone-400">
              Not a diagnosis · self-check is a reflection tool
            </p>
          </div>
        </div>

        {/* Next Session Card */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400">
            <span>Next session</span>
            <span className="flex items-center gap-1 font-normal text-stone-400">
              <Lock className="h-3 w-3" /> Private
            </span>
          </div>

          {context?.nextSession ? (
            <div className="mt-3">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-ilo-plum">
                  <Video className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-ilo-deep">
                    {context.nextSession.date} · {context.nextSession.time}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    {context.nextSession.mode}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="mt-3 text-[11px] font-semibold text-ilo-plum hover:underline"
              >
                Reschedule
              </button>
            </div>
          ) : (
            <p className="mt-3 text-xs text-stone-400">No upcoming session scheduled.</p>
          )}
        </div>

        {/* Assigned Exercises Card */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Assigned exercises
          </p>
          <div className="mt-3 space-y-3">
            {[
              {
                name: "3-minute breathing reset",
                progress: "3 of 5 days",
                icon: Headphones,
              },
              {
                name: "Gentle evening wind-down",
                progress: "2 of 7 days",
                icon: Moon,
              },
            ].map((ex) => {
              const Icon = ex.icon;
              return (
                <div key={ex.name} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3E8F0] text-ilo-plum">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ilo-deep">
                      {ex.name}
                    </p>
                    <p className="text-[10px] text-stone-400">{ex.progress}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Private Notes Card */}
        <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-stone-400">
            <span>Private notes</span>
            <span className="flex items-center gap-1 font-normal text-stone-400">
              <Lock className="h-3 w-3" /> Only you can see this
            </span>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A thought for the next check-in…"
            rows={3}
            className="mt-3 w-full resize-none rounded-xl border border-stone-200 bg-[#FAF8F9] p-2.5 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-ilo-plum/30 leading-relaxed"
          />

          <div className="mt-2 flex items-center gap-1 text-[10px] text-stone-400">
            <Lock className="h-3 w-3" />
            <span>Never visible to campus administrators</span>
          </div>
        </div>

        {/* Open Case File Button */}
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs font-semibold text-stone-700 transition-colors hover:border-ilo-plum/30 hover:text-ilo-plum shadow-sm"
        >
          <span>Open full case file</span>
          <ChevronRight className="h-4 w-4 text-stone-400" />
        </button>
      </div>
    </div>
  );
}

export function InboxShell({
  conversations: initialConvos,
  totalUnread: initialTotalUnread,
  nowMs,
  counsellorId,
  initialMessages,
  initialContext,
  initialConvoId,
}: {
  conversations: InboxConvo[];
  totalUnread: number;
  nowMs: number;
  counsellorId: string;
  initialMessages: InboxMessage[];
  initialContext: StudentContext | null;
  initialConvoId: string | null;
}) {
  const [conversations, setConversations] = useState<InboxConvo[]>(initialConvos);
  const [totalUnread, setTotalUnread] = useState(initialTotalUnread);
  const [activeId, setActiveId] = useState<string | null>(initialConvoId);
  const [messages, setMessages] = useState<InboxMessage[]>(initialMessages);
  const [context, setContext] = useState<StudentContext | null>(initialContext);
  const [loading, setLoading] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);

  const activeConvo = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0] ?? null,
    [conversations, activeId]
  );

  // Sync activeId if default was selected
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
    }
  }, [activeId, conversations]);

  // Mark a conversation as read locally and persist to database
  const markAsRead = useCallback(async (id: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          if (c.unread > 0) {
            setTotalUnread((t) => Math.max(0, t - c.unread));
          }
          return {
            ...c,
            unread: 0,
            status: c.lastSender === "counsellor" ? "waiting" : "resolved",
          };
        }
        return c;
      })
    );

    try {
      await fetch("/counsellor/inbox/api", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      });
    } catch {
      // Ignore network errors on read sync
    }
  }, []);

  // On mount or when activeId changes, ensure unread status is cleared
  useEffect(() => {
    if (activeId) {
      const c = conversations.find((x) => x.id === activeId);
      if (c && (c.unread > 0 || c.status === "unread")) {
        markAsRead(activeId);
      }
    }
  }, [activeId, conversations, markAsRead]);

  // Refetch helper to pull latest messages for active conversation
  const refetchActiveMessages = useCallback(async (convoId: string) => {
    if (!convoId || convoId.startsWith("mock-")) return;
    try {
      const res = await fetch(`/counsellor/inbox/api?convoId=${convoId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages((cur) => {
            if (data.messages.length === 0 && cur.length === 0) return cur;
            if (
              data.messages.length !== cur.length ||
              data.messages[data.messages.length - 1]?.id !== cur[cur.length - 1]?.id
            ) {
              return data.messages;
            }
            return cur;
          });

          // Update snippet in left conversation list
          const lastServerMsg = data.messages[data.messages.length - 1];
          if (lastServerMsg) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convoId
                  ? {
                      ...c,
                      lastMsg: lastServerMsg.body,
                      lastMsgAt: lastServerMsg.createdAt,
                      timeLabel: lastServerMsg.timeLabel,
                      lastSender: lastServerMsg.senderRole,
                    }
                  : c
              )
            );
          }
        }
      }
    } catch {
      // Ignore background sync errors
    }
  }, []);

  // Poll every 2.5s and on visibility change to guarantee updates without manual refresh
  useEffect(() => {
    if (!activeId || activeId.startsWith("mock-")) return;

    refetchActiveMessages(activeId);

    const interval = setInterval(() => {
      refetchActiveMessages(activeId);
    }, 2500);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refetchActiveMessages(activeId);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [activeId, refetchActiveMessages]);

  // Realtime Supabase updates via WebSocket
  useEffect(() => {
    if (!activeId || activeId.startsWith("mock-")) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-realtime-${activeId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            conversation_id: string;
            sender_role: "student" | "counsellor";
            body: string;
            created_at: string;
          };

          if (newMsg && newMsg.conversation_id === activeId) {
            const ms = Date.parse(newMsg.created_at);
            const formatted: InboxMessage = {
              id: newMsg.id,
              conversationId: newMsg.conversation_id,
              senderRole: newMsg.sender_role,
              body: newMsg.body,
              createdAt: ms,
              timeLabel: "just now",
              dayKey: new Date().toISOString().slice(0, 10),
              dayLabel: "Today",
              type: "text",
            };

            setMessages((cur) => {
              if (cur.some((m) => m.id === formatted.id)) return cur;
              const matchingTemp = cur.find(
                (m) =>
                  m.id.startsWith("tmp-") &&
                  m.body === formatted.body &&
                  m.senderRole === formatted.senderRole
              );
              if (matchingTemp) {
                return cur.map((m) => (m.id === matchingTemp.id ? formatted : m));
              }
              return [...cur, formatted];
            });

            // Update conversation list snippet
            setConversations((prev) =>
              prev.map((c) =>
                c.id === activeId
                  ? {
                      ...c,
                      lastMsg: newMsg.body,
                      lastMsgAt: ms,
                      timeLabel: "just now",
                      lastSender: newMsg.sender_role,
                    }
                  : c
              )
            );
          } else if (newMsg && newMsg.conversation_id) {
            // New message in another conversation
            const ms = Date.parse(newMsg.created_at);
            setConversations((prev) =>
              prev.map((c) =>
                c.id === newMsg.conversation_id
                  ? {
                      ...c,
                      lastMsg: newMsg.body,
                      lastMsgAt: ms,
                      timeLabel: "just now",
                      lastSender: newMsg.sender_role,
                      unread: c.unread + 1,
                      status: "unread",
                    }
                  : c
              )
            );
            setTotalUnread((t) => t + 1);
          }
        }
      )
      .subscribe((status, err) => {
        if (err) console.warn("Supabase Realtime subscription status:", status, err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId]);

  const handleSelect = useCallback(
    async (id: string) => {
      markAsRead(id);
      if (id === activeId) return;
      setActiveId(id);
      setLoading(true);

      try {
        const res = await fetch(`/counsellor/inbox/api?convoId=${id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages ?? []);
          setContext(data.context ?? null);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoading(false);
      }
    },
    [activeId, markAsRead]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!activeId) return;

      const clientId = `tmp-${Date.now()}`;
      const optimistic: InboxMessage = {
        id: clientId,
        conversationId: activeId,
        senderRole: "counsellor",
        body: text,
        createdAt: Date.now(),
        timeLabel: "just now",
        dayKey: new Date().toISOString().slice(0, 10),
        dayLabel: "Today",
        type: "text",
      };

      // 1. Optimistically append message
      setMessages((prev) => [...prev, optimistic]);

      // 2. Update conversation preview snippet in list & set status to "waiting"
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                lastMsg: text,
                lastMsgAt: Date.now(),
                timeLabel: "just now",
                lastSender: "counsellor",
                unread: 0,
                status: "waiting",
              }
            : c
        )
      );

      try {
        const res = await fetch("/counsellor/inbox/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: activeId, body: text }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn("Backend response on send:", data);
          if (data.hint) {
            setSendError(data.hint);
          }
        } else if (data.messageId) {
          setSendError(null);
          // Replace temporary id with real id from DB
          setMessages((prev) =>
            prev.map((m) => (m.id === clientId ? { ...m, id: data.messageId } : m))
          );
        }
      } catch (err) {
        console.warn("Network error sending message:", err);
      }
    },
    [activeId]
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden bg-white">
      {/* 1. Left Panel: Conversation List */}
      <div className="w-80 shrink-0">
        <ConversationList
          conversations={conversations}
          totalUnread={totalUnread}
          activeId={activeId}
          onSelect={handleSelect}
        />
      </div>

      {/* 2. Middle Panel: Chat Thread */}
      <div className="flex-1 min-w-0 border-r border-ilo-plum/10 flex flex-col">
        {activeConvo ? (
          loading ? (
            <div className="flex h-full items-center justify-center bg-[#FAF8F9]">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-ilo-plum/20 border-t-ilo-plum" />
                <p className="text-xs text-stone-400">Loading messages…</p>
              </div>
            </div>
          ) : (
            <ChatThread
              convo={activeConvo}
              messages={messages}
              onSend={handleSend}
              sendError={sendError}
              onClearError={() => setSendError(null)}
            />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#FAF8F9] px-6 text-center text-stone-400">
            <Smile className="h-8 w-8" />
            <h2 className="text-base font-bold text-ilo-deep">Select a conversation</h2>
            <p className="max-w-xs text-xs">
              Pick a conversation from the left to read and reply to students.
            </p>
          </div>
        )}
      </div>

      {/* 3. Right Panel: Student Context */}
      {showRightPanel ? (
        <div className="hidden w-80 shrink-0 xl:block">
          {activeConvo ? (
            <StudentContextPanel
              convo={activeConvo}
              context={context}
              onToggle={() => setShowRightPanel(false)}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-stone-400 text-xs">
              Select a conversation to see student context.
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowRightPanel(true)}
          title="Open student context"
          className="hidden xl:flex h-10 w-10 shrink-0 items-center justify-center rounded-l-xl border border-r-0 border-stone-200 bg-white text-stone-500 hover:text-stone-800 self-start mt-3 shadow-sm"
        >
          <PanelRightOpen className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
