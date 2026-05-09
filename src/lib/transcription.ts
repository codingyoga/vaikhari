// Pluggable transcription provider. Today: browser Web Speech API.
// Tomorrow: swap in Deepgram by implementing the same interface.

export interface TranscriptionEvents {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}

export interface TranscriptionProvider {
  start(): void;
  stop(): void;
  isSupported(): boolean;
}

export function createBrowserSpeechProvider(
  events: TranscriptionEvents
): TranscriptionProvider {
  const Ctor =
    (window as Window).SpeechRecognition ||
    (window as Window).webkitSpeechRecognition;

  let rec: SpeechRecognition | null = null;
  let manualStop = false;

  const start = () => {
    if (!Ctor) {
      events.onError(
        "This browser does not support speech recognition. Please use Chrome, Edge, or Safari (latest)."
      );
      return;
    }
    manualStop = false;
    rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const transcript = r[0].transcript;
        if (r.isFinal) finalChunk += transcript;
        else interim += transcript;
      }
      if (finalChunk) events.onFinal(finalChunk.trim());
      if (interim) events.onInterim(interim.trim());
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are benign, don't surface as errors
      if (e.error === "no-speech" || e.error === "aborted") return;
      events.onError(`Speech recognition error: ${e.error}`);
    };

    rec.onend = () => {
      // Browser auto-stops on long silence. If the user didn't request stop,
      // restart it so the session feels continuous.
      if (!manualStop) {
        try {
          rec?.start();
        } catch {
          // already started; ignore
        }
      } else {
        events.onEnd();
      }
    };

    try {
      rec.start();
    } catch (err) {
      events.onError(
        err instanceof Error ? err.message : "Failed to start microphone"
      );
    }
  };

  const stop = () => {
    manualStop = true;
    try {
      rec?.stop();
    } catch {
      // ignore
    }
    rec = null;
  };

  const isSupported = () => !!Ctor;

  return { start, stop, isSupported };
}
