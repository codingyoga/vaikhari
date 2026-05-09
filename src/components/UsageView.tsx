import { useEffect, useMemo, useState } from "react";
import { fetchUsage, listSessions } from "../lib/api";
import { useStore } from "../lib/store";
import { formatCost, formatDate, formatTokens } from "../lib/format";
import type { SessionSummary, UsageBucket, UsageSummary } from "../types";

export function UsageView() {
  const usage = useStore((s) => s.usage);
  const setUsage = useStore((s) => s.setUsage);
  const personas = useStore((s) => s.personas);

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchUsage(), listSessions()])
      .then(([u, s]) => {
        if (cancelled) return;
        setUsage(u);
        setSessions(s);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr((e as Error).message);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setUsage]);

  const maxDayCost = useMemo(() => {
    if (!usage) return 0;
    return Math.max(0.0001, ...usage.last7Days.map((d) => d.cost));
  }, [usage]);

  if (loading) {
    return <p className="text-sm text-ink-500 px-1">Loading usage…</p>;
  }
  if (err) {
    return (
      <p className="text-sm text-red-400 px-1">Failed to load usage: {err}</p>
    );
  }
  if (!usage) return null;

  const haiku = usage.byModel.haiku ?? emptyBucket();
  const sonnet = usage.byModel.sonnet ?? emptyBucket();

  return (
    <div className="space-y-5">
      {/* Top: big totals */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          label="Total estimated cost"
          value={formatCost(usage.total.cost)}
          accent
        />
        <Stat
          label="Total tokens"
          value={formatTokens(usage.total.input + usage.total.output)}
          sub={`${formatTokens(usage.total.input)} in · ${formatTokens(
            usage.total.output
          )} out`}
        />
        <Stat label="API calls" value={`${usage.total.calls}`} />
      </section>

      {/* Source-of-truth note */}
      <p className="text-[11px] text-ink-500">
        Estimates use published per-token rates (Haiku ${usage.pricing.haiku.input}/M
        in · ${usage.pricing.haiku.output}/M out · Sonnet ${
        usage.pricing.sonnet.input
      }
        /M in · ${usage.pricing.sonnet.output}/M out). Authoritative numbers live in the{" "}
        <a
          className="underline hover:text-ink-300"
          href="https://console.anthropic.com/settings/usage"
          target="_blank"
          rel="noreferrer"
        >
          Anthropic Console
        </a>
        .
      </p>

      {/* By model */}
      <Card title="By model">
        <BucketRow
          label="Claude Haiku (boundary detector)"
          bucket={haiku}
        />
        <BucketRow label="Claude Sonnet (polisher)" bucket={sonnet} />
      </Card>

      {/* Last 7 days */}
      <Card title="Last 7 days">
        <ul className="space-y-1.5">
          {usage.last7Days.map((d) => {
            const pct = (d.cost / maxDayCost) * 100;
            return (
              <li key={d.date} className="flex items-center gap-3">
                <span className="text-xs text-ink-400 w-20 shrink-0">
                  {formatDate(d.date)}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                  <div
                    className="h-full bg-accent-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-ink-300 w-16 text-right">
                  {formatCost(d.cost)}
                </span>
                <span className="text-[10px] text-ink-500 w-10 text-right">
                  {d.calls} calls
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* By persona */}
      {Object.keys(usage.byPersona).length > 0 && (
        <Card title="By persona">
          {Object.entries(usage.byPersona)
            .sort((a, b) => b[1].cost - a[1].cost)
            .map(([id, b]) => (
              <BucketRow
                key={id}
                label={
                  personas.find((p) => p.id === id)?.name || id
                }
                bucket={b}
              />
            ))}
        </Card>
      )}

      {/* By talk */}
      {sessions.length > 0 && (
        <Card title="By talk">
          <ul className="space-y-1.5">
            {sessions
              .map((s) => ({
                ...s,
                usage: usage.bySession[s.id] ?? emptyBucket(),
              }))
              .sort((a, b) => b.usage.cost - a.usage.cost)
              .slice(0, 10)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 text-xs"
                >
                  <span className="flex-1 truncate text-ink-200">
                    {s.title}
                  </span>
                  <span className="text-ink-500">{s.usage.calls} calls</span>
                  <span className="text-ink-300 w-16 text-right">
                    {formatTokens(s.usage.input + s.usage.output)}
                  </span>
                  <span className="text-accent-400 w-16 text-right font-medium">
                    {formatCost(s.usage.cost)}
                  </span>
                </li>
              ))}
          </ul>
          {sessions.length > 10 && (
            <p className="text-[10px] text-ink-600 mt-2">
              Showing top 10 most expensive talks of {sessions.length}.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function emptyBucket(): UsageBucket {
  return { input: 0, output: 0, cost: 0, calls: 0 };
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900/40 px-5 py-4">
      <p className="text-[10px] uppercase tracking-wider text-ink-500 font-medium">
        {label}
      </p>
      <p
        className={[
          "text-2xl font-semibold mt-1",
          accent ? "text-accent-400" : "text-ink-50",
        ].join(" ")}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-ink-500 mt-1">{sub}</p>}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-800 bg-ink-900/40 px-5 py-4">
      <h3 className="text-[11px] uppercase tracking-wider text-ink-500 font-medium mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function BucketRow({
  label,
  bucket,
}: {
  label: string;
  bucket: UsageBucket;
}) {
  return (
    <div className="flex items-center gap-3 text-xs py-1.5 border-b border-ink-800/40 last:border-0">
      <span className="flex-1 text-ink-200 truncate">{label}</span>
      <span className="text-ink-500 w-14 text-right">{bucket.calls} calls</span>
      <span className="text-ink-300 w-20 text-right">
        {formatTokens(bucket.input)} in
      </span>
      <span className="text-ink-300 w-20 text-right">
        {formatTokens(bucket.output)} out
      </span>
      <span className="text-accent-400 w-20 text-right font-medium">
        {formatCost(bucket.cost)}
      </span>
    </div>
  );
}
