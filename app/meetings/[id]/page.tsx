"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { streamLLMResponse } from "@/lib/llm";
import { triggerMarkdownExport, triggerJSONExport } from "@/lib/export";
import MessageBubble from "@/components/MessageBubble";
import type { MeetingMessage, Persona, ChatMessage } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import {
  Play,
  Pause,
  CheckCircle,
  Send,
  Download,
  FileText,
  FileJson,
} from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildBroadcastText(
  meeting: { title: string; description: string; agenda?: string },
  participants: { name: string; role: string; isYou: boolean }[],
  totalRounds: number
): string {
  const list = participants
    .map((p, i) => `  ${i + 1}. ${p.name} (${p.role})${p.isYou ? "        ← that's you" : ""}`)
    .join("\n");

  return [
    `=== COUNCIL MEETING BRIEF ===`,
    `Meeting: "${meeting.title}"`,
    meeting.description ? meeting.description : null,
    meeting.agenda ? `Agenda:\n${meeting.agenda}` : null,
    `\nYou are one of ${participants.length} participants in a structured council discussion.`,
    `Each participant speaks in turn — this is your chance to make your case,`,
    `challenge others, ask hard questions, and help the group reach a conclusion.`,
    `\nParticipants (in speaking order):\n${list}`,
    `\nTotal rounds: ${totalRounds}`,
    `You will speak once per round. Use your turns wisely.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildTurnInstruction(
  round: number,
  totalRounds: number,
  isSynthesis: boolean,
  approxWords: number,
  facilitatorNote?: string
): string {
  const noteBlock = facilitatorNote
    ? `\n⚠ FACILITATOR NOTE: "${facilitatorNote}"\nThe facilitator has asked you to address this directly in your response.`
    : "";
  const wordHint = `Aim for ~${approxWords} words.`;

  if (isSynthesis) {
    return [
      `=== SYNTHESIS ===`,
      `The structured rounds are complete. Your task now is different:`,
      `Do not repeat your previous arguments.`,
      `Instead, synthesize:`,
      `  - What points of agreement emerged across the group?`,
      `  - Where does genuine disagreement remain, and why?`,
      `  - What is your verdict on the original question?`,
      `Keep it concise. This is a conclusion, not another round.`,
      wordHint,
      noteBlock,
    ].filter(Boolean).join("\n");
  }

  if (round === 1) {
    return [
      `=== YOUR TURN — Round 1 of ${totalRounds} ===`,
      `This is the opening round. Introduce your perspective on the topic.`,
      `State your position clearly. You'll have ${totalRounds - 1} more round(s) to respond to what others say.`,
      wordHint,
      noteBlock,
    ].filter(Boolean).join("\n");
  }

  if (round >= totalRounds) {
    return [
      `=== YOUR TURN — Round ${round} of ${totalRounds} (final round) ===`,
      `This is your last turn. Do not introduce new topics.`,
      `Respond to the strongest arguments made against your position.`,
      `State your final stance and what, if anything, has changed your thinking.`,
      wordHint,
      noteBlock,
    ].filter(Boolean).join("\n");
  }

  return [
    `=== YOUR TURN — Round ${round} of ${totalRounds} ===`,
    `You've heard from the other participants. This is your chance to:`,
    `- Challenge points you disagree with (name the person and the point)`,
    `- Build on ideas you find compelling`,
    `- Shift your position if the evidence warrants it`,
    `- Ask a direct question to a specific participant`,
    wordHint,
    noteBlock,
  ].filter(Boolean).join("\n");
}

function parseMention(
  text: string,
  personaNames: string[]
): { personaName: string; message: string } | null {
  if (!text.startsWith("@")) return null;
  // Try longest name first so "Computer Teacher" wins over "Computer"
  const sorted = [...personaNames].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const prefix = `@${name} `;
    if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
      const message = text.slice(prefix.length).trim();
      if (message) return { personaName: name, message };
    }
  }
  return null;
}

// ─── main component ──────────────────────────────────────────────────────────

export default function MeetingRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const store = useStore();
  const meeting = store.getMeetingById(id);
  const allPersonas = store.personas;
  const settings = store.settings;
  const deleteMessage = store.deleteMessage;

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoPaused, setAutoPaused] = useState(false);
  const [startError, setStartError] = useState("");
  const [mentionQueue, setMentionQueue] = useState<
    { personaName: string; message: string }[]
  >([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [mentionAnchor, setMentionAnchor] = useState<number | null>(null);
  const [mentionFilter, setMentionFilter] = useState("");
  const streamingMsgIdRef = useRef<string | null>(null);
  const autoPausedRef = useRef(autoPaused);
  autoPausedRef.current = autoPaused;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleConfirmRef = useRef<() => Promise<void>>(async () => {});

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [meeting?.messages.length]);

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Meeting not found.</p>
      </div>
    );
  }

  // Non-null alias — safe after the guard above
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const m = meeting!;

  const participants = m.personaRefs
    .map((ref) => allPersonas.find((p) => p.id === ref.personaId))
    .filter((p): p is Persona => !!p);

  const personaMap = new Map(allPersonas.map((p) => [p.id, p]));

  // Build conversation history for a persona (up to this point)
  function buildHistory(personaId: string): ChatMessage[] {
    const history: ChatMessage[] = [];
    for (const msg of m.messages) {
      if (msg.type === "system") continue;
      if (msg.isStreaming) continue;
      if (msg.type === "persona" || msg.type === "direct_reply") {
        const p = personaMap.get(msg.personaId ?? "");
        if (msg.personaId === personaId) {
          history.push({ role: "assistant", content: msg.content });
        } else {
          const roundLabel = msg.round ? `Round ${msg.round} — ` : "";
          history.push({
            role: "user",
            content: `[${roundLabel}${p?.name ?? "Persona"} (${p?.role ?? ""})]: ${msg.content}`,
          });
        }
      } else if (msg.type === "user") {
        history.push({ role: "user", content: `[Facilitator]: ${msg.content}` });
      }
    }
    return history;
  }

  // ── Add message helpers ───────────────────────────────────────────────────

  function addSystemMsg(content: string) {
    const msg: MeetingMessage = {
      id: uuidv4(),
      meetingId: id,
      type: "system",
      content,
      isStreaming: false,
      timestamp: new Date().toISOString(),
    };
    store.addMessage(id, msg);
    return msg;
  }

  function addPersonaMsg(
    personaId: string,
    round: number,
    type: "persona" | "direct_reply" = "persona",
    mentionedPersonaId?: string,
    isSynthesis = false,
    overrideMessage?: string
  ): string {
    const msgId = uuidv4();
    const msg: MeetingMessage = {
      id: msgId,
      meetingId: id,
      type,
      personaId,
      content: "",
      round,
      isSynthesis: isSynthesis || undefined,
      isStreaming: true,
      mentionedPersonaId,
      overrideMessage,
      timestamp: new Date().toISOString(),
    };
    store.addMessage(id, msg);
    return msgId;
  }

  function addNoteTakerMsg(): string {
    const msgId = uuidv4();
    const msg: MeetingMessage = {
      id: msgId,
      meetingId: id,
      type: "note_taker",
      content: "",
      isStreaming: true,
      timestamp: new Date().toISOString(),
    };
    store.addMessage(id, msg);
    return msgId;
  }

  // ── Stream a persona response ─────────────────────────────────────────────

  async function streamPersonaResponse(
    persona: Persona,
    round: number,
    msgType: "persona" | "direct_reply" = "persona",
    overrideMessage?: string,
    mentionedPersonaId?: string,
    skipAutoAdvance = false,
    isSynthesis = false
  ) {
    // Build broadcast text — mark this persona as "← that's you"
    const broadcastParticipants = m.personaRefs.map((ref) => {
      const p = allPersonas.find((x) => x.id === ref.personaId);
      return { name: p?.name ?? "?", role: p?.role ?? "?", isYou: ref.personaId === persona.id };
    });
    const broadcastText = buildBroadcastText(m, broadcastParticipants, m.rounds);

    // Phase 5: maxTokens = target words; API cutoff = words × 1.5
    const approxWords = persona.maxTokens ?? 400;
    const apiMaxTokens = Math.round(approxWords * 1.5);

    const conductRules = `

CONDUCT RULES:
- You are "${persona.name}". Speak in first person only. Do not write "${persona.name}:" before your text.
- You may freely reference, agree with, challenge, or quote other participants.
- Never write text formatted as coming FROM another participant (no "[OtherName]: ...").
- If a previous message appears cut off, treat it as complete. Do not finish it.
- DOMAIN DISCIPLINE: Your role is "${persona.role}". Before writing anything, ask yourself: is the current topic directly and specifically within my professional domain? If NO, your ENTIRE response must be 1–2 sentences only — one sentence acknowledging you are not the right person for this topic, one sentence naming who is better placed. Then stop completely. BANNED: analogies between your field and the current topic ("just like in baking..."), philosophical reflections on shared principles, "lessons that apply universally", commentary on what both disciplines have in common, any paragraph that starts with a concession and then pivots to extended commentary. A baker attending a code review has nothing substantive to say — not even "precision matters in both fields." Say nothing beyond the 2-sentence deferral.`;

    const systemPrompt = `${persona.systemPrompt}${conductRules}\n\n${broadcastText}`;
    const history = buildHistory(persona.id);

    // Latest facilitator message (injected as ⚠ FACILITATOR NOTE in the turn instruction)
    const latestFacilitatorNote = [...m.messages]
      .reverse()
      .find((msg) => msg.type === "user")?.content;

    // Build the final user message — always appended so the last message is always "user"
    let finalHistory: ChatMessage[];
    if (overrideMessage) {
      finalHistory = [...history, { role: "user", content: overrideMessage }];
    } else {
      const turnInstruction = buildTurnInstruction(
        round,
        m.rounds,
        isSynthesis,
        approxWords,
        latestFacilitatorNote
      );
      finalHistory = [...history, { role: "user", content: turnInstruction }];
    }

    const msgId = addPersonaMsg(persona.id, round, msgType, mentionedPersonaId, isSynthesis, overrideMessage);
    streamingMsgIdRef.current = msgId;
    setIsStreaming(true);

    let accumulated = "";

    await streamLLMResponse({
      provider: persona.provider,
      model: persona.model,
      systemPrompt,
      messages: finalHistory,
      settings,
      maxTokens: apiMaxTokens,
      onChunk: (chunk) => {
        accumulated += chunk;
        store.updateMessage(id, msgId, { content: accumulated });
      },
      onTruncated: () => {
        accumulated += " *[response reached token limit]*";
        store.updateMessage(id, msgId, { content: accumulated });
      },
      onDone: () => {
        store.updateMessage(id, msgId, { isStreaming: false });
        streamingMsgIdRef.current = null;
        setIsStreaming(false);
        // Drain mention queue if any
        setMentionQueue((q) => q); // trigger re-render, handled via effect
        // Auto-advance to next speaker if autopilot is on
        if (m.autoAdvance && !autoPausedRef.current && !skipAutoAdvance && msgType !== "direct_reply") {
          setTimeout(() => {
            if (!autoPausedRef.current) handleConfirmRef.current();
          }, 1500);
        }
      },
      onError: (error) => {
        store.updateMessage(id, msgId, {
          content: `[Error: ${error}]`,
          isStreaming: false,
        });
        streamingMsgIdRef.current = null;
        setIsStreaming(false);
      },
    });
  }

  // ── Council Verdict (shared synthesis) ───────────────────────────────────

  function addCouncilVerdictMsg(): string {
    const msgId = uuidv4();
    const msg: MeetingMessage = {
      id: msgId,
      meetingId: id,
      type: "council_verdict",
      content: "",
      isStreaming: true,
      timestamp: new Date().toISOString(),
    };
    store.addMessage(id, msg);
    return msgId;
  }

  async function runCouncilVerdict() {
    // Use the first persona's provider/model as the neutral summariser
    const anchor = participants[0];
    if (!anchor) return;

    addSystemMsg("Generating Council Verdict…");

    // Build synthesis statements only
    const synthLines: string[] = [];
    for (const msg of m.messages) {
      if (!msg.isSynthesis || msg.isStreaming) continue;
      const p = personaMap.get(msg.personaId ?? "");
      synthLines.push(`[${p?.name ?? "?"} (${p?.role ?? ""})]: ${msg.content}`, "");
    }

    const systemPrompt = `You are a neutral council chair. You have observed a structured AI council discussion and the individual closing statements from each participant.
Your task is to produce a single, unified Council Verdict.
Be concise, impartial, and decisive. Do not attribute opinions to individuals — synthesize across all of them.`;

    const userMessage = `Meeting: "${m.title}"
${m.description ? `Description: ${m.description}` : ""}

=== INDIVIDUAL SYNTHESIS STATEMENTS ===

${synthLines.join("\n")}
---

Produce a COUNCIL VERDICT:
- State the group's overall consensus (if any)
- Identify any remaining disagreements and why they matter
- Give a clear, actionable recommendation or conclusion

Keep it under 300 words.`;

    const msgId = addCouncilVerdictMsg();
    streamingMsgIdRef.current = msgId;
    setIsStreaming(true);

    let accumulated = "";

    await streamLLMResponse({
      provider: anchor.provider,
      model: anchor.model,
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      settings,
      maxTokens: 600,
      onChunk: (chunk) => {
        accumulated += chunk;
        store.updateMessage(id, msgId, { content: accumulated });
      },
      onTruncated: () => {
        accumulated += " *[response reached token limit]*";
        store.updateMessage(id, msgId, { content: accumulated });
      },
      onDone: () => {
        store.updateMessage(id, msgId, { isStreaming: false });
        streamingMsgIdRef.current = null;
        setIsStreaming(false);
      },
      onError: (error) => {
        store.updateMessage(id, msgId, {
          content: `[Council Verdict Error: ${error}]`,
          isStreaming: false,
        });
        streamingMsgIdRef.current = null;
        setIsStreaming(false);
      },
    });
  }

  // ── Note Taker ────────────────────────────────────────────────────────────

  async function runNoteTaker() {
    const ntProvider = m.noteTakerProvider;
    const ntModel = m.noteTakerModel;
    if (!m.noteTakerEnabled || !ntProvider || !ntModel) return;

    addSystemMsg("Note Taker is summarizing the meeting…");

    // Build transcript text for the Note Taker
    const lines: string[] = [
      `Meeting: "${m.title}"`,
      m.description ? `Description: ${m.description}` : "",
      m.agenda ? `Agenda: ${m.agenda}` : "",
      "",
      "=== TRANSCRIPT ===",
      "",
    ].filter(Boolean);

    for (const msg of m.messages) {
      if (msg.isStreaming || msg.type === "system" || msg.type === "note_taker") continue;
      if (msg.type === "user") {
        lines.push(`[Facilitator]: ${msg.content}`, "");
      } else {
        const p = personaMap.get(msg.personaId ?? "");
        const roundPart = msg.isSynthesis ? "Synthesis" : msg.round ? `Round ${msg.round}` : "";
        const directPart = msg.type === "direct_reply" ? " · Direct Reply" : "";
        lines.push(`[${roundPart}${directPart} — ${p?.name ?? "?"} (${p?.role ?? ""})]: ${msg.content}`, "");
      }
    }

    const transcript = lines.join("\n");

    const systemPrompt = `You are a neutral, precise note-taker. You have observed a structured AI council discussion.
Your task is to produce two sections based solely on what was said.
Do not editorialize. Do not take sides. Report what actually happened in the discussion.`;

    const userMessage = `${transcript}

---

Produce two sections:

## Summary
Describe each participant's position, the key arguments made, any significant shifts in thinking, and the overall arc of the discussion. Be concise but complete.

## Action Items
List concrete next steps, decisions, or recommendations that emerged. If participants reached consensus on anything, note it. If no explicit action items were stated, infer the most reasonable ones from the discussion.`;

    const msgId = addNoteTakerMsg();
    streamingMsgIdRef.current = msgId;
    setIsStreaming(true);

    let accumulated = "";

    await streamLLMResponse({
      provider: ntProvider,
      model: ntModel,
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      settings,
      maxTokens: 2000,
      onChunk: (chunk) => {
        accumulated += chunk;
        store.updateMessage(id, msgId, { content: accumulated });
      },
      onTruncated: () => {
        accumulated += " *[response reached token limit]*";
        store.updateMessage(id, msgId, { content: accumulated });
      },
      onDone: () => {
        store.updateMessage(id, msgId, { isStreaming: false });
        streamingMsgIdRef.current = null;
        setIsStreaming(false);
      },
      onError: (error) => {
        store.updateMessage(id, msgId, {
          content: `[Note Taker Error: ${error}]`,
          isStreaming: false,
        });
        streamingMsgIdRef.current = null;
        setIsStreaming(false);
      },
    });
  }

  // Drain mention queue when streaming ends
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const drainQueue = useCallback(async () => {
    if (isStreaming || mentionQueue.length === 0) return;
    const [next, ...rest] = mentionQueue;
    setMentionQueue(rest);
    const persona = participants.find(
      (p) => p.name.toLowerCase() === next.personaName.toLowerCase()
    );
    if (!persona) {
      addSystemMsg(`@${next.personaName} — persona not found in this meeting.`);
      return;
    }
    await streamPersonaResponse(
      persona,
      m.currentRound || 1,
      "direct_reply",
      next.message,
      persona.id
    );
  }, [isStreaming, mentionQueue]); // eslint-disable-line

  useEffect(() => {
    drainQueue();
  }, [isStreaming, drainQueue]);

  // ── Start meeting ─────────────────────────────────────────────────────────

  async function handleStart() {
    setStartError("");

    // Pre-flight: verify API keys for all providers used in this meeting
    const keyMap: Record<string, string> = {
      claude: settings.claudeApiKey,
      openai: settings.openaiApiKey,
      gemini: settings.geminiApiKey,
      ollama: settings.ollamaBaseUrl,
    };
    const usedProviders = [...new Set(participants.map((p) => p.provider))];
    const missing = usedProviders.filter((p) => !keyMap[p]?.trim());
    if (missing.length > 0) {
      const labels: Record<string, string> = { claude: "Anthropic (Claude)", openai: "OpenAI", gemini: "Google (Gemini)", ollama: "Ollama base URL" };
      setStartError(`Missing ${missing.map((p) => labels[p] ?? p).join(", ")} — add it in Settings.`);
      return;
    }

    store.updateMeeting(id, {
      status: "in_progress",
      currentRound: 1,
      currentSpeakerIndex: 0,
      startedAt: new Date().toISOString(),
    });

    const participantList = participants
      .map((p, i) => `${i + 1}. ${p.emoji} ${p.name} (${p.role})`)
      .join("\n");

    addSystemMsg(
      `Meeting started: "${m.title}"\n\nParticipants:\n${participantList}\n\nRound 1 begins.`
    );

    // Start first speaker
    if (participants.length > 0) {
      const first = participants[0];
      setTimeout(() => {
        streamPersonaResponse(first, 1);
      }, 100);
    }
  }

  // ── Confirm & Continue ────────────────────────────────────────────────────

  async function handleConfirm() {
    if (isStreaming) return;

    const currentIdx = m.currentSpeakerIndex;
    const nextIdx = currentIdx + 1;

    // If there are more speakers in this round
    if (nextIdx < participants.length) {
      store.updateMeeting(id, { currentSpeakerIndex: nextIdx });
      const nextPersona = participants[nextIdx];
      await streamPersonaResponse(nextPersona, m.currentRound);
    } else {
      // Round done — start next round or finish
      const nextRound = m.currentRound + 1;

      if (nextRound <= m.rounds) {
        store.updateMeeting(id, { currentRound: nextRound, currentSpeakerIndex: 0 });
        addSystemMsg(`Round ${nextRound} begins.`);
        const first = participants[0];
        await streamPersonaResponse(first, nextRound);
      } else if (m.synthesisMode === "individual" || m.synthesisMode === "shared" || (!m.synthesisMode && m.synthesisEnabled)) {
        // Synthesis round — don't bump currentRound past m.rounds
        store.updateMeeting(id, { currentSpeakerIndex: 0 });
        addSystemMsg(`All rounds complete. Synthesis round — each persona will give a closing statement.`);
        for (const persona of participants) {
          if (!isStreaming) {
            await streamPersonaResponse(
              persona,
              nextRound,
              "persona",
              undefined,
              undefined,
              true,  // skipAutoAdvance — synthesis loop manages its own flow
              true   // isSynthesis — use synthesis turn instruction
            );
          }
        }
        // Shared mode: generate unified council verdict after all individual synthesis
        if (m.synthesisMode === "shared") {
          await runCouncilVerdict();
        }
        store.updateMeeting(id, {
          status: "completed",
          completedAt: new Date().toISOString(),
        });
        addSystemMsg("Meeting completed.");
        await runNoteTaker();
      } else {
        store.updateMeeting(id, {
          status: "completed",
          completedAt: new Date().toISOString(),
        });
        addSystemMsg("All rounds complete. Meeting ended.");
        await runNoteTaker();
      }
    }
  }

  // Keep ref fresh so auto-advance timer always calls the latest version
  handleConfirmRef.current = handleConfirm;

  // ── Send user message / @mention ──────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    const mention = parseMention(text, participants.map((p) => p.name));

    // Always add user message to transcript
    const userMsg: MeetingMessage = {
      id: uuidv4(),
      meetingId: id,
      type: "user",
      content: text,
      isStreaming: false,
      timestamp: new Date().toISOString(),
    };
    store.addMessage(id, userMsg);

    if (mention) {
      const persona = participants.find(
        (p) => p.name.toLowerCase() === mention.personaName.toLowerCase()
      );
      if (!persona) {
        addSystemMsg(`@${mention.personaName} — persona not found in this meeting.`);
        return;
      }
      if (isStreaming) {
        setMentionQueue((q) => [...q, mention]);
        addSystemMsg(`@${mention.personaName} queued — will respond after current speaker finishes.`);
      } else {
        await streamPersonaResponse(
          persona,
          m.currentRound || 1,
          "direct_reply",
          mention.message,
          persona.id
        );
      }
    }
    // If no @mention and meeting is in_progress, the user comment is just noted
    // — next speaker is triggered by Confirm & Continue
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setInput(val);

    // Detect @mention trigger at cursor
    const cursorPos = e.target.selectionStart ?? val.length;
    const textUpToCursor = val.slice(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionAnchor(mentionMatch.index!);
      setMentionFilter(mentionMatch[1].toLowerCase());
    } else {
      setMentionAnchor(null);
      setMentionFilter("");
    }
  }

  function applyMention(persona: Persona) {
    const before = input.slice(0, mentionAnchor!);
    // skip past "@partialName" — anchor + 1 (@) + filter length
    const after = input.slice(mentionAnchor! + 1 + mentionFilter.length);
    setInput(`${before}@${persona.name} ${after}`);
    setMentionAnchor(null);
    setMentionFilter("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      setMentionAnchor(null);
      setMentionFilter("");
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const mentionSuggestions =
    mentionAnchor !== null
      ? participants.filter((p) =>
          p.name.toLowerCase().startsWith(mentionFilter)
        )
      : [];

  // ── Render ────────────────────────────────────────────────────────────────

  const canStart = m.status === "draft" && participants.length > 0;
  const canConfirm =
    m.status === "in_progress" &&
    !isStreaming &&
    m.messages.some((msg) => msg.type === "persona");
  const isCompleted = m.status === "completed";

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#3d3b5c] bg-[#252437] flex-shrink-0">
        <div>
          <h1 className="font-semibold text-[#f5f5f5]">{m.title}</h1>
          <p className="text-xs text-[#78788a]">
            {participants.length} persona{participants.length !== 1 ? "s" : ""} ·{" "}
            {m.rounds} round{m.rounds !== 1 ? "s" : ""}
            {m.status === "in_progress" &&
              ` · Round ${m.currentRound}/${m.rounds}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Autopilot pause/resume — only visible when autoAdvance is on */}
          {m.autoAdvance && m.status === "in_progress" && !isCompleted && (
            <button
              onClick={() => {
                setAutoPaused((p) => {
                  const resuming = p; // p is current value (true = was paused, now resuming)
                  if (resuming) {
                    // Resuming — if a stream has finished and we're waiting, trigger advance
                    setTimeout(() => handleConfirmRef.current(), 1500);
                  }
                  return !p;
                });
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-colors ${
                autoPaused
                  ? "bg-[#6264a7]/20 border-[#6264a7]/40 text-[#bdbde6] hover:bg-[#6264a7]/30"
                  : "bg-[#2f2d47] border-[#3d3b5c] text-[#b0afc8] hover:text-[#f5f5f5] hover:bg-[#39365a]"
              }`}
            >
              {autoPaused ? <Play size={13} /> : <Pause size={13} />}
              {autoPaused ? "Resume Autopilot" : "Pause Autopilot"}
            </button>
          )}

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#b0afc8] hover:text-[#f5f5f5] bg-[#2f2d47] hover:bg-[#39365a] border border-[#3d3b5c] rounded-xl transition-colors"
            >
              <Download size={13} />
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 bg-[#2f2d47] border border-[#3d3b5c] rounded-2xl shadow-xl z-10 overflow-hidden">
                <button
                  onClick={() => {
                    triggerMarkdownExport(m, allPersonas);
                    setExportOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#b0afc8] hover:bg-[#39365a] transition-colors"
                >
                  <FileText size={14} />
                  Markdown
                </button>
                <button
                  onClick={() => {
                    triggerJSONExport(m, allPersonas);
                    setExportOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-[#b0afc8] hover:bg-[#39365a] transition-colors"
                >
                  <FileJson size={14} />
                  JSON
                </button>
              </div>
            )}
          </div>

          {/* Participant avatars */}
          <div className="flex -space-x-1.5">
            {participants.slice(0, 5).map((p) => (
              <div
                key={p.id}
                title={p.name}
                className="w-7 h-7 rounded-xl flex items-center justify-center text-sm ring-2 ring-[#252437]"
                style={{ background: p.color }}
              >
                {p.emoji}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-1"
      >
        {m.messages.length === 0 && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-[#78788a] mb-2">Meeting not started yet.</p>
              {canStart && (
                <button
                  onClick={handleStart}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors mx-auto"
                >
                  <Play size={14} />
                  Start Meeting
                </button>
              )}
              {startError && (
                <p className="mt-3 text-xs text-red-400 max-w-xs mx-auto">{startError}</p>
              )}
            </div>
          </div>
        )}

        {m.messages.map((msg) => {
          const isErrorMsg = msg.content.startsWith("[Error:") || msg.content.startsWith("[Note Taker Error:") || msg.content.startsWith("[Council Verdict Error:");
          let onRetry: (() => void) | undefined;
          if (isErrorMsg && !isStreaming && (msg.type === "persona" || msg.type === "direct_reply")) {
            const persona = msg.personaId ? personaMap.get(msg.personaId) : undefined;
            if (persona) {
              onRetry = () => {
                deleteMessage(id, msg.id);
                streamPersonaResponse(
                  persona,
                  msg.round ?? m.currentRound,
                  msg.type as "persona" | "direct_reply",
                  msg.overrideMessage,
                  msg.mentionedPersonaId,
                  false,
                  !!msg.isSynthesis
                );
              };
            }
          }
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              persona={msg.personaId ? personaMap.get(msg.personaId) : undefined}
              totalRounds={m.rounds}
              onRetry={onRetry}
            />
          );
        })}
      </div>

      {/* Controls */}
      {m.status !== "draft" && (
        <div className="flex-shrink-0 border-t border-[#3d3b5c] bg-[#252437] px-4 py-3 space-y-2">
          {/* Confirm button — hidden when autopilot is running, shown when paused or off */}
          {canConfirm && !isCompleted && (!m.autoAdvance || autoPaused) && (
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 w-full justify-center py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-sm font-medium rounded-xl transition-colors"
            >
              <CheckCircle size={15} />
              Confirm & Continue
            </button>
          )}

          {/* Autopilot running indicator */}
          {canConfirm && !isCompleted && m.autoAdvance && !autoPaused && !isStreaming && (
            <p className="text-xs text-[#78788a] text-center animate-pulse">
              Autopilot — advancing in 1.5s…
            </p>
          )}

          {isCompleted && (
            <div className="flex items-center justify-center gap-2 py-2.5 text-slate-500 text-sm">
              <CheckCircle size={15} className="text-emerald-500" />
              Meeting completed
            </div>
          )}

          {/* Input */}
          {!isCompleted && (
            <div className="relative flex items-end gap-2">
              {/* @mention suggestion dropdown */}
              {mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#2f2d47] border border-[#3d3b5c] rounded-2xl shadow-xl z-20 overflow-hidden min-w-[180px]">
                  <p className="text-[10px] text-[#78788a] font-medium uppercase tracking-wide px-3 pt-2 pb-1">
                    Mention persona
                  </p>
                  {mentionSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // keep textarea focus
                        applyMention(p);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-[#39365a] transition-colors text-left"
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                        style={{ background: p.color }}
                      >
                        {p.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-[#f5f5f5] font-medium truncate">{p.name}</p>
                        <p className="text-[10px] text-[#78788a] truncate">{p.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder='Comment or @PersonaName to address directly…'
                className="flex-1 bg-[#2f2d47] border border-[#3d3b5c] rounded-2xl px-4 py-2.5 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7] resize-none"
                style={{ minHeight: 42, maxHeight: 120 }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                className="p-2.5 bg-[#6264a7] hover:bg-[#7b83eb] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl transition-colors flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          )}

          {isStreaming && (() => {
            const streamingMsg = m.messages.findLast((msg) => msg.isStreaming);
            const isNoteTaker = streamingMsg?.type === "note_taker";
            const isVerdict = streamingMsg?.type === "council_verdict";
            const label = isNoteTaker ? "📋 Note Taker"
              : isVerdict ? "⚖️ Council Verdict"
              : (participants.find((p) => p.id === streamingMsg?.personaId)?.name ?? "Persona");
            const verb = (isNoteTaker || isVerdict) ? "is generating" : "is thinking";
            return (
              <p className="text-xs text-[#78788a] text-center animate-pulse">
                {label} {verb}…
              </p>
            );
          })()}
        </div>
      )}

      {/* Draft — start button at bottom */}
      {m.status === "draft" && m.messages.length > 0 && canStart && (
        <div className="flex-shrink-0 border-t border-[#3d3b5c] bg-[#252437] px-4 py-3 space-y-2">
          {startError && (
            <p className="text-xs text-red-400 text-center">{startError}</p>
          )}
          <button
            onClick={handleStart}
            className="flex items-center gap-2 w-full justify-center py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Play size={14} />
            Start Meeting
          </button>
        </div>
      )}
    </div>
  );
}
