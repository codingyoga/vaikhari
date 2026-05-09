import { useEffect, useState } from "react";
import { useStore } from "./lib/store";
import { useCoach } from "./lib/useCoach";
import { fetchHealth, fetchPersonas, fetchUsage } from "./lib/api";
import { PersonaSelector } from "./components/PersonaSelector";
import { MicButton } from "./components/MicButton";
import { LiveTranscript } from "./components/LiveTranscript";
import { PolishedFeed } from "./components/PolishedFeed";
import { SetupBanner } from "./components/SetupBanner";
import { TabBar } from "./components/TabBar";
import { CurrentTalkBar } from "./components/CurrentTalkBar";
import { HistoryView } from "./components/HistoryView";
import { UsageView } from "./components/UsageView";
import { UsagePill } from "./components/UsagePill";

export default function App() {
  const setPersonas = useStore((s) => s.setPersonas);
  const setUsage = useStore((s) => s.setUsage);
  const errorMessage = useStore((s) => s.errorMessage);
  const tab = useStore((s) => s.tab);

  const [hasKey, setHasKey] = useState(true);
  const [serverUp, setServerUp] = useState(true);

  // Activate the coach loop (mic + agent pipeline)
  useCoach();

  // Boot: load personas + health-check + usage
  useEffect(() => {
    (async () => {
      try {
        const [h, p, u] = await Promise.all([
          fetchHealth(),
          fetchPersonas(),
          fetchUsage(),
        ]);
        setHasKey(h.hasKey);
        setServerUp(true);
        setPersonas(p);
        setUsage(u);
      } catch {
        setServerUp(false);
      }
    })();
  }, [setPersonas, setUsage]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-ink-800/80 bg-ink-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-base font-semibold text-ink-50 leading-tight">
                Vaikhari
              </h1>
              <p className="text-[11px] text-ink-500 leading-tight">
                Real-time speech coach
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UsagePill />
            <TabBar />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 py-6 flex flex-col gap-5">
        {!serverUp && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-5 py-4">
            <p className="text-sm text-red-300 font-semibold">
              Backend server isn't running
            </p>
            <p className="text-xs text-red-300/80 mt-1">
              Run <code className="px-1 py-0.5 rounded bg-ink-900">npm run dev</code> from
              the project root, then refresh.
            </p>
          </div>
        )}

        <SetupBanner hasKey={hasKey} />

        {tab === "usage" ? (
          <UsageView />
        ) : tab === "coach" ? (
          <>
            <CurrentTalkBar />

            <section className="rounded-2xl border border-ink-800 bg-ink-900/40 px-5 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">
                  Voice
                </span>
              </div>
              <PersonaSelector />
            </section>

            <section className="flex flex-col sm:flex-row sm:items-stretch gap-4">
              <div className="sm:w-auto">
                <MicButton />
              </div>
              <div className="flex-1">
                <LiveTranscript />
              </div>
            </section>

            {errorMessage && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
                <p className="text-sm text-red-300">{errorMessage}</p>
              </div>
            )}

            <section className="flex-1 min-h-[400px] flex">
              <PolishedFeed />
            </section>

            <footer className="text-center text-[11px] text-ink-600 py-2">
              Tip: Open this in a small Chrome window and pin it on top of Zoom for the
              coach overlay. Every polished thought is auto-saved to disk.
            </footer>
          </>
        ) : (
          <HistoryView />
        )}
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-glow">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M3 12c2 0 2-3 4-3s2 6 4 6 2-9 4-9 2 9 4 9 2-3 2-3" />
      </svg>
    </div>
  );
}
