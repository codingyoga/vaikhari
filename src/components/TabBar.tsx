import { useStore } from "../lib/store";
import type { Tab } from "../types";

export function TabBar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);

  const tabs: { id: Tab; label: string }[] = [
    { id: "coach", label: "Coach" },
    { id: "history", label: "History" },
    { id: "usage", label: "Usage" },
  ];

  return (
    <nav className="flex gap-1 p-1 rounded-xl bg-ink-900/60 border border-ink-800 w-fit">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={[
            "px-4 py-1.5 rounded-lg text-sm font-medium transition",
            tab === t.id
              ? "bg-ink-700 text-ink-50 shadow-sm"
              : "text-ink-400 hover:text-ink-200",
          ].join(" ")}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
