"use client";

import { Pin, Search, Sparkles } from "lucide-react";
import { FILTERS, listTime, rowTag, snippet, type Filter, type InboxConvo } from "@/lib/inbox-shared";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ilo-plum";

type Props = {
  convos: InboxConvo[];
  hasAny: boolean;
  filter: Filter;
  onFilter: (f: Filter) => void;
  query: string;
  onQuery: (q: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  totalUnread: number;
  drafts: Record<string, string>;
  nowMs: number;
};

export function ConversationList({ convos, hasAny, filter, onFilter, query, onQuery, selectedId, onSelect, totalUnread, drafts, nowMs }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl text-ilo-deep">Inbox</h1>
          <span className="shrink-0 rounded-full bg-ilo-blush px-3 py-1 text-[11px] font-bold text-ilo-plum">
            {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"}
          </span>
        </div>
        <label className="relative mt-4 block">
          <span className="sr-only">Search conversations</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ilo-ink/50" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search conversations"
            className={`w-full rounded-full border border-ilo-plum/10 bg-ilo-bg py-2.5 pl-10 pr-4 text-xs text-ilo-ink placeholder:text-ilo-ink/50 ${focus}`}
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter conversations">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => onFilter(f.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${focus} ${
                filter === f.id ? "bg-ilo-plum text-white" : "bg-ilo-blush/70 text-ilo-ink hover:bg-ilo-blush"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="px-4 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-ilo-ink/60">Conversations</p>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {convos.length === 0 ? (
          <p className="px-3 py-10 text-center text-xs leading-relaxed text-ilo-ink/70">
            {hasAny ? "Nothing matches here." : "No conversations yet. When a student writes to you, it will appear here."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {convos.map((c) => {
              const active = c.id === selectedId;
              const tag = rowTag(c);
              const draft = drafts[c.id]?.trim();
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-start gap-3 rounded-xl border-l-2 px-3 py-3 text-left transition-colors ${focus} ${
                      active ? "border-ilo-plum bg-ilo-blush/60" : "border-transparent hover:bg-ilo-blush/30"
                    }`}
                  >
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ilo-blush font-display text-sm text-ilo-plum">
                      {c.initial}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1 text-xs font-bold text-ilo-deep">
                          <span className="truncate">{c.alias}</span>
                          {c.pinned && <Pin className="h-3 w-3 shrink-0 text-ilo-plum" aria-label="Pinned" />}
                        </span>
                        <span className="shrink-0 text-[10px] text-ilo-ink/60">{listTime(c.lastAt, nowMs)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-ilo-ink/80">
                        {draft ? `Draft: ${snippet(draft, 50)}` : c.lastBody ? snippet(c.lastBody) : "No messages yet"}
                      </span>
                      <span className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="flex flex-wrap gap-1">
                          {draft ? (
                            <span className="rounded-full bg-ilo-blush px-2 py-0.5 text-[10px] font-semibold text-ilo-plum">Draft</span>
                          ) : tag ? (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tag.className}`}>{tag.label}</span>
                          ) : null}
                        </span>
                        {c.unread > 0 && (
                          <span aria-label={`${c.unread} unread`} className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ilo-plum px-1.5 text-[10px] font-bold text-white">
                            {c.unread}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-ilo-plum/10 p-3">
        <div className="flex items-center gap-3 rounded-xl border border-ilo-plum/10 bg-ilo-bg px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ilo-blush text-ilo-plum"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-ilo-deep">Auto-reply</p>
            <p className="truncate text-[10px] text-ilo-ink/70">Set up in Settings, coming soon</p>
          </div>
          <span role="switch" aria-checked="false" aria-disabled="true" aria-label="Auto-reply, not available yet" className="flex h-5 w-9 shrink-0 items-center rounded-full bg-ilo-ink/20 px-0.5 opacity-70">
            <span className="h-4 w-4 rounded-full bg-white shadow" />
          </span>
        </div>
      </div>
    </div>
  );
}
