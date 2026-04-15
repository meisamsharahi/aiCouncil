import type { LLMProvider, ChatMessage, ProviderSettings } from "./types";

export interface StreamLLMOptions {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  messages: ChatMessage[];
  settings: ProviderSettings;
  maxTokens?: number;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onTruncated?: () => void;
  onError: (error: string) => void;
}

/**
 * Streams a response from the /api/chat route using SSE.
 * Calls onChunk for each text delta, onDone when complete, onError on failure.
 */
export async function streamLLMResponse(options: StreamLLMOptions): Promise<void> {
  const { provider, model, systemPrompt, messages, settings, maxTokens, onChunk, onDone, onTruncated, onError } = options;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        model,
        systemPrompt,
        messages,
        apiKeys: settings,
        maxTokens,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      onError(err || `HTTP ${response.status}`);
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.text) onChunk(parsed.text);
          if (parsed.truncated) onTruncated?.();
          if (parsed.error) {
            onError(parsed.error);
            return;
          }
        } catch {
          // ignore malformed lines
        }
      }
    }

    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : "Unknown error");
  }
}
