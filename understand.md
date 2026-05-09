# understand.md — code & folder structure

A walkthrough of every file in Vaikhari and how data flows through it. Read this top-to-bottom to understand the codebase in ~10 minutes.

---

## Folder map

```
vaikhari/
├── server/                  # Node.js backend (Express). Holds the Anthropic API key.
│   ├── index.js             # All HTTP endpoints live here
│   ├── personas.js          # Tone style guides per persona
│   ├── storage.js           # File-based talk storage (CRUD + markdown export)
│   └── usage.js             # Token & cost tracking (record + summarize)
│
├── data/                    # Local persistence (all gitignored)
│   ├── sessions/            # One JSON file per saved talk
│   └── usage.json           # Append-only log of every Anthropic API call
│
├── src/                     # React frontend (Vite + TS + Tailwind)
│   ├── main.tsx             # React mount point
│   ├── App.tsx              # Top-level layout / tab composition
│   ├── index.css            # Tailwind base + custom CSS (scrollbars, animations)
│   ├── types.ts             # Shared TypeScript types
│   ├── vite-env.d.ts        # TS shims for Web Speech API (not in stock TS lib)
│   │
│   ├── lib/                 # Non-React logic (state, API, agent loop, mic)
│   │   ├── store.ts         # Zustand global store (single source of truth)
│   │   ├── api.ts           # fetch() wrappers for /api/* endpoints
│   │   ├── transcription.ts # Mic provider — pluggable (browser today, Deepgram later)
│   │   └── useCoach.ts      # The intelligent agent loop (the brain)
│   │
│   └── components/          # React UI pieces
│       ├── TabBar.tsx           # Coach / History / Usage tab switcher
│       ├── PersonaSelector.tsx  # Voice chips (CEO, Marketer, …)
│       ├── MicButton.tsx        # Big start/stop button
│       ├── LiveTranscript.tsx   # Small grey "what you're saying" panel
│       ├── PolishedFeed.tsx     # Main panel — list of polished thoughts
│       ├── CurrentTalkBar.tsx   # Active talk title + rename + end-talk
│       ├── HistoryView.tsx      # Past talks list + viewer + markdown export
│       ├── UsagePill.tsx        # Header chip: live tokens + cost
│       ├── UsageView.tsx        # Usage tab: totals, by model/persona/talk/day
│       └── SetupBanner.tsx      # Warning if ANTHROPIC_API_KEY is missing
│
├── index.html               # Vite entry HTML (loads main.tsx)
├── package.json             # npm scripts: `npm run dev` runs both server + web
├── vite.config.ts           # Vite config + proxy /api → localhost:3001
├── tailwind.config.js       # Custom colors (ink, accent), font, animations
├── postcss.config.js        # Tailwind + autoprefixer
├── tsconfig.json            # TypeScript settings
├── .env.example             # Template — copy to .env, paste your API key
├── .gitignore               # Excludes node_modules, .env, dist
└── README.md                # Setup instructions for new developers
```

---

## Data flow — from voice to polished thought

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER (frontend)                      │
│                                                                  │
│  [microphone]                                                    │
│       │                                                          │
│       ▼                                                          │
│  transcription.ts ──── Web Speech API ──── interim + final text  │
│       │                                                          │
│       ▼                                                          │
│  useCoach.ts (the agent loop)                                    │
│       │                                                          │
│       ├─ on every "final" chunk → write to store                 │
│       ├─ debounce 600 ms                                         │
│       ├─ call /api/detect-boundary                               │
│       └─ if 'complete' or 'rambling' → call /api/polish          │
│                                                                  │
│       │                                                          │
│       ▼                                                          │
│  store.ts (Zustand)                                              │
│       │                                                          │
│       ▼                                                          │
│  components/* read from store and render the UI                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │  fetch /api/*
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER (Express)                           │
│                                                                  │
│  /api/detect-boundary   →   Claude Haiku  →  { state: ... }      │
│  /api/polish            →   Claude Sonnet →  { polished: ... }   │
│                                                                  │
│  ANTHROPIC_API_KEY stays here — never sent to the browser.       │
└─────────────────────────────────────────────────────────────────┘
```

---

## File-by-file: what each file owns

### `server/index.js` — the backend
- Boots Express on port 3001.
- Reads `ANTHROPIC_API_KEY` from `.env` via `dotenv`.
- Three endpoints:
  - `GET /api/health` — UI uses this to detect "is the key set?"
  - `GET /api/personas` — list of available personas (id, name, tagline)
  - `POST /api/detect-boundary` — the cheap/fast Claude Haiku call. Decides if the user just finished a thought.
  - `POST /api/polish` — the higher-quality Claude Sonnet call. Returns the polished sentence.
- Why a backend at all? **Security.** If we called Anthropic directly from the browser, anyone could open dev tools and steal the API key.

### `server/personas.js` — the voice library
- One JS object per persona, each with `name`, `tagline`, and `styleGuide`.
- The `styleGuide` is injected into the polish prompt — it's the *real* difference between personas.
- To add a new persona: add an entry here and add the id to `PersonaId` in `src/types.ts`.

### `src/types.ts` — shared types
- `PersonaId`, `Persona`, `PolishedItem`, `AgentStatus`. Anything used in more than one file lives here.

### `src/lib/store.ts` — the state
- Single Zustand store. All UI state in one place.
- Key fields:
  - `isMicOn` — drives the agent loop on/off
  - `status` — agent state (idle / listening / thinking / polishing / error)
  - `finalTranscript` + `interimTranscript` — what the mic heard
  - `lastPolishedRaw` — used to figure out which part of the transcript is *new* and not yet polished
  - `polishedHistory` — list of polished items, also serves as call context
  - `personaId` — currently selected voice
- Components subscribe with `useStore((s) => s.thing)` — only re-render when *that* slice changes.

### `src/lib/transcription.ts` — the mic
- Defines a `TranscriptionProvider` interface — `start`, `stop`, `isSupported`.
- One implementation today: `createBrowserSpeechProvider` (Web Speech API).
- Tomorrow: add `createDeepgramProvider` with the same interface; swap by changing one line in `useCoach.ts`.
- Handles browser auto-stop on long silence — we restart automatically so the session feels continuous.

### `src/lib/api.ts` — fetch wrappers
- One function per backend endpoint: `fetchHealth`, `fetchPersonas`, `detectBoundary`, `polish`.
- All take `AbortSignal` so the agent loop can cancel in-flight requests when newer data arrives.

### `src/lib/useCoach.ts` — the brain (most important file)
- React hook. Mounted once in `App.tsx` (`useCoach()`).
- Watches `isMicOn` from the store:
  - When it flips on → starts the mic provider, updates store as transcripts come in.
  - When it flips off → stops the mic, cancels any pending requests.
- The pipeline (runs every time a final chunk arrives):
  1. Append the chunk to `finalTranscript`.
  2. Debounce 600 ms (so we don't fire on every word).
  3. Call `/api/detect-boundary` with the new portion.
  4. If `state === 'mid'` → do nothing.
  5. Otherwise → call `/api/polish` with persona + last 10 polished thoughts as context.
  6. Push result to `polishedHistory`.
- AbortController cancels stale requests when newer text arrives — prevents flickering.

### `src/App.tsx` — the page
- Boots: calls `fetchHealth` + `fetchPersonas` once on mount.
- Calls `useCoach()` to wire up the agent loop.
- Composes the layout: header → setup banner → persona selector → mic + live transcript row → polished feed.

### `src/components/*` — the visuals
- All dumb (no API calls, no agent logic). Read from store, render UI, dispatch user actions.
- `MicButton` — the big call-to-action.
- `PersonaSelector` — voice chips.
- `LiveTranscript` — shows what you're currently saying (interim italic, final regular).
- `PolishedFeed` — scrollable list with the latest item highlighted in accent blue.
- `SetupBanner` — only renders when `ANTHROPIC_API_KEY` is missing.

---

## "If I want to change X, where do I look?"

| Want to change…                                | File                                  |
| ---------------------------------------------- | ------------------------------------- |
| Add a new persona                              | `server/personas.js` + `src/types.ts` |
| Change the polish prompt / rules               | `server/index.js` (`/api/polish`)     |
| Swap to Deepgram for transcription             | `src/lib/transcription.ts`            |
| Tune debounce / when to poll the boundary      | `src/lib/useCoach.ts`                 |
| Change which Claude models are used            | `.env` (`BOUNDARY_MODEL`, `POLISH_MODEL`) |
| Restyle the UI (colors / fonts / spacing)      | `tailwind.config.js` + components     |
| Add a new endpoint                             | `server/index.js` + `src/lib/api.ts`  |
| Add a new piece of session state               | `src/lib/store.ts`                    |
| Change how talks are saved on disk              | `server/storage.js`                   |
| Add another export format (PDF, plaintext)      | `server/storage.js` + `server/index.js` |
| Update token pricing                            | `.env` (HAIKU/SONNET prices) or `server/usage.js` defaults |
| Add a new metric to the Usage tab               | `server/usage.js` (`getSummary`) + `src/components/UsageView.tsx` |

---

## Persistence — how talks are saved

Every polished thought is written to disk **immediately**, not at the end. If the app crashes or you close the tab, nothing is lost.

**File format** — one JSON file per talk at `data/sessions/<uuid>.json`:
```json
{
  "id": "<uuid>",
  "title": "Talk · May 9 · 1:30 PM",
  "personaId": "executive",
  "startedAt": 1715241000000,
  "endedAt": null,
  "items": [
    {
      "id": "<uuid>",
      "raw": "um so the the project is going pretty well",
      "polished": "The project is on track.",
      "personaId": "executive",
      "state": "complete",
      "at": 1715241010000
    }
  ]
}
```

**Lifecycle:**
1. **Mic on** → `useCoach` calls `POST /api/sessions` and stores the new session id.
2. **Each polish completes** → `useCoach` calls `POST /api/sessions/:id/items` (fire-and-forget, doesn't block UI).
3. **End talk** → `PATCH /api/sessions/:id { endedAt }` and the local state resets.
4. **History tab** → `GET /api/sessions` lists every file; clicking one calls `GET /api/sessions/:id`.
5. **Export** → `GET /api/sessions/:id/export` downloads a `.md` file with raw + polished side-by-side.

**Endpoint summary** (`server/index.js`):
| Endpoint                              | Purpose                            |
| ------------------------------------- | ---------------------------------- |
| `GET    /api/sessions`                | List all saved talks (summaries)   |
| `POST   /api/sessions`                | Create a new talk                  |
| `GET    /api/sessions/:id`            | Get one talk with all items        |
| `PATCH  /api/sessions/:id`            | Rename or set `endedAt`            |
| `DELETE /api/sessions/:id`            | Delete the file                    |
| `POST   /api/sessions/:id/items`      | Append a polished item             |
| `GET    /api/sessions/:id/export`     | Download as markdown               |

---

## Usage tracking — how cost is tracked

Every call to the Anthropic API goes through one of two endpoints (`/api/detect-boundary` or `/api/polish`). Both extract `result.usage.input_tokens` and `result.usage.output_tokens` from the SDK response and call `recordUsage()` from `server/usage.js`. The events are appended to `data/usage.json` via a serialized write chain (so concurrent requests can't trample each other).

**Pricing model.** `server/usage.js` ships with default per-token rates for Haiku and Sonnet. They're overridable via `.env` (`HAIKU_INPUT_PRICE`, `SONNET_INPUT_PRICE`, …) so they can be updated when Anthropic changes prices.

**No new API key needed.** All token accounting comes from the existing Anthropic API response. We never need to ask for a separate observability key.

**The numbers are estimates.** They're computed from the model's reported `usage` field and our local price config. The authoritative billing source is the [Anthropic Console](https://console.anthropic.com/settings/usage). The UI says this in plain text in the pill tooltip and the Usage tab.

**Endpoints:**
| Endpoint            | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `GET /api/usage`    | Full summary: total / byModel / byKind / byPersona / bySession / byDay / last7Days |

**Frontend hook.** After each successful polish, `useCoach.ts` calls `fetchUsage()` and writes the result to the store (`useStore.usage`). The header `UsagePill` and the `UsageView` tab both read from that single field.
