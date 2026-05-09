import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { patchSession } from "../lib/api";

// Slim bar shown at top of Coach view when a talk is active.
// Lets the user rename the talk and end it (which closes the session and
// stops persisting further polished items).

export function CurrentTalkBar() {
  const id = useStore((s) => s.currentSessionId);
  const title = useStore((s) => s.currentSessionTitle);
  const setCurrentSession = useStore((s) => s.setCurrentSession);
  const endCurrentTalk = useStore((s) => s.endCurrentTalk);

  const [draft, setDraft] = useState(title ?? "");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setDraft(title ?? "");
  }, [title]);

  if (!id) return null;

  const save = async () => {
    setEditing(false);
    if (!draft.trim() || draft === title) return;
    try {
      const s = await patchSession(id, { title: draft.trim() });
      setCurrentSession(s.id, s.title);
    } catch {
      // revert on failure
      setDraft(title ?? "");
    }
  };

  const endTalk = async () => {
    try {
      await patchSession(id, { endedAt: Date.now() });
    } catch {
      // ignore — local state still resets
    }
    endCurrentTalk();
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-2.5">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">
        Active talk
      </span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setDraft(title ?? "");
              setEditing(false);
            }
          }}
          className="flex-1 bg-ink-800 text-ink-100 text-sm rounded-md px-2 py-1 border border-ink-700 focus:outline-none focus:border-accent-500"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="flex-1 text-left text-sm text-ink-200 hover:text-ink-50 truncate"
          title="Click to rename"
        >
          {title}
        </button>
      )}
      <button
        onClick={endTalk}
        className="text-xs text-ink-400 hover:text-red-400 px-2 py-1 rounded-md border border-ink-800 hover:border-red-500/40 transition"
      >
        End talk
      </button>
    </div>
  );
}
