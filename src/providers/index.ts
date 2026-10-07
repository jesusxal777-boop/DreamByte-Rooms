import type { AIProvider } from '../types/index.js';
import { OpenAIProvider } from './openai.js';

const providers: Map<string, AIProvider> = new Map();

export function initProviders(): void {
  providers.clear();
  const openai = new OpenAIProvider();

  if (openai.isConfigured()) {
    providers.set(openai.id, openai);
  }

  console.log(
    `[Providers] Loaded: ${Array.from(providers.keys()).join(', ') || '(none - check API keys)'}`
  );
}

export function getProvider(id: string): AIProvider | undefined {
  return providers.get(id);
}

export function getAllProviders(): AIProvider[] {
  return Array.from(providers.values());
}

export function getConfiguredProviderIds(): string[] {
  return Array.from(providers.keys());
}
