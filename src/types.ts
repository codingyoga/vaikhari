export type PersonaId =
  | "executive"
  | "marketer"
  | "technical"
  | "friendly"
  | "comedian";

export interface Persona {
  id: PersonaId;
  name: string;
  tagline: string;
}

export interface PolishedItem {
  id: string;
  raw: string;
  polished: string;
  personaId: PersonaId;
  state: "complete" | "rambling";
  at: number;
}

export type AgentStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "polishing"
  | "error";

export interface SessionSummary {
  id: string;
  title: string;
  personaId: PersonaId;
  startedAt: number;
  endedAt: number | null;
  itemCount: number;
}

export interface Session extends SessionSummary {
  items: PolishedItem[];
}

export type Tab = "coach" | "history" | "usage";

export interface UsageBucket {
  input: number;
  output: number;
  cost: number;
  calls: number;
}

export interface UsageDay extends UsageBucket {
  date: string; // YYYY-MM-DD
}

export interface UsageSummary {
  pricing: {
    haiku: { input: number; output: number };
    sonnet: { input: number; output: number };
  };
  total: UsageBucket;
  byModel: Record<string, UsageBucket>;
  byKind: Record<string, UsageBucket>;
  byPersona: Record<string, UsageBucket>;
  bySession: Record<string, UsageBucket>;
  byDay: Record<string, UsageBucket>;
  last7Days: UsageDay[];
  eventCount: number;
}
