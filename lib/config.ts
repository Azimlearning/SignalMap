// Centralised env var access — never use process.env directly in feature code.

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const
