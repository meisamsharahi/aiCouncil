# AI Council — Improvements Backlog

Confirmed enhancement opportunities. Not bugs — deliberate deferrals for a future phase.
Each item includes the affected files, the problem, and a recommended approach.

---

## Performance

### 1. Context Window Pruning ⚡ HIGH PRIORITY
**Files:** `app/meetings/[id]/page.tsx` → `buildHistory()`

**Problem:** In a 5-round meeting with 4 personas, the full message history is sent on every API call. History grows unbounded — users will hit token limits or accumulate large costs on long meetings.

**Naive fix to avoid:** A simple "last N messages" sliding window breaks debate continuity — Persona B loses the argument from Round 1 they are actively challenging in Round 3.

**Recommended approach:**
- Always keep all messages from the **current round** in full
- Keep the **most recent turn per persona** from each earlier round
- Never drop **facilitator messages** (type `"user"`) or **system announcements**
- Implement as a `pruneHistory(messages, currentRound)` utility in `lib/store.ts` and call it inside `buildHistory()`

---

### 2. Streaming Markdown Performance ✅ Done
**Files:** `components/MessageBubble.tsx`

Render plain `<p>` text while `isStreaming === true`, switch to full `<Markdown>` component only when streaming ends. Prevents expensive re-renders on every token during long responses.

---

## Resilience

### 3. Per-Turn Retry on Stream Failure ✅ Done
**Files:** `app/meetings/[id]/page.tsx`, `components/MessageBubble.tsx`, `lib/store.ts`

Error bubbles show a Retry button that replays the exact failed turn without re-running the rest of the meeting. Uses `overrideMessage` stored on the message for `direct_reply` replay.

---

### 4. Pre-flight API Key Validation
**Files:** `app/meetings/[id]/page.tsx`, `app/settings/page.tsx`

**Problem:** If a persona's provider has no API key configured, the meeting fails mid-run with a cryptic stream error. There is no warning at meeting start.

**Recommended approach:** Before the first round begins, check that every persona's provider has a key set in `settings`. Show a blocking warning dialog listing the missing keys, with a link to Settings. Do not start the meeting until resolved.

---

## Features

### 5. Shareable Read-Only Meeting Permalinks
**Files:** New route `app/meetings/[id]/share/page.tsx`

**Problem:** Meetings are stored only in `localStorage` — there is no way to share a completed debate with someone else.

**Recommended approach:** Add an export-to-URL feature that base64-encodes a stripped meeting snapshot (messages + persona names, no API keys) into a query param or hash. The share page reads from the URL and renders a read-only transcript view.

---

### 6. Persona Library Import / Export
**Files:** `app/personas/page.tsx`, `lib/store.ts`

**Problem:** Personas are trapped in one browser's `localStorage`. Power users who want to share their persona collections or move between devices have no option.

**Recommended approach:** Add Export (downloads `personas.json`) and Import (file picker, merges with de-duplication) buttons to the Personas page.

---

### 7. Meeting Branching
**Files:** `app/meetings/[id]/page.tsx`, `lib/store.ts`, `lib/types.ts`

**Problem:** Once a round is complete, there is no way to re-run it with different personas or a different facilitator prompt to compare outcomes.

**Recommended approach:** Add a "Branch from here" action on any completed round that forks the meeting state into a new meeting, preserving history up to that round and resetting `currentRound` and `status` to allow a fresh run forward.

---

### 8. Voice Output per Persona
**Files:** `components/MessageBubble.tsx`

**Problem:** Debates are text-only. For presentations or accessibility, having each persona speak in a distinct voice would be compelling.

**Recommended approach:** Add an optional TTS toggle. Use the browser's `SpeechSynthesis` API (zero cost, no API key) as a baseline, with an optional ElevenLabs voice ID per persona for higher quality. Fire TTS when `isStreaming` transitions from `true` to `false`.

---

### 9. Webhook / Headless Meeting Trigger
**Files:** New `app/api/run-meeting/route.ts`

**Problem:** Meetings can only be started from the UI. There is no way to trigger a meeting programmatically (e.g. from a CI pipeline, cron job, or external tool).

**Recommended approach:** Add a POST endpoint that accepts a meeting config payload, runs all rounds server-side (non-streaming), and returns the full transcript as JSON. Protect with a user-configured secret token stored in settings.

---

## Code Quality

### 10. Centralise Tailwind Colour Tokens
**Files:** `tailwind.config.ts`, all page and component files

**Problem:** The Teams palette (`#6264a7`, `#252437`, `#3d3b5c`, etc.) is repeated as inline hex strings across every file. A single palette change requires a grep-and-replace across 15+ files.

**Recommended approach:** Register the full palette as named colours in `tailwind.config.ts` (e.g. `teams-purple`, `surface-1`, `border-default`) so components use `bg-surface-1` instead of `bg-[#252437]`.
