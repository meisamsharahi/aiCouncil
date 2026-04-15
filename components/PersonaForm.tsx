"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "@/lib/store";
import PromptGenerator from "./PromptGenerator";
import type { Persona, LLMProvider } from "@/lib/types";

const PROVIDER_MODELS: Record<LLMProvider, string[]> = {
  claude: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  ollama: ["llama3", "mistral", "gemma", "phi3", "qwen2"],
};

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#06b6d4", "#f97316", "#ef4444",
];

const EMOJIS = [
  "🤖","🧠","🦊","🐉","🦁","🦉","🐺","🦅",
  "⚡","🔥","💎","🌊","🎯","🛡️","⚔️","🔮",
];

interface PersonaFormProps {
  initial?: Persona;
}

export default function PersonaForm({ initial }: PersonaFormProps) {
  const router = useRouter();
  const { addPersona, updatePersona } = useStore();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "🤖");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [role, setRole] = useState(initial?.role ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? "");
  const [provider, setProvider] = useState<LLMProvider>(initial?.provider ?? "claude");
  const [model, setModel] = useState(initial?.model ?? PROVIDER_MODELS["claude"][0]);
  const [customModel, setCustomModel] = useState("");
  const [maxTokens, setMaxTokens] = useState(initial?.maxTokens ?? 400);
  const [error, setError] = useState("");

  function handleProviderChange(p: LLMProvider) {
    setProvider(p);
    setModel(PROVIDER_MODELS[p][0]);
    setCustomModel("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (!role.trim()) { setError("Role is required"); return; }
    if (!systemPrompt.trim()) { setError("System prompt is required"); return; }

    const finalModel = customModel.trim() || model;

    if (isEdit && initial) {
      updatePersona(initial.id, { name, emoji, color, role, systemPrompt, provider, model: finalModel, maxTokens });
    } else {
      const now = new Date().toISOString();
      addPersona({
        id: uuidv4(),
        name,
        emoji,
        color,
        role,
        systemPrompt,
        provider,
        model: finalModel,
        maxTokens,
        createdAt: now,
        updatedAt: now,
      });
    }
    router.push("/personas");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold text-[#f5f5f5]">
        {isEdit ? "Edit Persona" : "New Persona"}
      </h1>

      {/* Avatar preview + emoji/color pickers */}
      <div className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: color }}
          >
            {emoji}
          </div>
          <div>
            <p className="text-sm font-medium text-[#b0afc8] mb-2">Emoji</p>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-colors ${
                    emoji === e ? "bg-[#6264a7]/40 ring-1 ring-[#6264a7]" : "hover:bg-[#2f2d47]"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-[#b0afc8] mb-2">Color</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#252437] scale-110" : ""
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Name + Role */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#b0afc8]">Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex the Skeptic"
            className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#b0afc8]">Role *</label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Devil's Advocate"
            className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7]"
          />
        </div>
      </div>

      {/* LLM Provider + Model */}
      <div className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-5 space-y-3">
        <p className="text-sm font-medium text-[#b0afc8]">LLM</p>
        <div className="grid grid-cols-4 gap-2">
          {(["claude", "openai", "gemini", "ollama"] as LLMProvider[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleProviderChange(p)}
              className={`py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
                provider === p
                  ? "bg-[#6264a7] text-white"
                  : "bg-[#2f2d47] text-[#b0afc8] hover:text-[#f5f5f5]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#78788a] mb-1">Preset Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#6264a7]"
            >
              {PROVIDER_MODELS[provider].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#78788a] mb-1">Custom Model (overrides)</label>
            <input
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder={provider === "ollama" ? "llama3.1:8b" : "model-name"}
              className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7]"
            />
          </div>
        </div>

        <div className="border-t border-[#3d3b5c] pt-3">
          <label className="block text-xs text-[#78788a] mb-2">
            Response length <span className="text-[#78788a]/60">(target words — API cutoff is 1.5×)</span>
          </label>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {[150, 300, 500, 800, 1500].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMaxTokens(n)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors ${
                    maxTokens === n
                      ? "bg-[#6264a7] text-white"
                      : "bg-[#1a1928] text-[#b0afc8] hover:text-[#f5f5f5]"
                  }`}
                >
                  ~{n}w
                </button>
              ))}
            </div>
            <input
              type="number"
              min={50}
              max={3000}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Math.max(50, Math.min(3000, Number(e.target.value))))}
              className="w-20 bg-[#1a1928] border border-[#3d3b5c] rounded-xl px-2 py-1 text-xs text-[#f5f5f5] focus:outline-none focus:border-[#6264a7] text-center"
            />
          </div>
          <p className="text-[10px] text-[#78788a] mt-1.5">
            {maxTokens <= 200
              ? "Very brief — 1–2 sentences"
              : maxTokens <= 400
              ? "Brief — 1–2 short paragraphs"
              : maxTokens <= 700
              ? "Medium — 3–4 paragraphs"
              : "Long — detailed multi-paragraph response"}
          </p>
        </div>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-[#b0afc8]">
            System Prompt *
          </label>
          <PromptGenerator onGenerated={(p) => setSystemPrompt(p)} />
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={8}
          placeholder="You are…"
          className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7] resize-y font-mono"
        />
        <p className="text-xs text-[#78788a]">
          {systemPrompt.length} chars
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          className="px-5 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
        >
          {isEdit ? "Save Changes" : "Create Persona"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/personas")}
          className="px-5 py-2.5 bg-[#2f2d47] hover:bg-[#39365a] text-[#b0afc8] text-sm font-medium rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
