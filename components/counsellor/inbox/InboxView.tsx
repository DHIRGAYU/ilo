"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { matchesFilter, sortConvos, toMsg, type Filter, type InboxConvo, type MessageRow, type Msg } from "@/lib/inbox-shared";
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

type Props = { convos: InboxConvo[]; selectedId: string | null; initialMessages: MessageRow[]; nowMs: number; setupNeeded: boolean };

export function InboxView({ convos: serverConvos, selectedId: initialSelected, initialMessages, nowMs, setupNeeded }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const lgUp = useMediaQuery("(min-width: 1024px)");
  const xlUp = useMediaQuery("(min-width: 1280px)");

  const [convos, setConvos] = useState(serverConvos);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [view, setView] = useState<"list" | "chat">(initialSelected ? "chat" : "list");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [cache, setCache] = useState<Record<string, Msg[]>>(() => (initialSelected ? { [initialSelected]: initialMessages.map(toMsg) } : {}));
  const [loading, setLoading] = useState(false);
  const [tries, setTries] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ctxOpen, setCtxOpen] = useState(false);
  const [now, setNow] = useState(nowMs);
  const [flash, setFlash] = useState<string | null>(null);

  // Latest values for realtime callbacks, which outlive a single render
  const convosRef = useRef(convos);
  const selectedRef = useRef(selectedId);
  const visibleRef = useRef(false);
  const cacheRef = useRef(cache);
  const chatVisible = lgUp || view === "chat";
  useEffect(() => { convosRef.current = convos; selectedRef.current = selectedId; visibleRef.current = chatVisible; cacheRef.current = cache; });

  // After router.refresh() the server sends fresh rows, which replace what is on screen
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    setConvos(serverConvos);
  }, [serverConvos]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

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

  const fetchMessages = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_role, body, created_at, client_id")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error || !data) return null;
    return (data as MessageRow[]).reverse().map(toMsg);
  }, [supabase]);

  // Load history the first time a conversation is opened
  useEffect(() => {
    if (!selectedId || cacheRef.current[selectedId]) return;
    let live = true;
    setLoading(true);
    fetchMessages(selectedId).then((list) => {
      if (!live) return;
      setLoading(false);
      if (list) setCache((c) => ({ ...c, [selectedId]: list }));
    });
    return () => { live = false; };
  }, [selectedId, fetchMessages, tries]);

  const markRead = useCallback(async (id: string) => {
    const c = convosRef.current.find((x) => x.id === id);
    if (!c || c.unread === 0) return;
    setConvos((cur) => cur.map((x) => (x.id === id ? { ...x, unread: 0 } : x)));
    const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: id });
    if (!error) router.refresh(); // keeps the sidebar badge in step
  }, [supabase, router]);

  useEffect(() => {
    if (selectedId && chatVisible) void markRead(selectedId);
  }, [selectedId, chatVisible, markRead]);

  // New messages arrive live
  useEffect(() => {
    const channel = supabase
      .channel("counsellor-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => {
        const r = p.new as MessageRow & { conversation_id: string };
        const id = r.conversation_id;
        if (!convosRef.current.some((c) => c.id === id)) { router.refresh(); return; }
        const m = toMsg(r);
        setCache((cur) => {
          const list = cur[id];
          if (!list) return cur;
          return { ...cur, [id]: list.some((x) => x.key === m.key) ? list.map((x) => (x.key === m.key ? { ...x, ...m } : x)) : [...list, m] };
        });
        const watching = selectedRef.current === id && visibleRef.current && document.visibilityState === "visible";
        const fromStudent = r.sender_role === "student";
        setConvos((cur) => cur.map((c) => c.id !== id ? c : {
          ...c,
          lastBody: r.body, lastRole: r.sender_role, lastAt: Math.max(c.lastAt, m.at),
          everReplied: c.everReplied || !fromStudent,
          unread: fromStudent && !watching ? c.unread + 1 : c.unread,
        }));
        if (fromStudent && watching) void supabase.rpc("mark_conversation_read", { p_conversation_id: id });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, router]);

  // Catch up when the counsellor returns to the tab
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      const id = selectedRef.current;
      if (!id) return;
      const server = await fetchMessages(id);
      if (!server) return;
      setCache((cur) => ({ ...cur, [id]: [...server, ...(cur[id] ?? []).filter((m) => m.status !== "sent" && !server.some((s) => s.key === m.key))] }));
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchMessages, router]);

  const showFlash = (t: string) => { setFlash(t); setTimeout(() => setFlash(null), 8000); };

  async function deliver(id: string, key: string, body: string) {
    const { data, error } = await supabase.rpc("counsellor_send_message", { p_conversation_id: id, p_body: body, p_client_id: key });
    const patch = (fn: (m: Msg) => Msg) => setCache((cur) => ({ ...cur, [id]: (cur[id] ?? []).map((m) => (m.key === key ? fn(m) : m)) }));
    if (error) {
      console.error(`counsellor_send_message failed: ${error.message} | code ${error.code} | ${error.details ?? ""} | ${error.hint ?? ""}`);
      patch((m) => ({ ...m, status: "failed" }));
      showFlash(`Couldn't send: ${error.message}`);
      return;
    }
    const r = data as { created_at: string };
    patch((m) => ({ ...m, at: Date.parse(r.created_at), status: "sent" }));
  }

  function send() {
    const id = selectedId;
    const body = (id ? drafts[id] ?? "" : "").trim();
    if (!id || !body) return;
    const key = crypto.randomUUID();
    const at = Date.now();
    setCache((cur) => ({ ...cur, [id]: [...(cur[id] ?? []), { key, mine: true, body, at, status: "sending" }] }));
    setDrafts((d) => ({ ...d, [id]: "" }));
    setConvos((cur) => cur.map((c) => (c.id === id ? { ...c, lastBody: body, lastRole: "counsellor", lastAt: at, everReplied: true, unread: 0 } : c)));
    void deliver(id, key, body);
  }

  function retry(m: Msg) {
    if (!selectedId) return;
    const id = selectedId;
    setCache((cur) => ({ ...cur, [id]: (cur[id] ?? []).map((x) => (x.key === m.key ? { ...x, status: "sending" } : x)) }));
    void deliver(id, m.key, m.body);
  }

  async function setFlags(id: string, patch: Flags) {
    const prev = convosRef.current.find((c) => c.id === id);
    if (!prev) return;
    setConvos((cur) => cur.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.rpc("set_conversation_flags", {
      p_conversation_id: id,
      p_pinned: patch.pinned ?? null,
      p_urgent: patch.urgent ?? null,
      p_archived: patch.archived ?? null,
      p_resolved: patch.resolved ?? null,
    });
    if (error) {
      setConvos((cur) => cur.map((c) => (c.id === id ? { ...c, pinned: prev.pinned, urgent: prev.urgent, archived: prev.archived, resolved: prev.resolved } : c)));
      console.error("set_conversation_flags failed", error);
      showFlash(`Couldn't save that change: ${error.message}`);
    }
  }

  const saveNote = useCallback(async (id: string, text: string) => {
    const { error } = await supabase.rpc("save_conversation_note", { p_conversation_id: id, p_note: text });
    if (error) return false;
    setConvos((cur) => cur.map((c) => (c.id === id ? { ...c, note: text } : c)));
    return true;
  }, [supabase]);

  const current = convos.find((c) => c.id === selectedId) ?? null;
  const totalUnread = convos.reduce((n, c) => n + c.unread, 0);

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-0 gap-3 p-3 lg:gap-4 lg:p-4 xl:p-5">
      {(setupNeeded || flash) && (
        <p role="status" className="fixed left-1/2 top-16 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl bg-ilo-deep px-4 py-2.5 text-center text-xs text-white shadow-lg">
          {flash ?? "Inbox actions need the 0010_counsellor_inbox.sql database update. You can read messages, but not reply yet."}
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
            msgs={cache[current.id] ?? []}
            loading={loading}
            draft={drafts[current.id] ?? ""}
            onDraft={(v) => setDrafts((d) => ({ ...d, [current.id]: v }))}
            onSend={send}
            onRetry={retry}
            onReload={() => setTries((t) => t + 1)}
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
