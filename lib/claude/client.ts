import OpenAI from 'openai'

// OpenRouter-compatible client — drop-in OpenAI SDK pointed at OpenRouter's API.
// Models prefixed with "openai/" are routed to OpenAI; "anthropic/" to Claude, etc.
export const claudeClient = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY ?? 'not-configured',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://signalmap.vercel.app',
    'X-Title': 'SignalMap — Malaysian Talent Intelligence',
  },
})

export const AI_MODELS = {
  extraction: 'openai/gpt-4o-mini',
  analysis: 'openai/gpt-4o',
} as const
