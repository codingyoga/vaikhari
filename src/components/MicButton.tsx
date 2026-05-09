import { useStore } from "../lib/store";

export function MicButton() {
  const isMicOn = useStore((s) => s.isMicOn);
  const setMicOn = useStore((s) => s.setMicOn);
  const status = useStore((s) => s.status);

  const label = isMicOn ? "Stop listening" : "Start listening";
  const sub = isMicOn
    ? statusLabel(status)
    : "Click to begin — Vaikhari will polish thoughts as you speak";

  return (
    <button
      onClick={() => setMicOn(!isMicOn)}
      className={[
        "group relative w-full sm:w-auto flex items-center gap-4 px-6 py-4 rounded-2xl",
        "border transition-all focus:outline-none focus:ring-2 focus:ring-accent-500/40",
        isMicOn
          ? "bg-accent-500/15 border-accent-500/50 shadow-glow"
          : "bg-ink-800/70 border-ink-700 hover:bg-ink-800 hover:border-ink-600",
      ].join(" ")}
    >
      <span
        className={[
          "relative flex h-12 w-12 items-center justify-center rounded-full transition-colors",
          isMicOn ? "bg-accent-500 text-white" : "bg-ink-700 text-ink-200",
        ].join(" ")}
      >
        {isMicOn && (
          <span className="absolute inset-0 rounded-full bg-accent-500 opacity-40 animate-ping" />
        )}
        <MicIcon />
      </span>
      <span className="text-left">
        <span className="block text-sm font-semibold text-ink-50">{label}</span>
        <span className="block text-xs text-ink-400 mt-0.5">{sub}</span>
      </span>
    </button>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "listening":
      return "Listening…";
    case "thinking":
      return "Reading the room…";
    case "polishing":
      return "Polishing your thought…";
    case "error":
      return "Something went wrong — check below";
    default:
      return "Ready";
  }
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
