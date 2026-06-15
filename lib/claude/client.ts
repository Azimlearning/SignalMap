import Anthropic from '@anthropic-ai/sdk'
import { config } from '@/lib/config'

// Singleton Anthropic client — all Claude calls go through this.
// Never instantiate Anthropic directly in feature code.
export const claudeClient = new Anthropic({ apiKey: config.anthropicApiKey })
