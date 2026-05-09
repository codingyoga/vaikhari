# Vaikhari

Real-time speech coach for live calls. You speak naturally on Zoom; Vaikhari listens, detects when you finish a thought, and shows a polished version in the voice you choose (Executive, Marketer, Technical, Friendly, Comedian).

> **Vaikhari** (वैखरी) — Sanskrit for *articulated speech*: thought made into clear, spoken form.

## How it works (Coach Mode)

```
your voice ─▶ Web Speech API ─▶ rolling transcript
                                       │
                              every 600ms after a final chunk
                                       ▼
                              Claude Haiku (boundary detector)
                              "is this a complete thought?"
                                       │
                          mid ──────────┘ stay quiet
                          complete | rambling
                                       ▼
                              Claude Sonnet (polisher)
                              ↳ remove fillers
                              ↳ tighten ramble into one line
                              ↳ match chosen persona
                              ↳ stay consistent with last 10 thoughts
                                       ▼
                              shown in side panel — glance and use
```

You stay unmuted. The polished version appears beside Zoom for you to read or use as a model for your next thought.

## Setup

### 1. Install
```bash
npm install
```

### 2. Add your Anthropic API key
Get one at https://console.anthropic.com/settings/keys (free tier includes credits).

```bash
cp .env.example .env
# then edit .env and paste your key into ANTHROPIC_API_KEY=
```

### 3. Run
```bash
npm run dev
```

Opens:
- **Frontend** — http://localhost:5173
- **Backend** — http://localhost:3001

### 4. Use it on Zoom
1. Open the app in a small Chrome window.
2. Right-click the Chrome tab → "Move tab to new window", then resize and pin it.
3. Pick a persona, click **Start listening**, and start your Zoom call.
4. Polished thoughts appear on the side as you speak.

## Project layout

```
vaikhari/
├── server/                # Express backend (keeps API key server-side)
│   ├── index.js           # /api/health, /api/detect-boundary, /api/polish
│   └── personas.js        # tone style guides for each persona
├── src/
│   ├── App.tsx            # main layout
│   ├── components/        # PersonaSelector, MicButton, LiveTranscript, PolishedFeed
│   └── lib/
│       ├── api.ts         # fetch wrappers for /api endpoints
│       ├── store.ts       # zustand state
│       ├── transcription.ts  # pluggable mic provider (browser today, Deepgram later)
│       └── useCoach.ts    # the agent loop: debounce → boundary → polish
└── .env                   # ANTHROPIC_API_KEY lives here (never commit)
```

## Roadmap

These are slots ready for future features:

- **Deepgram streaming** — drop-in replacement in `src/lib/transcription.ts` for higher-accuracy real-time transcription.
- **Hotkey teleprompter mode** — mute Zoom, speak draft, get polish for important statements.
- **Tauri wrapper** — true native Mac overlay window, always-on-top, global hotkeys.
- **Custom personas** — let the user define their own tone (e.g. "my CEO writing style").
- **Post-call summary** — turn the full polished feed into meeting notes / follow-up email.
- **Multi-language** — change `lang` in transcription provider.

## Costs

Per-minute API cost ballpark (varies with how much you talk):
- Claude Haiku for boundary detection: ~$0.001/min
- Claude Sonnet for polishing: ~$0.005–0.02/min

A 1-hour call typically lands well under $1.
