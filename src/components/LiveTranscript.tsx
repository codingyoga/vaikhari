import { useStore } from "../lib/store";

export function LiveTranscript() {
  const finalTranscript = useStore((s) => s.finalTranscript);
  const interimTranscript = useStore((s) => s.interimTranscript);
  const lastPolishedRaw = useStore((s) => s.lastPolishedRaw);

  // Show only what's been said since the last polish — keeps the UI focused
  const recent = lastPolishedRaw
    ? finalTranscript
        .slice(finalTranscript.indexOf(lastPolishedRaw) + lastPolishedRaw.length)
        .trim()
    : finalTranscript;

  const hasContent = recent || interimTranscript;

  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900/50 px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-500" />
        <span className="text-[11px] uppercase tracking-wider text-ink-500 font-medium">
          What you're saying
        </span>
      </div>
      <p className="text-sm leading-relaxed text-ink-400 min-h-[2.5rem]">
        {hasContent ? (
          <>
            <span>{recent}</span>{" "}
            <span className="text-ink-500 italic">{interimTranscript}</span>
          </>
        ) : (
          <span className="text-ink-600">Waiting for you to speak…</span>
        )}
      </p>
    </div>
  );
}
