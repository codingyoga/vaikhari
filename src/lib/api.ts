import type {
  Persona,
  PersonaId,
  PolishedItem,
  Session,
  SessionSummary,
  UsageSummary,
} from "../types";

export interface BoundaryResult {
  state: "mid" | "complete" | "rambling";
  reason: string;
}

export async function fetchHealth(): Promise<{
  ok: boolean;
  hasKey: boolean;
}> {
  const r = await fetch("/api/health");
  if (!r.ok) throw new Error("server unhealthy");
  return r.json();
}

export async function fetchPersonas(): Promise<Persona[]> {
  const r = await fetch("/api/personas");
  if (!r.ok) throw new Error("failed to load personas");
  return r.json();
}

export async function detectBoundary(
  transcript: string,
  lastPolishedAt?: string,
  signal?: AbortSignal,
  meta?: { sessionId?: string | null; personaId?: string }
): Promise<BoundaryResult> {
  const r = await fetch("/api/detect-boundary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, lastPolishedAt, ...meta }),
    signal,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `boundary failed (${r.status})`);
  }
  return r.json();
}

export async function polish(
  transcript: string,
  personaId: PersonaId,
  history: string[],
  signal?: AbortSignal,
  sessionId?: string | null
): Promise<string> {
  const r = await fetch("/api/polish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, personaId, history, sessionId }),
    signal,
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `polish failed (${r.status})`);
  }
  const data = await r.json();
  return data.polished as string;
}

export async function fetchUsage(): Promise<UsageSummary> {
  const r = await fetch("/api/usage");
  if (!r.ok) throw new Error("failed to load usage");
  return r.json();
}

// --- Sessions ---------------------------------------------------------------

export async function listSessions(): Promise<SessionSummary[]> {
  const r = await fetch("/api/sessions");
  if (!r.ok) throw new Error("failed to list sessions");
  return r.json();
}

export async function createSession(personaId: PersonaId): Promise<Session> {
  const r = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personaId }),
  });
  if (!r.ok) throw new Error("failed to create session");
  return r.json();
}

export async function getSession(id: string): Promise<Session> {
  const r = await fetch(`/api/sessions/${id}`);
  if (!r.ok) throw new Error("failed to load session");
  return r.json();
}

export async function patchSession(
  id: string,
  patch: Partial<Pick<Session, "title" | "endedAt" | "personaId">>
): Promise<Session> {
  const r = await fetch(`/api/sessions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("failed to update session");
  return r.json();
}

export async function deleteSession(id: string): Promise<void> {
  const r = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("failed to delete session");
}

export async function appendSessionItem(
  id: string,
  item: PolishedItem
): Promise<void> {
  const r = await fetch(`/api/sessions/${id}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  if (!r.ok) throw new Error("failed to save polished item");
}

export function exportSessionUrl(id: string): string {
  return `/api/sessions/${id}/export`;
}
