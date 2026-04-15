"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "@/lib/store";
import type { Meeting, PersonaRef, LLMProvider } from "@/lib/types";

const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  claude: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  ollama: ["llama3", "mistral", "gemma", "phi3", "qwen2"],
};
import LLMBadge from "@/components/LLMBadge";
import { ChevronUp, ChevronDown, Check } from "lucide-react";

export default function NewMeetingPage() {
  const router = useRouter();
  const { personas, addMeeting } = useStore();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [rounds, setRounds] = useState(2);
  const [synthesisMode, setSynthesisMode] = useState<"off" | "individual" | "shared">("off");
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [noteTakerEnabled, setNoteTakerEnabled] = useState(false);
  const [noteTakerProvider, setNoteTakerProvider] = useState<LLMProvider>("claude");
  const [noteTakerModel, setNoteTakerModel] = useState(PROVIDER_MODELS["claude"][0]);
  const [agenda, setAgenda] = useState("");
  const [error, setError] = useState("");

  function togglePersona(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      setOrderedIds((prev) => prev.filter((x) => x !== id));
    } else {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setOrderedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setOrderedIds((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }

  function moveDown(idx: number) {
    setOrderedIds((prev) => {
      if (idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }

  function handleNext() {
    setError("");
    if (step === 1) {
      if (!title.trim()) { setError("Title is required"); return; }
      setStep(2);
    } else if (step === 2) {
      if (orderedIds.length < 1) { setError("Select at least one persona"); return; }
      setStep(3);
    }
  }

  function handleCreate() {
    const personaRefs: PersonaRef[] = orderedIds.map((id, i) => ({
      personaId: id,
      order: i,
    }));
    const now = new Date().toISOString();
    const meeting: Meeting = {
      id: uuidv4(),
      title: title.trim(),
      description: description.trim(),
      personaRefs,
      rounds,
      synthesisEnabled: synthesisMode !== "off",
      synthesisMode,
      autoAdvance,
      noteTakerEnabled: noteTakerEnabled || undefined,
      noteTakerProvider: noteTakerEnabled ? noteTakerProvider : undefined,
      noteTakerModel: noteTakerEnabled ? noteTakerModel : undefined,
      agenda: agenda.trim() || undefined,
      status: "draft",
      messages: [],
      currentRound: 0,
      currentSpeakerIndex: 0,
      createdAt: now,
    };
    addMeeting(meeting);
    router.push(`/meetings/${meeting.id}`);
  }

  const stepLabels = ["Details", "Personas", "Settings"];

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  done
                    ? "bg-[#6264a7] text-white"
                    : active
                    ? "bg-[#6264a7] text-white"
                    : "bg-[#2f2d47] text-[#78788a]"
                }`}
              >
                {done ? <Check size={12} /> : n}
              </div>
              <span
                className={`text-sm ${
                  active ? "text-[#f5f5f5] font-medium" : "text-[#78788a]"
                }`}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <div className="w-8 h-px bg-[#3d3b5c] mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#f5f5f5]">Meeting Details</h2>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#b0afc8]">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product Strategy Review"
              className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#b0afc8]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will this meeting be about?"
              className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7] resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 2: Personas */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#f5f5f5]">Select Personas</h2>
          <p className="text-sm text-[#78788a]">
            Select and reorder. The order defines who speaks first.
          </p>

          {personas.length === 0 ? (
            <div className="border border-dashed border-[#3d3b5c] rounded-2xl p-8 text-center">
              <p className="text-[#78788a] text-sm mb-3">No personas in your library yet.</p>
              <a href="/personas/new" className="text-[#9496ca] text-sm hover:underline">
                Create a persona first →
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {personas.map((p) => {
                  const selected = selectedIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePersona(p.id)}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-colors ${
                        selected
                          ? "border-[#6264a7] bg-[#6264a7]/10"
                          : "border-[#3d3b5c] bg-[#252437] hover:border-[#5856a0]"
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                        style={{ background: p.color }}
                      >
                        {p.emoji}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#f5f5f5] truncate">{p.name}</p>
                        <p className="text-xs text-[#78788a] truncate">{p.role}</p>
                      </div>
                      {selected && (
                        <Check size={14} className="text-[#9496ca] flex-shrink-0 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>

              {orderedIds.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-[#78788a] mb-2">Speaking Order</p>
                  <div className="space-y-1.5">
                    {orderedIds.map((id, idx) => {
                      const p = personas.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 bg-[#252437] border border-[#3d3b5c] rounded-xl px-3 py-2"
                        >
                          <span className="text-xs text-[#78788a] w-4">{idx + 1}</span>
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                            style={{ background: p.color }}
                          >
                            {p.emoji}
                          </div>
                          <span className="flex-1 text-sm text-[#b0afc8]">{p.name}</span>
                          <LLMBadge provider={p.provider} />
                          <button
                            type="button"
                            onClick={() => moveUp(idx)}
                            disabled={idx === 0}
                            className="p-1 text-[#78788a] hover:text-[#b0afc8] disabled:opacity-30"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDown(idx)}
                            disabled={idx === orderedIds.length - 1}
                            className="p-1 text-[#78788a] hover:text-[#b0afc8] disabled:opacity-30"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 3: Settings */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#f5f5f5]">Meeting Settings</h2>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#b0afc8]">
              Number of Rounds
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={rounds}
                onChange={(e) => setRounds(Number(e.target.value))}
                className="flex-1 accent-[#6264a7]"
              />
              <span className="w-8 text-center text-sm font-semibold text-[#f5f5f5]">
                {rounds}
              </span>
            </div>
            <p className="text-xs text-[#78788a]">
              {orderedIds.length} persona{orderedIds.length !== 1 ? "s" : ""} × {rounds} round{rounds !== 1 ? "s" : ""} = {orderedIds.length * rounds} turns
            </p>
          </div>

          <div className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-[#b0afc8] mb-0.5">Synthesis round</p>
              <p className="text-xs text-[#78788a]">What happens after all rounds complete.</p>
            </div>
            <div className="flex gap-2">
              {([
                { value: "off", label: "Off" },
                { value: "individual", label: "Individual verdicts" },
                { value: "shared", label: "Shared verdict" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSynthesisMode(value)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-medium border transition-colors ${
                    synthesisMode === value
                      ? "bg-[#6264a7]/20 border-[#6264a7]/50 text-[#bdbde6]"
                      : "bg-[#2f2d47] border-[#3d3b5c] text-[#78788a] hover:text-[#b0afc8] hover:border-[#5856a0]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {synthesisMode === "individual" && (
              <p className="text-xs text-[#78788a]">
                Each persona gives a closing statement in order. Later speakers can see earlier ones.
              </p>
            )}
            {synthesisMode === "shared" && (
              <p className="text-xs text-[#78788a]">
                Each persona gives a closing statement, then a unified Council Verdict is generated from all of them.
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 bg-[#252437] border border-[#3d3b5c] rounded-2xl p-4">
            <input
              id="autoAdvance"
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
              className="mt-0.5 accent-[#6264a7]"
            />
            <label htmlFor="autoAdvance" className="text-sm text-[#b0afc8] cursor-pointer">
              <span className="font-medium text-[#f5f5f5]">Auto-advance (Autopilot)</span>
              <br />
              <span className="text-[#78788a] text-xs">
                Speakers advance automatically with a short delay — sit back and watch. You can pause at any time.
              </span>
            </label>
          </div>

          <div className={`bg-[#252437] border rounded-2xl p-4 space-y-3 transition-colors ${noteTakerEnabled ? "border-sky-500/30" : "border-[#3d3b5c]"}`}>
            <div className="flex items-start gap-3">
              <input
                id="noteTaker"
                type="checkbox"
                checked={noteTakerEnabled}
                onChange={(e) => setNoteTakerEnabled(e.target.checked)}
                className="mt-0.5 accent-[#6264a7]"
              />
              <label htmlFor="noteTaker" className="text-sm text-[#b0afc8] cursor-pointer">
                <span className="font-medium text-[#f5f5f5]">📋 Note Taker</span>
                <br />
                <span className="text-[#78788a] text-xs">
                  After the meeting ends, automatically generate a Summary and Action Items from the full transcript.
                </span>
              </label>
            </div>
            {noteTakerEnabled && (
              <div className="flex gap-2 pl-6">
                <select
                  value={noteTakerProvider}
                  onChange={(e) => {
                    const p = e.target.value as LLMProvider;
                    setNoteTakerProvider(p);
                    setNoteTakerModel(PROVIDER_MODELS[p][0]);
                  }}
                  className="bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-2.5 py-1.5 text-xs text-[#b0afc8] focus:outline-none focus:border-[#6264a7]"
                >
                  {(["claude", "openai", "gemini", "ollama"] as LLMProvider[]).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={noteTakerModel}
                  onChange={(e) => setNoteTakerModel(e.target.value)}
                  className="flex-1 bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-2.5 py-1.5 text-xs text-[#b0afc8] focus:outline-none focus:border-[#6264a7]"
                >
                  {PROVIDER_MODELS[noteTakerProvider].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#b0afc8]">
              Agenda / Opening Brief
            </label>
            <textarea
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              rows={4}
              placeholder="Describe the problem, context, or question for the council to address…"
              className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7] resize-none"
            />
            <p className="text-xs text-[#78788a]">
              This will be included in every persona's initial context.
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="px-5 py-2.5 bg-[#2f2d47] hover:bg-[#39365a] text-[#b0afc8] text-sm font-medium rounded-xl transition-colors"
          >
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            className="px-5 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCreate}
            className="px-5 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
          >
            Create Meeting
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push("/meetings")}
          className="px-5 py-2.5 text-[#78788a] hover:text-[#b0afc8] text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
