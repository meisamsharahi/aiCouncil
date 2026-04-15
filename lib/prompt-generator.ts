import type { PersonaPromptGenInput } from "./types";

export function buildGenerationUserMessage(input: PersonaPromptGenInput): string {
  const creativity = {
    low: "low creativity — stick to established facts and conventional thinking",
    medium: "moderate creativity — balance innovation with grounded reasoning",
    high: "high creativity — embrace unconventional ideas and lateral thinking",
  }[input.creativityLevel];

  const depth = {
    generalist: "broad generalist knowledge across many domains",
    expert: "deep expert-level knowledge in the specified field",
    domain_master: "absolute mastery — cutting-edge, highly specialized, PhD-level depth",
  }[input.knowledgeDepth];

  return `Generate a detailed system prompt for an AI persona with the following characteristics:

Expert field: ${input.expertField}
Role archetype: ${input.roleArchetype}
Creativity level: ${creativity}
Knowledge depth: ${depth}
Communication style: ${input.communicationStyle}
${input.extraInstructions ? `Additional instructions: ${input.extraInstructions}` : ""}

The system prompt should:
1. Define the persona's core identity, expertise, and perspective
2. Specify how they engage with other participants in a discussion
3. Capture their unique communication style and voice
4. Explain their intellectual approach (how they reason, challenge, or synthesize)
5. Be written in second person ("You are...")
6. Be 150–250 words

Return ONLY the system prompt text — no preamble, no labels, no markdown fencing.`;
}
