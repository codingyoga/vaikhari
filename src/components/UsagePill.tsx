import { useState } from "react";
import { useStore } from "../lib/store";
import { formatCost, formatTokens } from "../lib/format";

export function UsagePill() {
  const usage = useStore((s) => s.usage);
  const setTab = useStore((s) => s.setTab);
  const [open, setOpen] = useState(false);

  const total = usage?.total ?? { input: 0, output: 0, cost: 0, calls: 0 };
  const haiku = usage?.byModel?.haiku;
  const sonnet = usage?.byModel?.sonnet;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setTab("usage")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ink-900/60 border border-ink-800 hover:border-ink-700 text-xs transition"
        aria-label="Open usage"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <span className="text-ink-300">{formatTokens(total.input + total.output)}</span>
        <span className="text-ink-500">·</span>
        <span className="text-accent-400 font-medium">{formatCost(total.cost)}</span>
      </button>

      {open && usage && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-ink-700 bg-ink-900 shadow-lg p-3 z-20 text-xs">
          <p className="text-[10px] uppercase tracking-wider text-ink-500 mb-2 font-medium">
            Estimated cost so far
          </p>
          <div className="space-y-1.5">
            <Row label="Total" value={formatCost(total.cost)} accent />
            <Row
              label={`Haiku (${haiku?.calls ?? 0} calls)`}
              value={formatCost(haiku?.cost ?? 0)}
            />
            <Row
              label={`Sonnet (${sonnet?.calls ?? 0} calls)`}
              value={formatCost(sonnet?.cost ?? 0)}
            />
            <div className="border-t border-ink-800 my-2" />
            <Row
              label="Input tokens"
              value={formatTokens(total.input)}
              muted
            />
            <Row
              label="Output tokens"
              value={formatTokens(total.output)}
              muted
            />
          </div>
          <p className="text-[10px] text-ink-600 mt-3 leading-relaxed">
            Estimated. Authoritative billing on{" "}
            <a
              className="underline hover:text-ink-400"
              href="https://console.anthropic.com/settings/usage"
              target="_blank"
              rel="noreferrer"
            >
              Anthropic Console
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-ink-500" : "text-ink-400"}>{label}</span>
      <span
        className={[
          "font-medium",
          accent ? "text-accent-400" : muted ? "text-ink-400" : "text-ink-200",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}
