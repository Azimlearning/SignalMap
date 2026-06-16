// Centralised env var access — never use process.env directly in feature code.

export const config = {
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
  jsearchApiKey: process.env.JSEARCH_API_KEY ?? '',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
} as const
