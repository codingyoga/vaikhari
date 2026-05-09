import { useEffect, useMemo, useState } from "react";
import {
  deleteSession,
  exportSessionUrl,
  getSession,
  listSessions,
} from "../lib/api";
import type { Session, SessionSummary } from "../types";
import { useStore } from "../lib/store";

export function HistoryView() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const personas = useStore((s) => s.personas);

  const refresh = async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await listSessions();
      setSessions(list);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, query]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this talk permanently? This cannot be undone.")) return;
    try {
      await deleteSession(id);
      if (selectedId === id) setSelectedId(null);
      refresh();
    } catch (e) {
      alert("Delete failed: " + (e as Error).message);
    }
  };

  return (
    <div className="flex-1 flex gap-4 min-h-[500px]">
      {/* List */}
      <aside className="w-72 shrink-0 flex flex-col rounded-2xl border border-ink-800 bg-ink-900/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-800">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search talks…"
            className="w-full bg-ink-800/60 text-ink-100 text-sm rounded-md px-3 py-1.5 border border-ink-700 focus:outline-none focus:border-accent-500 placeholder:text-ink-600"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-ink-500 px-4 py-3">Loading…</p>
          ) : err ? (
            <p className="text-xs text-red-400 px-4 py-3">{err}</p>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-ink-500 px-4 py-3">
              {sessions.length === 0
                ? "No saved talks yet. Start the mic on the Coach tab to begin one."
                : "No talks match that search."}
            </p>
          ) : (
            <ul>
              {filtered.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={[
                      "w-full text-left px-4 py-3 border-b border-ink-800/60 hover:bg-ink-800/40 transition",
                      selectedId === s.id ? "bg-ink-800/60" : "",
                    ].join(" ")}
                  >
                    <p className="text-sm text-ink-100 font-medium truncate">
                      {s.title}
                    </p>
                    <p className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-2">
                      <span>{personaLabel(personas, s.personaId)}</span>
                      <span>·</span>
                      <span>
                        {s.itemCount} thought{s.itemCount === 1 ? "" : "s"}
                      </span>
                      {!s.endedAt && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400">live</span>
                        </>
                      )}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Detail */}
      <section className="flex-1 rounded-2xl border border-ink-800 bg-ink-900/40 overflow-hidden">
        {selectedId ? (
          <SessionDetail
            id={selectedId}
            onDelete={() => handleDelete(selectedId)}
            onTitleChange={refresh}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-sm text-ink-300">Pick a talk on the left</p>
            <p className="text-xs text-ink-500 mt-1 max-w-sm">
              You'll see every original sentence with its polished version side-by-side,
              and can export the whole talk as a markdown file.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function SessionDetail({
  id,
  onDelete,
  onTitleChange,
}: {
  id: string;
  onDelete: () => void;
  onTitleChange: () => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSession(id)
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <p className="text-xs text-ink-500 px-5 py-4">Loading talk…</p>;
  }
  if (!session) {
    return <p className="text-xs text-red-400 px-5 py-4">Talk not found.</p>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-ink-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink-50 truncate">
            {session.title}
          </h2>
          <p className="text-[11px] text-ink-500 mt-0.5">
            {new Date(session.startedAt).toLocaleString()} ·{" "}
            {session.items.length} thoughts
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={exportSessionUrl(session.id)}
            className="text-xs text-ink-200 hover:text-accent-400 px-3 py-1.5 rounded-lg border border-ink-700 hover:border-accent-500/40 transition"
          >
            Export .md
          </a>
          <button
            onClick={() => {
              onDelete();
              onTitleChange();
            }}
            className="text-xs text-ink-400 hover:text-red-400 px-3 py-1.5 rounded-lg border border-ink-800 hover:border-red-500/40 transition"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {session.items.length === 0 ? (
          <p className="text-xs text-ink-500 italic">No polished thoughts yet.</p>
        ) : (
          <ul className="space-y-4">
            {session.items.map((it) => (
              <li
                key={it.id}
                className="rounded-xl border border-ink-800 bg-ink-900/40 p-4"
              >
                <p className="text-[10px] uppercase tracking-wider text-ink-500 mb-2">
                  {new Date(it.at).toLocaleTimeString()}
                </p>
                <p className="text-base text-ink-50 leading-relaxed">
                  {it.polished}
                </p>
                <details className="mt-3">
                  <summary className="text-[11px] text-ink-500 cursor-pointer hover:text-ink-400 list-none">
                    Show original
                  </summary>
                  <p className="mt-1.5 text-xs text-ink-500 italic leading-relaxed">
                    {it.raw}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function personaLabel(personas: { id: string; name: string }[], id: string) {
  return personas.find((p) => p.id === id)?.name ?? id;
}
