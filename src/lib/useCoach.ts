import { useEffect, useRef } from "react";
import { useStore } from "./store";
import {
  createBrowserSpeechProvider,
  type TranscriptionProvider,
} from "./transcription";
import {
  appendSessionItem,
  createSession,
  detectBoundary,
  fetchUsage,
  polish,
} from "./api";

// The intelligent coach loop:
// 1. Web Speech API streams transcripts
// 2. After each FINAL chunk, debounce 600ms then ask boundary detector (Haiku)
// 3. If state is 'complete' or 'rambling', send the new portion to polisher (Sonnet)
// 4. Polished result lands in the store with last 10 thoughts as call context

export function useCoach() {
  const provider = useRef<TranscriptionProvider | null>(null);
  const debounceTimer = useRef<number | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const lastBoundaryAt = useRef<string>("");

  const isMicOn = useStore((s) => s.isMicOn);
  const setMicOn = useStore((s) => s.setMicOn);
  const setStatus = useStore((s) => s.setStatus);
  const appendFinal = useStore((s) => s.appendFinal);
  const setInterim = useStore((s) => s.setInterim);
  const pushPolished = useStore((s) => s.pushPolished);

  // Kick the boundary/polish pipeline
  const evaluateBoundary = async () => {
    const st = useStore.getState();
    const transcript = st.finalTranscript;
    if (!transcript) return;

    // Skip if we already evaluated at this exact transcript length
    if (transcript === lastBoundaryAt.current) return;
    lastBoundaryAt.current = transcript;

    // Cancel any in-flight request — we have newer data
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;

    try {
      setStatus("thinking");
      const boundary = await detectBoundary(
        transcript,
        st.lastPolishedRaw || undefined,
        ctrl.signal,
        { sessionId: st.currentSessionId, personaId: st.personaId }
      );

      if (boundary.state === "mid") {
        setStatus("listening");
        return;
      }

      // Extract just the new portion since last polish
      const newPortion = st.lastPolishedRaw
        ? transcript
            .slice(transcript.indexOf(st.lastPolishedRaw) + st.lastPolishedRaw.length)
            .trim()
        : transcript.trim();

      if (!newPortion || newPortion.split(/\s+/).length < 3) {
        setStatus("listening");
        return;
      }

      setStatus("polishing");
      const history = st.polishedHistory.map((h) => h.polished);
      const polished = await polish(
        newPortion,
        st.personaId,
        history,
        ctrl.signal,
        st.currentSessionId
      );

      if (!polished) {
        setStatus("listening");
        return;
      }

      const item = {
        id: crypto.randomUUID(),
        raw: newPortion,
        polished,
        personaId: st.personaId,
        state: boundary.state as "complete" | "rambling",
        at: Date.now(),
      };
      pushPolished(item);

      // Persist to disk immediately so the talk survives crashes / refreshes.
      // Fire-and-forget — UI does not block on the save.
      const sessionId = useStore.getState().currentSessionId;
      if (sessionId) {
        appendSessionItem(sessionId, item).catch((e) =>
          console.error("[persist] failed to save item", e)
        );
      }

      // Refresh usage totals after each polish so the header pill stays current.
      fetchUsage()
        .then((u) => useStore.getState().setUsage(u))
        .catch(() => {
          /* non-fatal */
        });

      setStatus(useStore.getState().isMicOn ? "listening" : "idle");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error", (err as Error).message);
    }
  };

  // Schedule a debounced evaluation after each final chunk
  const scheduleEvaluate = () => {
    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(evaluateBoundary, 600);
  };

  // Start / stop microphone in response to store
  useEffect(() => {
    if (isMicOn) {
      // Auto-create a "talk" on disk if we don't have one yet.
      // This runs once per session, before the mic actually starts producing data.
      const st = useStore.getState();
      if (!st.currentSessionId) {
        createSession(st.personaId)
          .then((s) => {
            useStore.getState().setCurrentSession(s.id, s.title);
          })
          .catch((e) => {
            console.error("[session] failed to create", e);
            useStore
              .getState()
              .setStatus("error", "Could not start saving talk: " + e.message);
          });
      }

      provider.current = createBrowserSpeechProvider({
        onInterim: (t) => setInterim(t),
        onFinal: (t) => {
          appendFinal(t);
          scheduleEvaluate();
        },
        onError: (msg) => {
          setStatus("error", msg);
          setMicOn(false);
        },
        onEnd: () => {
          setStatus("idle");
        },
      });

      if (!provider.current.isSupported()) {
        setStatus(
          "error",
          "Speech recognition not supported in this browser. Use Chrome, Edge, or Safari."
        );
        setMicOn(false);
        return;
      }

      provider.current.start();
      setStatus("listening");
    } else {
      provider.current?.stop();
      provider.current = null;
      if (debounceTimer.current) {
        window.clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      inFlight.current?.abort();
      setStatus("idle");
    }

    return () => {
      provider.current?.stop();
      provider.current = null;
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
      inFlight.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMicOn]);
}
