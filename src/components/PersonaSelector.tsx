import { useStore } from "../lib/store";
import type { PersonaId } from "../types";

export function PersonaSelector() {
  const personas = useStore((s) => s.personas);
  const personaId = useStore((s) => s.personaId);
  const setPersonaId = useStore((s) => s.setPersonaId);

  return (
    <div className="flex flex-wrap gap-2">
      {personas.map((p) => {
        const active = p.id === personaId;
        return (
          <button
            key={p.id}
            onClick={() => setPersonaId(p.id as PersonaId)}
            className={[
              "group relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
              "border focus:outline-none focus:ring-2 focus:ring-accent-500/40",
              active
                ? "bg-accent-500/10 border-accent-500/40 text-accent-400 shadow-glow"
                : "bg-ink-800/60 border-ink-700 text-ink-300 hover:bg-ink-800 hover:border-ink-600",
            ].join(" ")}
          >
            <div className="flex flex-col items-start">
              <span>{p.name}</span>
              <span
                className={[
                  "text-[11px] mt-0.5 font-normal",
                  active ? "text-accent-400/80" : "text-ink-500",
                ].join(" ")}
              >
                {p.tagline}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
