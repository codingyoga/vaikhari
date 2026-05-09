# backlog.md — next steps, prioritized

> Status legend: 🔥 high impact · ⚡ quick win · 🧪 experimental · 🛠 infra/quality

Items here are not committed work. They're candidates ranked by the value they'd add to the live-call experience.

## Up next (ship after Phase 1 lands)

### 🔥 1. Deepgram streaming transcription
**Why.** Web Speech API has three real problems on Zoom: (a) it auto-stops on long silence, (b) accuracy drops on accents and technical vocab, (c) it doesn't run in some Chromium variants.
**How.** Add `createDeepgramProvider` in `src/lib/transcription.ts` that opens a WebSocket to Deepgram's `nova-3` streaming endpoint. Backend endpoint `POST /api/transcription/token` issues short-lived tokens so the API key doesn't reach the browser. Toggle in Settings; default stays browser API for users without a key.
**Effort.** ~1 day.

### 🔥 2. Tauri desktop wrapper
**Why.** The product gets dramatically better when it can be a small floating panel that's *always on top* of Zoom, with a global hotkey to start/stop. Today users have to fake this with Chrome window pinning.
**How.** `npm create tauri-app` over the existing Vite project; reuse the entire React app. Add menu-bar icon + global hotkey via Tauri APIs.
**Effort.** ~2 days.

### 🔥 3. Hotkey teleprompter mode
**Why.** For high-stakes moments (asking the CEO a question, closing a sales pitch), you want to pre-script. Coach mode is for everyday flow; teleprompter is for the moment that matters.
**How.** Global hotkey (e.g. F9). Press → mute Zoom (via system audio API or just a "you're muted" reminder UI), enter teleprompter UI. Speak draft. Big readable polish appears. Press again to dismiss.
**Effort.** ~1 day on top of Tauri.

### ⚡ 4. Custom-named personas
**Why.** "CEO" is generic. Users want "my company's brand voice" or "Steve Jobs at WWDC."
**How.** Add a "Custom" persona in `server/personas.js`. Settings UI lets the user write a free-form style guide. Save in `data/personas.json`. Hot-reload on save.
**Effort.** ~half day.

### ⚡ 5. Polished thought reactions (👍 / 👎 / 🔁)
**Why.** Closes the feedback loop — we learn which polishes worked, and the user can ask for a regenerate without restarting.
**How.** Add `feedback` field on `PolishedItem`. 🔁 calls `/api/polish` again with a tweak hint ("make it shorter", "less corporate").
**Effort.** ~half day.

### ⚡ 6. Pin a polished thought
**Why.** During a meeting you sometimes want to keep one polished line on top of the feed for re-use ("our Q3 north-star metric is …").
**How.** A pin icon on each item. Pinned items render in a sticky header above the feed.
**Effort.** ~1 hour.

## Soon (a notch lower)

### 🔥 7. Post-talk summary
**Why.** Half the value of a saved talk is turning it into something — meeting notes, follow-up email, action items.
**How.** New endpoint `POST /api/sessions/:id/summarize?style=email|notes|actions`. Adds buttons in `HistoryView` detail panel.
**Effort.** ~1 day.

### 🔥 8. Coaching insights dashboard
**Why.** Over many talks, surface patterns: "you used 'basically' 47 times this week", "average sentence length 27 words (recommended 12-15)", "filler words are clustered at meeting starts." This is what turns a one-shot tool into a habit.
**How.** Background job that scans all sessions, computes stats, shows a chart on a new "Insights" tab.
**Effort.** ~2-3 days. Needs a stats library.

### ⚡ 9. Streaming polish
**Why.** Today the polished thought appears all-at-once after ~1-2 seconds. If we stream it, the first word appears in ~300ms and the full line in 1s — feels much faster.
**How.** Use Anthropic SSE streaming. Switch `/api/polish` to `text/event-stream`. Update `useCoach` to render token-by-token.
**Effort.** ~half day.

### ⚡ 10. Boundary detector — local model fallback
**Why.** Boundary detection runs every ~600ms and dominates API cost on long calls. Could be served by a small local model (or rules) without quality loss.
**How.** Replace Haiku call with a local heuristic for the simple cases (silence duration, sentence-ending punctuation, word count threshold). Fall back to Haiku only for ambiguous boundaries.
**Effort.** ~1 day. Reduces ongoing cost ~80%.

## Quality / infrastructure

### 🛠 11. Unit tests for the agent loop
The boundary detector and polish flow have edge cases (very short utterances, abort race conditions, server timeout). Pin them with vitest.

### 🛠 12. E2E test with a recorded audio file
Feed a known WAV through the pipeline and assert on the polished output's structure (not exact words — model output varies).

### 🛠 13. Better error UI
Today errors render as a red banner. Surface retry buttons and "report this" with the failing input redacted.

### 🛠 14. Backups + import/export
"Export all talks as zip" / "Import a zip from another machine."

### 🛠 15. Versioned migrations for sessions
If we change the JSON schema (e.g. add `feedback` to items), we need a `schemaVersion` field and a one-shot migration on startup.

## Experiments (might be great, might fizzle)

### 🧪 16. Whisper voice activity detection
Use Whisper's tiny model in the browser via WASM to do VAD (voice activity detection) more reliably than Web Speech API. Hybrid: WASM detects voice, Deepgram transcribes.

### 🧪 17. Real-time TTS readback (optional)
For users with reading difficulty, optionally read the polished line through a TTS voice via headphones (so other Zoom participants don't hear it). High risk of feedback loops; would gate behind an explicit opt-in.

### 🧪 18. "Mood" detection
Detect when the speaker is anxious, rushed, confused — adjust the polish to add gravitas, slow down the pacing, or simplify. Pure prompt engineering experiment.

### 🧪 19. Group call mode
Diarize multiple speakers. Polish each speaker's contributions separately. Could be a meeting-coach for entire teams.
