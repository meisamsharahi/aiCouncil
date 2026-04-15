"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Save, Eye, EyeOff, CheckCircle, Trash2, AlertTriangle } from "lucide-react";

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  isPassword?: boolean;
  hint?: string;
}

function Field({ label, value, onChange, placeholder, isPassword = true, hint }: FieldProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[#b0afc8]">{label}</label>
      {hint && <p className="text-xs text-[#78788a]">{hint}</p>}
      <div className="relative">
        <input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#2f2d47] border border-[#3d3b5c] rounded-xl px-3 py-2.5 text-sm text-[#f5f5f5] placeholder-[#78788a] focus:outline-none focus:border-[#6264a7] pr-10"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78788a] hover:text-[#b0afc8]"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, resetAll, meetings, personas } = useStore();
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function update(key: keyof typeof form) {
    return (value: string) => setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-[#f5f5f5] mb-1">Settings</h1>
      <p className="text-sm text-[#78788a] mb-8">
        API keys are stored only in your browser — never sent to any server.
      </p>

      <div className="space-y-8">
        {/* Claude */}
        <section className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <h2 className="text-sm font-semibold text-[#f5f5f5]">Anthropic (Claude)</h2>
          </div>
          <Field
            label="API Key"
            value={form.claudeApiKey}
            onChange={update("claudeApiKey")}
            placeholder="sk-ant-..."
            hint="Required for Claude personas and persona prompt generation."
          />
        </section>

        {/* OpenAI */}
        <section className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h2 className="text-sm font-semibold text-[#f5f5f5]">OpenAI</h2>
          </div>
          <Field
            label="API Key"
            value={form.openaiApiKey}
            onChange={update("openaiApiKey")}
            placeholder="sk-..."
          />
        </section>

        {/* Gemini */}
        <section className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <h2 className="text-sm font-semibold text-[#f5f5f5]">Google (Gemini)</h2>
          </div>
          <Field
            label="API Key"
            value={form.geminiApiKey}
            onChange={update("geminiApiKey")}
            placeholder="AIza..."
          />
        </section>

        {/* Ollama */}
        <section className="bg-[#252437] border border-[#3d3b5c] rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <h2 className="text-sm font-semibold text-[#f5f5f5]">Ollama (Local)</h2>
          </div>
          <Field
            label="Base URL"
            value={form.ollamaBaseUrl}
            onChange={update("ollamaBaseUrl")}
            placeholder="http://localhost:11434"
            isPassword={false}
            hint="Default is http://localhost:11434. Make sure Ollama is running locally."
          />
        </section>
      </div>

      <button
        onClick={handleSave}
        className="mt-8 flex items-center gap-2 px-5 py-2.5 bg-[#6264a7] hover:bg-[#7b83eb] text-white text-sm font-medium rounded-xl transition-colors"
      >
        {saved ? <CheckCircle size={16} /> : <Save size={16} />}
        {saved ? "Saved!" : "Save Settings"}
      </button>

      {/* Danger Zone */}
      <div className="mt-12 border border-red-500/20 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 bg-red-500/5 border-b border-red-500/20">
          <AlertTriangle size={14} className="text-red-400" />
          <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#b0afc8]">Clear all meetings</p>
              <p className="text-xs text-[#78788a] mt-0.5">
                Delete all {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} and their transcripts. Personas are kept.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete all ${meetings.length} meetings? This cannot be undone.`)) {
                  meetings.forEach((m) => useStore.getState().deleteMeeting(m.id));
                }
              }}
              disabled={meetings.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Trash2 size={14} />
              Clear meetings
            </button>
          </div>

          <div className="border-t border-[#3d3b5c]" />

          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#b0afc8]">Reset everything</p>
              <p className="text-xs text-[#78788a] mt-0.5">
                Wipe all {personas.length} persona{personas.length !== 1 ? "s" : ""}, {meetings.length} meeting{meetings.length !== 1 ? "s" : ""}, and API keys. Starts fresh.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm("Reset the entire app? All personas, meetings, and API keys will be deleted. This cannot be undone.")) {
                  resetAll();
                  setForm({ claudeApiKey: "", openaiApiKey: "", geminiApiKey: "", ollamaBaseUrl: "http://localhost:11434" });
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <Trash2 size={14} />
              Reset app
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
