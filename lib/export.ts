import type { Meeting, MeetingMessage, Persona } from "./types";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function getPersonaLabel(
  msg: MeetingMessage,
  personaMap: Map<string, Persona>
): string {
  if (msg.type === "user") return "**[Facilitator]**";
  if (msg.type === "system") return "**[System]**";
  if (msg.type === "note_taker") return "**📋 Note Taker**";
  if (msg.type === "council_verdict") return "**⚖️ Council Verdict**";
  const persona = msg.personaId ? personaMap.get(msg.personaId) : undefined;
  if (!persona) return "**[Unknown]**";
  const roundLabel = msg.round ? ` · Round ${msg.round}` : "";
  const directLabel = msg.type === "direct_reply" ? " · Direct Reply" : "";
  return `**${persona.emoji} ${persona.name}** (${persona.role}${roundLabel}${directLabel})`;
}

export function exportAsMarkdown(
  meeting: Meeting,
  personas: Persona[]
): string {
  const personaMap = new Map(personas.map((p) => [p.id, p]));
  const participantList = meeting.personaRefs
    .map((ref) => {
      const p = personaMap.get(ref.personaId);
      return p ? `- ${p.emoji} **${p.name}** — ${p.role} (${p.provider}/${p.model})` : null;
    })
    .filter(Boolean)
    .join("\n");

  const lines: string[] = [
    `# ${meeting.title}`,
    ``,
    `> ${meeting.description || "No description provided."}`,
    ``,
    `**Status:** ${meeting.status}  `,
    `**Rounds:** ${meeting.rounds}  `,
    `**Started:** ${meeting.startedAt ? formatTimestamp(meeting.startedAt) : "—"}  `,
    `**Completed:** ${meeting.completedAt ? formatTimestamp(meeting.completedAt) : "—"}`,
    ``,
    `## Participants`,
    ``,
    participantList,
    ``,
    `---`,
    ``,
    `## Transcript`,
    ``,
  ];

  let currentRound = 0;
  const noteTakerMsgs: typeof meeting.messages = [];

  for (const msg of meeting.messages) {
    if (msg.type === "note_taker" || msg.type === "council_verdict") {
      if (msg.type === "note_taker") noteTakerMsgs.push(msg);
      continue;
    }
    if (msg.round && msg.round !== currentRound) {
      currentRound = msg.round;
      lines.push(`### Round ${currentRound}`, ``);
    }
    const label = getPersonaLabel(msg, personaMap);
    const time = formatTimestamp(msg.timestamp);
    lines.push(`${label} · *${time}*`);
    lines.push(``);
    lines.push(msg.content);
    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  const councilVerdictMsgs = meeting.messages.filter((m) => m.type === "council_verdict");
  if (councilVerdictMsgs.length > 0) {
    lines.push(`## Council Verdict`, ``);
    for (const msg of councilVerdictMsgs) {
      lines.push(msg.content, ``);
    }
    lines.push(`---`, ``);
  }

  if (noteTakerMsgs.length > 0) {
    lines.push(`## Notes`, ``);
    for (const msg of noteTakerMsgs) {
      lines.push(msg.content, ``);
    }
  }

  return lines.join("\n");
}

export function exportAsJSON(meeting: Meeting, personas: Persona[]): string {
  const personaMap = new Map(personas.map((p) => [p.id, p]));
  const participantDetails = meeting.personaRefs.map((ref) => ({
    order: ref.order,
    persona: personaMap.get(ref.personaId) ?? null,
  }));

  const payload = {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      rounds: meeting.rounds,
      status: meeting.status,
      createdAt: meeting.createdAt,
      startedAt: meeting.startedAt,
      completedAt: meeting.completedAt,
    },
    participants: participantDetails,
    messages: meeting.messages,
  };

  return JSON.stringify(payload, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function triggerMarkdownExport(meeting: Meeting, personas: Persona[]) {
  const md = exportAsMarkdown(meeting, personas);
  const slug = meeting.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  downloadFile(md, `${slug}-transcript.md`, "text/markdown");
}

export function triggerJSONExport(meeting: Meeting, personas: Persona[]) {
  const json = exportAsJSON(meeting, personas);
  const slug = meeting.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  downloadFile(json, `${slug}-transcript.json`, "application/json");
}
