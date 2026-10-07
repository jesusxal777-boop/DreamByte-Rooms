import OpenAI from 'openai';
import type { AIRequest, AIResponse } from '../types/index.js';
import { BaseProvider } from './base.js';

/**
 * OpenAI provider (also supports OpenRouter and any OpenAI-compatible API).
 *
 * To use OpenRouter:
 *   OPENAI_API_KEY=sk-or-v1-xxxxx
 *   OPENAI_BASE_URL=https://openrouter.ai/api/v1
 *   OPENAI_MODEL=openai/gpt-4o   (or any free model ending in :free)
 */
export class OpenAIProvider extends BaseProvider {
  id = 'openai';
  name = 'OpenAI';
  private client: OpenAI | null = null;
  private model: string;

  constructor(apiKey?: string, model = process.env.OPENAI_MODEL || 'gpt-4o') {
    super();
    this.model = model;

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key) {
      const baseURL = process.env.OPENAI_BASE_URL || undefined; // undefined = official OpenAI

      this.client = new OpenAI({
        apiKey: key,
        baseURL, // when set → OpenRouter or any compatible endpoint
      });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  async generateResponse(input: AIRequest): Promise<AIResponse> {
    if (!this.client) {
      throw new Error('OpenAI provider is not configured. Set OPENAI_API_KEY.');
    }

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: input.systemPrompt },
      ...input.messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: input.maxTokens ?? 800,
      temperature: input.temperature ?? 0.7,
    });

    const choice = completion.choices[0];
    return {
      content: choice?.message?.content ?? '',
      model: completion.model,
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }
}
