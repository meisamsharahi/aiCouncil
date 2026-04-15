"use client";

import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import type { PersonaPromptGenInput } from "@/lib/types";
import { useStore } from "@/lib/store";

interface PromptGeneratorProps {
  onGenerated: (prompt: string) => void;
}

const CREATIVITY_OPTIONS = [
  { value: "low", label: "Low — Conventional" },
  { value: "medium", label: "Medium — Balanced" },
  { value: "high", label: "High — Unconventional" },
] as const;

const DEPTH_OPTIONS = [
  { value: "generalist", label: "Generalist" },
  { value: "expert", label: "Expert" },
  { value: "domain_master", label: "Domain Master" },
] as const;

export default function PromptGenerator({ onGenerated }: PromptGeneratorProps) {
  const { settings } = useStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<PersonaPromptGenInput>({
    expertField: "",
    roleArchetype: "",
    creativityLevel: "medium",
    knowledgeDepth: "expert",
    communicationStyle: "",
    extraInstructions: "",
  });

  function update<K extends keyof PersonaPromptGenInput>(
    key: K,
    value: PersonaPromptGenInput[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function generate() {
    if (!settings.claudeApiKey) {
      setError("Claude API key is required. Add it in Settings.");
      return;
    }
    if (!form.expertField || !form.roleArchetype || !form.communicationStyle) {
      setError("Fill in Expert Field, Role Archetype, and Communication Style.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/generate-persona-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: form, apiKey: settings.claudeApiKey }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onGenerated(data.prompt);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-[#9496ca] hover:text-[#bdbde6] transition-colors"
      >
        <Sparkles size={13} />
        Generate with AI
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#252437] border border-[#3d3b5c] rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d3b5c]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#9496ca]" />
                <h3 className="text-sm font-semibold text-[#f5f5f5]">Generate System Prompt</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-[#78788a] hover:text-[#f5f5f5] hover:bg-[#2f2d47] rounded-xl transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-xs text-[#b0afc8]">
                Fill in the fields below and AI will write a full system prompt for your persona.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#b0afc8] mb-1">
                    Expert Field *
                  </label>
                  <input
                    value={form.expertField}
                    onChange={(e) => update("expertField", e.target.value)}
                    placeholder="e.g. Cybersecurity, Marketing"
                    className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#b0afc8] mb-1">
                    Role Archetype *
                  </label>
                  <input
                    value={form.roleArchetype}
                    onChange={(e) => update("roleArchetype", e.target.value)}
                    placeholder="e.g. Devil's Advocate, Strategist"
                    className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#b0afc8] mb-1">
                    Creativity Level
                  </label>
                  <select
                    value={form.creativityLevel}
                    onChange={(e) =>
                      update("creativityLevel", e.target.value as PersonaPromptGenInput["creativityLevel"])
                    }
                    className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#6264a7]"
                  >
                    {CREATIVITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#b0afc8] mb-1">
                    Knowledge Depth
                  </label>
                  <select
                    value={form.knowledgeDepth}
                    onChange={(e) =>
                      update("knowledgeDepth", e.target.value as PersonaPromptGenInput["knowledgeDepth"])
                    }
                    className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#6264a7]"
                  >
                    {DEPTH_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b0afc8] mb-1">
                  Communication Style *
                </label>
                <input
                  value={form.communicationStyle}
                  onChange={(e) => update("communicationStyle", e.target.value)}
                  placeholder="e.g. Concise and blunt, Socratic, Verbose and analytical"
                  className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#b0afc8] mb-1">
                  Extra Instructions
                </label>
                <textarea
                  value={form.extraInstructions}
                  onChange={(e) => update("extraInstructions", e.target.value)}
                  placeholder="Any specific behaviours, constraints, or quirks…"
                  rows={2}
                  className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7] resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#3d3b5c]">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-[#b0afc8] hover:text-[#f5f5f5] hover:bg-[#2f2d47] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-[#6264a7] hover:bg-[#7b83eb] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                {loading ? "Generating…" : "Generate Prompt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
