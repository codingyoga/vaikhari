import { create } from "zustand";
import type {
  AgentStatus,
  Persona,
  PersonaId,
  PolishedItem,
  Tab,
  UsageSummary,
} from "../types";

interface VaikhariState {
  // session
  isMicOn: boolean;
  status: AgentStatus;
  errorMessage: string | null;

  // transcript
  finalTranscript: string;
  interimTranscript: string;
  lastPolishedRaw: string;

  // persona
  personaId: PersonaId;
  personas: Persona[];

  // output (current talk only — past talks live on disk and load via API)
  polishedHistory: PolishedItem[];
  latestPolished: PolishedItem | null;

  // current saved talk on disk
  currentSessionId: string | null;
  currentSessionTitle: string | null;

  // navigation
  tab: Tab;

  // usage / cost
  usage: UsageSummary | null;

  // setters
  setMicOn: (on: boolean) => void;
  setStatus: (s: AgentStatus, err?: string) => void;
  setPersonaId: (id: PersonaId) => void;
  setPersonas: (p: Persona[]) => void;
  appendFinal: (chunk: string) => void;
  setInterim: (chunk: string) => void;
  pushPolished: (item: PolishedItem) => void;
  setCurrentSession: (id: string | null, title: string | null) => void;
  setTab: (t: Tab) => void;
  endCurrentTalk: () => void;
  setUsage: (u: UsageSummary) => void;
}

export const useStore = create<VaikhariState>((set) => ({
  isMicOn: false,
  status: "idle",
  errorMessage: null,

  finalTranscript: "",
  interimTranscript: "",
  lastPolishedRaw: "",

  personaId: "executive",
  personas: [],

  polishedHistory: [],
  latestPolished: null,

  currentSessionId: null,
  currentSessionTitle: null,

  tab: "coach",

  usage: null,

  setMicOn: (on) => set({ isMicOn: on }),
  setStatus: (s, err) =>
    set({ status: s, errorMessage: s === "error" ? err ?? null : null }),
  setPersonaId: (id) => set({ personaId: id }),
  setPersonas: (p) => set({ personas: p }),
  appendFinal: (chunk) =>
    set((st) => ({
      finalTranscript: (st.finalTranscript + " " + chunk).trim(),
      interimTranscript: "",
    })),
  setInterim: (chunk) => set({ interimTranscript: chunk }),
  pushPolished: (item) =>
    set((st) => ({
      polishedHistory: [...st.polishedHistory, item],
      latestPolished: item,
      lastPolishedRaw: item.raw,
    })),
  setCurrentSession: (id, title) =>
    set({ currentSessionId: id, currentSessionTitle: title }),
  setTab: (t) => set({ tab: t }),
  setUsage: (u) => set({ usage: u }),
  endCurrentTalk: () =>
    set({
      isMicOn: false,
      status: "idle",
      finalTranscript: "",
      interimTranscript: "",
      lastPolishedRaw: "",
      polishedHistory: [],
      latestPolished: null,
      currentSessionId: null,
      currentSessionTitle: null,
      errorMessage: null,
    }),
}));
