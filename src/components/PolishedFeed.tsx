import { useEffect, useRef } from "react";
import { useStore } from "../lib/store";
import type { PolishedItem } from "../types";

export function PolishedFeed() {
  const items = useStore((s) => s.polishedHistory);
  const status = useStore((s) => s.status);
  const personas = useStore((s) => s.personas);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest polished thought
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [items.length]);

  return (
    <div className="flex-1 flex flex-col rounded-2xl border border-ink-800 bg-ink-900/40 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-ink-800 bg-ink-900/60">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
          <span className="text-[11px] uppercase tracking-wider text-ink-300 font-medium">
            Polished thoughts
          </span>
        </div>
        <StatusPill status={status} />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-3">
            {items.map((item, idx) => (
              <PolishedBubble
                key={item.id}
                item={item}
                isLatest={idx === items.length - 1}
                personaName={
                  personas.find((p) => p.id === item.personaId)?.name ??
                  item.personaId
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PolishedBubble({
  item,
  isLatest,
  personaName,
}: {
  item: PolishedItem;
  isLatest: boolean;
  personaName: string;
}) {
  return (
    <li
      className={[
        "rounded-xl px-4 py-3 border animate-rise",
        isLatest
          ? "bg-accent-500/10 border-accent-500/30 shadow-glow"
          : "bg-ink-800/50 border-ink-700/60",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={[
            "text-[10px] uppercase tracking-wider font-semibold",
            isLatest ? "text-accent-400" : "text-ink-400",
          ].join(" ")}
        >
          {personaName}
        </span>
        {item.state === "rambling" && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
            tightened
          </span>
        )}
        <span className="ml-auto text-[10px] text-ink-500">
          {timeAgo(item.at)}
        </span>
      </div>
      <p
        className={[
          "leading-relaxed",
          isLatest ? "text-ink-50 text-lg" : "text-ink-200 text-base",
        ].join(" ")}
      >
        {item.polished}
      </p>
      <details className="mt-2 group">
        <summary className="text-[11px] text-ink-500 cursor-pointer hover:text-ink-400 list-none">
          <span className="group-open:hidden">Show original</span>
          <span className="hidden group-open:inline">Hide original</span>
        </summary>
        <p className="mt-1.5 text-xs text-ink-500 italic leading-relaxed">
          {item.raw}
        </p>
      </details>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-10">
      <div className="h-12 w-12 rounded-2xl bg-ink-800 flex items-center justify-center mb-4">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-ink-500"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <p className="text-sm text-ink-300 font-medium">
        Polished thoughts will appear here
      </p>
      <p className="text-xs text-ink-500 mt-1 max-w-xs">
        Vaikhari listens, detects when you finish a thought, and rewrites it in
        your chosen voice.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    idle: { label: "Idle", cls: "bg-ink-800 text-ink-400 border-ink-700" },
    listening: {
      label: "Listening",
      cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    },
    thinking: {
      label: "Reading the room",
      cls: "bg-sky-500/10 text-sky-400 border-sky-500/30 animate-pulse-slow",
    },
    polishing: {
      label: "Polishing",
      cls: "bg-accent-500/15 text-accent-400 border-accent-500/30 animate-pulse-slow",
    },
    error: {
      label: "Error",
      cls: "bg-red-500/10 text-red-400 border-red-500/30",
    },
  };
  const s = map[status] ?? map.idle;
  return (
    <span
      className={[
        "text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-medium",
        s.cls,
      ].join(" ")}
    >
      {s.label}
    </span>
  );
}

function timeAgo(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  return `${m}m ago`;
}
