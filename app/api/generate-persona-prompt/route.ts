import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildGenerationUserMessage } from "@/lib/prompt-generator";
import type { GeneratePromptRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: GeneratePromptRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.apiKey) {
    return Response.json(
      { error: "Claude API key is required for prompt generation" },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey: body.apiKey });
  const userMessage = buildGenerationUserMessage(body.input);

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    return Response.json({ prompt: text.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
