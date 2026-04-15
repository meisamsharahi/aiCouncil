import type { LLMProvider } from "@/lib/types";

const PROVIDER_STYLES: Record<LLMProvider, { label: string; className: string }> = {
  claude: {
    label: "Claude",
    className: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
  },
  openai: {
    label: "OpenAI",
    className: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  },
  gemini: {
    label: "Gemini",
    className: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  },
  ollama: {
    label: "Ollama",
    className: "bg-purple-500/15 text-purple-300 border border-purple-500/20",
  },
};

interface LLMBadgeProps {
  provider: LLMProvider;
  model?: string;
}

export default function LLMBadge({ provider, model }: LLMBadgeProps) {
  const style = PROVIDER_STYLES[provider];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${style.className}`}
    >
      {style.label}
      {model && (
        <span className="opacity-70 max-w-[80px] truncate">{model}</span>
      )}
    </span>
  );
}
