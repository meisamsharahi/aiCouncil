import { NextRequest } from "next/server";
import type { ChatRequest } from "@/lib/types";

export const runtime = "nodejs";

function sseChunk(text: string): string {
  return `data: ${JSON.stringify({ text })}\n\n`;
}

function sseDone(): string {
  return `data: [DONE]\n\n`;
}

function sseTruncated(): string {
  return `data: ${JSON.stringify({ truncated: true })}\n\n`;
}

function sseError(error: string): string {
  return `data: ${JSON.stringify({ error })}\n\n`;
}

// ─── Claude ───────────────────────────────────────────────────────────────────

async function* streamClaude(req: ChatRequest): AsyncGenerator<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: req.apiKeys.claudeApiKey });

  const stream = await client.messages.stream({
    model: req.model,
    max_tokens: req.maxTokens ?? 512,
    system: req.systemPrompt,
    messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
  });

  let truncated = false;
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield sseChunk(event.delta.text);
    }
    if (event.type === "message_delta" && event.delta.stop_reason === "max_tokens") {
      truncated = true;
    }
  }
  if (truncated) yield sseTruncated();
  yield sseDone();
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function* streamOpenAI(req: ChatRequest): AsyncGenerator<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: req.apiKeys.openaiApiKey });

  const stream = await client.chat.completions.create({
    model: req.model,
    stream: true,
    max_tokens: req.maxTokens ?? 512,
    messages: [
      { role: "system", content: req.systemPrompt },
      ...req.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  let truncated = false;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield sseChunk(delta);
    if (chunk.choices[0]?.finish_reason === "length") truncated = true;
  }
  if (truncated) yield sseTruncated();
  yield sseDone();
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function* streamGemini(req: ChatRequest): AsyncGenerator<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(req.apiKeys.geminiApiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: req.model,
    systemInstruction: req.systemPrompt,
    generationConfig: { maxOutputTokens: req.maxTokens ?? 512 },
  });

  // Convert messages to Gemini format
  const history = req.messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const lastMessage = req.messages[req.messages.length - 1];

  const chat = geminiModel.startChat({ history });
  const result = await chat.sendMessageStream(lastMessage?.content ?? "");

  let truncated = false;
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield sseChunk(text);
    if (chunk.candidates?.[0]?.finishReason === "MAX_TOKENS") truncated = true;
  }
  if (truncated) yield sseTruncated();
  yield sseDone();
}

// ─── Ollama ───────────────────────────────────────────────────────────────────

async function* streamOllama(req: ChatRequest): AsyncGenerator<string> {
  const baseUrl = req.apiKeys.ollamaBaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: req.model,
      stream: true,
      options: { num_predict: req.maxTokens ?? 512 },
      messages: [
        { role: "system", content: req.systemPrompt },
        ...req.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!response.ok) {
    yield sseError(`Ollama error: ${response.status} ${response.statusText}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield sseError("No response body from Ollama");
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
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const text = parsed?.message?.content;
        if (text) yield sseChunk(text);
        if (parsed.done) {
          if (parsed.done_reason === "length") yield sseTruncated();
          yield sseDone();
          return;
        }
      } catch {
        // skip
      }
    }
  }
  yield sseDone();
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { provider } = body;

  const encoder = new TextEncoder();

  async function* generate(): AsyncGenerator<Uint8Array> {
    try {
      let gen: AsyncGenerator<string>;
      if (provider === "claude") gen = streamClaude(body);
      else if (provider === "openai") gen = streamOpenAI(body);
      else if (provider === "gemini") gen = streamGemini(body);
      else if (provider === "ollama") gen = streamOllama(body);
      else {
        yield encoder.encode(sseError(`Unknown provider: ${provider}`));
        return;
      }

      for await (const chunk of gen) {
        yield encoder.encode(chunk);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stream error";
      yield encoder.encode(sseError(msg));
    }
  }

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of generate()) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
}
