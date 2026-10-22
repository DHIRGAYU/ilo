"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { E2EEGate } from "@/components/e2ee/E2EEGate";
import { useE2EE } from "@/components/e2ee/E2EEProvider";
import { fromStore, matchesFilter, sortConvos, type Filter, type InboxConvo, type Msg } from "@/lib/inbox-shared";
import { ChatPane } from "./ChatPane";
import { ContextPanel } from "./ContextPanel";
import { ConversationList } from "./ConversationList";

type Flags = Partial<Pick<InboxConvo, "pinned" | "urgent" | "archived" | "resolved">>;
const PANEL = "rounded-2xl border border-ilo-plum/10 bg-white shadow-[0_1px_8px_rgba(74,26,71,0.04)]";

function useMediaQuery(query: string) {
  const subscribe = useCallback((cb: () => void) => {
    const m = window.matchMedia(query);
    m.addEventListener("change", cb);
    return () => m.removeEventListener("change", cb);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

type Props = { convos: InboxConvo[]; selectedId: string | null; nowMs: number; setupNeeded: boolean };

export function InboxView(props: Props) {
  return (
    <E2EEGate audience="counsellor">
      <InboxInner {...props} />
    </E2EEGate>
  );
}

function InboxInner({ convos: serverConvos, selectedId: initialSelected, nowMs, setupNeeded }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { client, summaries, rev } = useE2EE();
  const lgUp = useMediaQuery("(min-width: 1024px)");
  const xlUp = useMediaQuery("(min-width: 1280px)");

  // Flags and notes come from the server; the message details (last message, unread...) come from this device
  const [local, setLocal] = useState(serverConvos);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [view, setView] = useState<"list" | "chat">(initialSelected ? "chat" : "list");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ctxOpen, setCtxOpen] = useState(false);
  const [now, setNow] = useState(nowMs);
  const [flash, setFlash] = useState<string | null>(null);

  const localRef = useRef(local);
  useEffect(() => { localRef.current = local; });
  const chatVisible = lgUp || view === "chat";

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setLocal(serverConvos);
  }, [serverConvos]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const convos = useMemo<InboxConvo[]>(() => local.map((c) => {
    const s = summaries[c.id];
    return s ? { ...c, lastBody: s.lastBody, lastRole: s.lastMine ? "counsellor" : "student", lastAt: s.lastAt, firstAt: s.firstAt, unread: s.unread, everReplied: s.hasMine } : c;
  }), [local, summaries]);

  // A student wrote for the first time and this page does not know the conversation yet: reload the list once
  const asked = useRef(new Set<string>());
  useEffect(() => {
    const unknown = Object.keys(summaries).filter((id) => !local.some((c) => c.id === id) && !asked.current.has(id));
    if (unknown.length) { unknown.forEach((id) => asked.current.add(id)); router.refresh(); }
  }, [summaries, local, router]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setView("chat");
    setCtxOpen(false);
    window.history.replaceState(null, "", `/counsellor/inbox?c=${id}`);
  }, []);

  const back = () => {
    setView("list");
    setCtxOpen(false);
    window.history.replaceState(null, "", "/counsellor/inbox");
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^student\s*/, "").replace(/^#/, "");
    return sortConvos(convos.filter((c) => matchesFilter(c, filter) && (!q || c.alias.toLowerCase().includes(q) || c.lastBody.toLowerCase().includes(q))));
  }, [convos, filter, query]);

  // On a wide screen, open the most recent conversation straight away
  useEffect(() => {
    if (lgUp && !selectedId && visible[0]) select(visible[0].id);
  }, [lgUp, selectedId, visible, select]);

  // The open conversation's messages come from this device and refresh whenever anything changes
  useEffect(() => {
    if (!client || !selectedId) { setMsgs([]); return; }
    let live = true;
    client.messages(selectedId).then((list) => { if (live) setMsgs(list.map(fromStore)); });
    return () => { live = false; };
  }, [client, selectedId, rev]);

  // Opening a conversation marks it read
  const unreadHere = selectedId ? summaries[selectedId]?.unread ?? 0 : 0;
  useEffect(() => {
    if (client && selectedId && chatVisible && unreadHere > 0 && document.visibilityState === "visible") void client.markRead(selectedId);
  }, [client, selectedId, chatVisible, unreadHere]);

  const showFlash = (t: string) => { setFlash(t); setTimeout(() => setFlash(null), 8000); };

  function send() {
    const id = selectedId;
    const body = (id ? drafts[id] ?? "" : "").trim();
    if (!client || !id || !body) return;
    setDrafts((d) => ({ ...d, [id]: "" }));
    client.send(id, body).catch(() => { setDrafts((d) => ({ ...d, [id]: body })); showFlash("Couldn't send that message."); });
  }

  async function setFlags(id: string, patch: Flags) {
    const prev = localRef.current.find((c) => c.id === id);
    if (!prev) return;
    setLocal((cur) => cur.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.rpc("set_conversation_flags", {
      p_conversation_id: id,
      p_pinned: patch.pinned ?? null,
      p_urgent: patch.urgent ?? null,
      p_archived: patch.archived ?? null,
      p_resolved: patch.resolved ?? null,
    });
    if (error) {
      console.error("set_conversation_flags failed", error);
      setLocal((cur) => cur.map((c) => (c.id === id ? { ...c, pinned: prev.pinned, urgent: prev.urgent, archived: prev.archived, resolved: prev.resolved } : c)));
      showFlash(`Couldn't save that change: ${error.message}`);
    }
  }

  const saveNote = useCallback(async (id: string, text: string) => {
    const { error } = await supabase.rpc("save_conversation_note", { p_conversation_id: id, p_note: text });
    if (error) return false;
    setLocal((cur) => cur.map((c) => (c.id === id ? { ...c, note: text } : c)));
    return true;
  }, [supabase]);

  const current = convos.find((c) => c.id === selectedId) ?? null;
  const totalUnread = convos.reduce((n, c) => n + c.unread, 0);

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-0 gap-3 p-3 lg:gap-4 lg:p-4 xl:p-5">
      {(setupNeeded || flash) && (
        <p role="status" className="fixed left-1/2 top-16 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-ilo-deep px-4 py-2.5 text-center text-xs text-white shadow-lg">
          {flash ?? "Flags and notes need the 0010_counsellor_inbox.sql database update. Messages still work."}
        </p>
      )}

      <section aria-label="Conversations" className={`${PANEL} ${view === "list" ? "flex" : "hidden"} min-h-0 w-full min-w-0 flex-col lg:flex lg:w-80 lg:shrink-0 xl:w-[22rem]`}>
        <ConversationList
          convos={visible}
          hasAny={convos.length > 0}
          filter={filter}
          onFilter={setFilter}
          query={query}
          onQuery={setQuery}
          selectedId={selectedId}
          onSelect={select}
          totalUnread={totalUnread}
          drafts={drafts}
          nowMs={now}
        />
      </section>

      <section aria-label="Conversation" className={`${PANEL} ${view === "chat" ? "flex" : "hidden"} min-h-0 min-w-0 flex-1 flex-col lg:flex`}>
        {current ? (
          <ChatPane
            key={current.id}
            convo={current}
            msgs={msgs}
            loading={false}
            draft={drafts[current.id] ?? ""}
            onDraft={(v) => setDrafts((d) => ({ ...d, [current.id]: v }))}
            onSend={send}
            onRetry={(m) => void client?.retry(m.id)}
            onResend={(m) => void client?.resend(m.id)}
            onBack={back}
            onOpenContext={() => setCtxOpen(true)}
            onFlags={(patch) => void setFlags(current.id, patch)}
            nowMs={now}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ilo-blush text-ilo-plum"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>
            <p className="mt-3 font-display text-xl text-ilo-deep">Choose a conversation</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-ilo-ink/70">Messages are private between you and the student. Your college sees that counselling happened. Never who. Never what was said.</p>
          </div>
        )}
      </section>

      {xlUp && current && (
        <aside aria-label="Student context" className="hidden min-h-0 w-80 shrink-0 overflow-y-auto xl:block">
          <ContextPanel convo={current} saveNote={saveNote} nowMs={now} />
        </aside>
      )}

      {!xlUp && ctxOpen && current && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ilo-deep/40" onClick={() => setCtxOpen(false)} aria-hidden="true" />
          <aside role="dialog" aria-modal="true" aria-label="Student context" className="absolute inset-y-0 right-0 w-full max-w-sm overflow-y-auto bg-ilo-bg p-4 shadow-2xl">
            <ContextPanel convo={current} saveNote={saveNote} nowMs={now} onClose={() => setCtxOpen(false)} />
          </aside>
        </div>
      )}
    </main>
  );
}
