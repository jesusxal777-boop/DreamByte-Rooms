import type { AIProvider, AIRequest, AIResponse } from '../types/index.js';

/**
 * Abstract base - all providers implement AIProvider.
 * Future: local models, other providers, BYOK, etc.
 */
export abstract class BaseProvider implements AIProvider {
  abstract id: string;
  abstract name: string;

  abstract generateResponse(input: AIRequest): Promise<AIResponse>;
  abstract isConfigured(): boolean;
}
