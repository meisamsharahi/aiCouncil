import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Persona,
  Meeting,
  MeetingMessage,
  ProviderSettings,
  AppState,
} from "./types";

interface Actions {
  // Settings
  updateSettings: (settings: Partial<ProviderSettings>) => void;

  // Personas
  addPersona: (persona: Persona) => void;
  updatePersona: (id: string, updates: Partial<Persona>) => void;
  deletePersona: (id: string) => void;

  // Meetings
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;

  // Messages
  addMessage: (meetingId: string, message: MeetingMessage) => void;
  updateMessage: (meetingId: string, messageId: string, updates: Partial<MeetingMessage>) => void;
  deleteMessage: (meetingId: string, messageId: string) => void;

  // Helpers
  getPersonaById: (id: string) => Persona | undefined;
  getMeetingById: (id: string) => Meeting | undefined;

  // Reset
  resetAll: () => void;
}

type Store = AppState & Actions;

const DEFAULT_SETTINGS: ProviderSettings = {
  claudeApiKey: "",
  openaiApiKey: "",
  geminiApiKey: "",
  ollamaBaseUrl: "http://localhost:11434",
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // ── Initial State ──────────────────────────────────────────────────────
      personas: [],
      meetings: [],
      settings: DEFAULT_SETTINGS,

      // ── Settings ───────────────────────────────────────────────────────────
      updateSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),

      // ── Personas ───────────────────────────────────────────────────────────
      addPersona: (persona) =>
        set((s) => {
          if (s.personas.some((p) => p.id === persona.id)) return s;
          return { personas: [...s.personas, persona] };
        }),

      updatePersona: (id, updates) =>
        set((s) => ({
          personas: s.personas.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deletePersona: (id) =>
        set((s) => ({ personas: s.personas.filter((p) => p.id !== id) })),

      // ── Meetings ───────────────────────────────────────────────────────────
      addMeeting: (meeting) =>
        set((s) => ({ meetings: [...s.meetings, meeting] })),

      updateMeeting: (id, updates) =>
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      deleteMeeting: (id) =>
        set((s) => ({ meetings: s.meetings.filter((m) => m.id !== id) })),

      // ── Messages ───────────────────────────────────────────────────────────
      addMessage: (meetingId, message) =>
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? { ...m, messages: [...m.messages, message] }
              : m
          ),
        })),

      updateMessage: (meetingId, messageId, updates) =>
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? {
                  ...m,
                  messages: m.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                  ),
                }
              : m
          ),
        })),

      deleteMessage: (meetingId, messageId) =>
        set((s) => ({
          meetings: s.meetings.map((m) =>
            m.id === meetingId
              ? { ...m, messages: m.messages.filter((msg) => msg.id !== messageId) }
              : m
          ),
        })),

      // ── Helpers ────────────────────────────────────────────────────────────
      getPersonaById: (id) => get().personas.find((p) => p.id === id),
      getMeetingById: (id) => get().meetings.find((m) => m.id === id),

      // ── Reset ──────────────────────────────────────────────────────────────
      resetAll: () =>
        set({ personas: [], meetings: [], settings: DEFAULT_SETTINGS }),
    }),
    {
      name: "ai-council-store",
      // Only persist state, not actions
      partialize: (state) => ({
        personas: state.personas,
        meetings: state.meetings,
        settings: state.settings,
      }),
    }
  )
);
