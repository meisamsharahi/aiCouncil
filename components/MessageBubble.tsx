import type { MeetingMessage, Persona } from "@/lib/types";
import LLMBadge from "./LLMBadge";
import RoundBadge from "./RoundBadge";
import Markdown from "./Markdown";
import { RefreshCw } from "lucide-react";

interface MessageBubbleProps {
  message: MeetingMessage;
  persona?: Persona;
  totalRounds?: number;
  onRetry?: () => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageBubble({
  message,
  persona,
  totalRounds,
  onRetry,
}: MessageBubbleProps) {
  const isError = message.content.startsWith("[Error:") ||
    message.content.startsWith("[Note Taker Error:") ||
    message.content.startsWith("[Council Verdict Error:");
  // System messages
  if (message.type === "system") {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-[#252437] border border-[#3d3b5c] rounded-2xl px-4 py-2.5 max-w-2xl text-center">
          <p className="text-xs text-[#b0afc8] whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  // User / facilitator messages
  if (message.type === "user") {
    return (
      <div className="flex justify-end my-2 px-4">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 justify-end mb-1">
            <span className="text-[10px] text-[#78788a]">{formatTime(message.timestamp)}</span>
            <span className="text-xs font-medium text-[#b0afc8]">You</span>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
              style={{ background: "#6264a7" }}
            >
              F
            </div>
          </div>
          <div className="bg-[#6264a7]/20 border border-[#6264a7]/30 rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm text-[#f5f5f5] whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Note Taker messages
  if (message.type === "note_taker") {
    return (
      <div className="flex justify-center my-4 px-4">
        <div className="w-full max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl bg-[#252437] border border-sky-500/30 flex items-center justify-center text-sm">
              📋
            </div>
            <span className="text-sm font-semibold text-sky-300">Note Taker</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-sky-500/15 text-sky-400 border border-sky-500/20">
              Auto-generated
            </span>
            <span className="text-[10px] text-[#78788a] ml-auto">{formatTime(message.timestamp)}</span>
          </div>
          <div className="bg-[#252437] border border-sky-500/20 rounded-2xl px-5 py-4">
            {message.isStreaming && !message.content ? (
              <span className="inline-block w-2 h-4 bg-[#b0afc8] rounded-sm animate-pulse" />
            ) : (
              <div className={message.isStreaming ? "streaming-cursor" : ""}>
                {message.isStreaming
                  ? <p className="text-sm text-[#f5f5f5] whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  : <Markdown content={message.content || "…"} />
                }
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Council Verdict messages
  if (message.type === "council_verdict") {
    return (
      <div className="flex justify-center my-4 px-4">
        <div className="w-full max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl bg-[#252437] border border-amber-500/30 flex items-center justify-center text-sm">
              ⚖️
            </div>
            <span className="text-sm font-semibold text-amber-300">Council Verdict</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
              Shared synthesis
            </span>
            <span className="text-[10px] text-[#78788a] ml-auto">{formatTime(message.timestamp)}</span>
          </div>
          <div className="bg-[#252437] border border-amber-500/20 rounded-2xl px-5 py-4">
            {message.isStreaming && !message.content ? (
              <span className="inline-block w-2 h-4 bg-[#b0afc8] rounded-sm animate-pulse" />
            ) : (
              <div className={message.isStreaming ? "streaming-cursor" : ""}>
                {message.isStreaming
                  ? <p className="text-sm text-[#f5f5f5] whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  : <Markdown content={message.content || "…"} />
                }
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Persona messages (in-round or direct reply)
  return (
    <div className="flex gap-3 my-2 px-4">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-1"
        style={{ background: persona?.color ?? "#2f2d47" }}
      >
        {persona?.emoji ?? "🤖"}
      </div>

      <div className="flex-1 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-semibold text-[#f5f5f5]">
            {persona?.name ?? "Unknown"}
          </span>
          <span className="text-xs text-[#78788a]">{persona?.role}</span>
          {persona && (
            <LLMBadge provider={persona.provider} model={persona.model} />
          )}
          {message.isSynthesis ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              Synthesis
            </span>
          ) : message.round ? (
            <RoundBadge round={message.round} total={totalRounds} />
          ) : null}
          {message.type === "direct_reply" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-yellow-500/15 text-yellow-300 border border-yellow-500/20">
              @Direct
            </span>
          )}
          <span className="text-[10px] text-[#78788a] ml-auto">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Content */}
        <div className={`bg-[#252437] rounded-2xl rounded-tl-sm px-4 py-3 border ${
          isError
            ? "border-red-500/20"
            : message.isSynthesis
            ? "border-emerald-500/20"
            : "border-[#3d3b5c]"
        }`}>
          {message.isStreaming && !message.content ? (
            <span className="inline-block w-2 h-4 bg-[#b0afc8] rounded-sm animate-pulse" />
          ) : isError ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-red-400 flex-1">{message.content}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors flex-shrink-0"
                >
                  <RefreshCw size={11} />
                  Retry
                </button>
              )}
            </div>
          ) : (
            <div className={message.isStreaming ? "streaming-cursor" : ""}>
              {message.isStreaming
                ? <p className="text-sm text-[#f5f5f5] whitespace-pre-wrap leading-relaxed">{message.content}</p>
                : <Markdown content={message.content || "…"} />
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
