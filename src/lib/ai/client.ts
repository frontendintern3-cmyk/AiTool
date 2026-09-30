import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null | undefined;

/** Returns null (never throws) when ANTHROPIC_API_KEY isn't set, so callers can
 * degrade to "AI analysis unavailable" the same way every other optional
 * integration in this app does. */
export function getAnthropicClient(): Anthropic | null {
  if (cachedClient !== undefined) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  cachedClient = apiKey ? new Anthropic({ apiKey }) : null;
  return cachedClient;
}

export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
