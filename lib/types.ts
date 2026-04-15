// ─── LLM Providers ────────────────────────────────────────────────────────────

export type LLMProvider = "claude" | "openai" | "gemini" | "ollama";

export interface ProviderSettings {
  claudeApiKey: string;
  openaiApiKey: string;
  geminiApiKey: string;
  ollamaBaseUrl: string;
}

// ─── Persona ──────────────────────────────────────────────────────────────────

export interface Persona {
  id: string;
  name: string;
  emoji: string;
  color: string;            // hex color for avatar background
  role: string;             // e.g. "Devil's Advocate", "Strategist"
  systemPrompt: string;
  provider: LLMProvider;
  model: string;            // provider-specific model string
  maxTokens: number;        // max tokens per response (default 512)
  createdAt: string;        // ISO date string
  updatedAt: string;
}

// Inputs for the one-click prompt generator
export interface PersonaPromptGenInput {
  expertField: string;         // e.g. "Cybersecurity", "Product Strategy"
  roleArchetype: string;       // e.g. "Devil's Advocate", "Skeptic"
  creativityLevel: "low" | "medium" | "high";
  knowledgeDepth: "generalist" | "expert" | "domain_master";
  communicationStyle: string;  // freeform, e.g. "Concise and blunt"
  extraInstructions?: string;
}

// ─── Meeting ──────────────────────────────────────────────────────────────────

export type MeetingStatus = "draft" | "in_progress" | "completed";

export interface PersonaRef {
  personaId: string;
  order: number;  // 0-based speaking order
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  personaRefs: PersonaRef[];         // ordered participant list
  rounds: number;
  synthesisEnabled: boolean;         // legacy — kept for backward compat; use synthesisMode
  synthesisMode?: "off" | "individual" | "shared"; // "individual" = each persona closes; "shared" = + council verdict
  autoAdvance: boolean;              // auto-advance through speakers without confirm clicks
  noteTakerEnabled?: boolean;        // fire Note Taker after meeting completes
  noteTakerProvider?: LLMProvider;   // provider for Note Taker
  noteTakerModel?: string;           // model for Note Taker
  agenda?: string;                   // optional notes shown at start
  status: MeetingStatus;
  messages: MeetingMessage[];
  currentRound: number;              // 1-based, 0 = not started
  currentSpeakerIndex: number;       // index into personaRefs
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export type MessageType =
  | "system"         // meeting broadcast / status announcements
  | "persona"        // in-round structured response
  | "direct_reply"   // @mention triggered response
  | "user"           // facilitator message / comment
  | "note_taker"     // post-meeting summary from the Note Taker
  | "council_verdict"; // shared synthesis — single unified verdict across all personas

export interface MeetingMessage {
  id: string;
  meetingId: string;
  type: MessageType;
  personaId?: string;           // null for user/system messages
  content: string;
  round?: number;               // which round this message belongs to
  isSynthesis?: boolean;        // true for closing synthesis statements
  isStreaming: boolean;
  mentionedPersonaId?: string;  // set when this is a direct_reply to an @mention
  overrideMessage?: string;     // original @mention message text — stored for retry
  timestamp: string;            // ISO date string
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

// Sent from client → /api/chat
export interface ChatRequest {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  apiKeys: ProviderSettings;
  maxTokens?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Sent from client → /api/generate-persona-prompt
export interface GeneratePromptRequest {
  input: PersonaPromptGenInput;
  apiKey: string;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export interface AppState {
  personas: Persona[];
  meetings: Meeting[];
  settings: ProviderSettings;
}
