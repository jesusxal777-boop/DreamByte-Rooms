import type { AgentConfig, ConversationMessage, RoomState } from '../types/index.js';
import { getProvider } from '../providers/index.js';
import { getAgentById } from './defaultAgents.js';

export async function executeAgents(
  agentIds: string[],
  room: RoomState,
  latestUserMessage: ConversationMessage
): Promise<Array<{ agentId: string; displayName: string; content: string }>> {
  const results: Array<{ agentId: string; displayName: string; content: string }> = [];

  for (const agentId of agentIds) {
    const agent = getAgentById(agentId);
    if (!agent || !agent.enabled) continue;

    const provider = getProvider(agent.providerId);
    if (!provider || !provider.isConfigured()) {
      console.warn(`[AgentExecutor] Provider ${agent.providerId} not configured for agent ${agentId}`);
      results.push({
        agentId,
        displayName: agent.displayName,
        content: `*(Proveedor ${agent.providerId} no configurado. Añade la API key correspondiente en .env)*`,
      });
      continue;
    }

    try {
      const historyMessages = room.history
        .filter((m) => !m.isBot || m.agentId)
        .slice(-12)
        .map((m) => ({
          role: (m.isBot ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.isBot && m.agentId
            ? `[${m.agentId}]: ${m.content}`
            : `${m.authorName}: ${m.content}`,
        }));

      const lastIsLatest = historyMessages.some(
        (h) => h.content.includes(latestUserMessage.content.slice(0, 40))
      );
      if (!lastIsLatest) {
        historyMessages.push({
          role: 'user',
          content: `${latestUserMessage.authorName}: ${latestUserMessage.content}`,
        });
      }

      const systemPrompt = buildSystemPrompt(agent, room);

      const response = await provider.generateResponse({
        systemPrompt,
        messages: historyMessages,
        maxTokens: 700,
        temperature: 0.7,
      });

      results.push({
        agentId,
        displayName: agent.displayName,
        content: response.content.trim() || '*(sin respuesta)*',
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[AgentExecutor] Error running ${agentId}:`, errMsg);
      results.push({
        agentId,
        displayName: agent.displayName,
        content: `*(Error al generar respuesta: ${errMsg.slice(0, 120)})*`,
      });
    }
  }

  return results;
}

function buildSystemPrompt(agent: AgentConfig, room: RoomState): string {
  const parts = [agent.systemPrompt];

  if (room.context) {
    parts.push(`\n--- Contexto de la sala ---\n${room.context}\n--- Fin del contexto ---`);
  }

  parts.push(
    `\nEstás conversando en una sala de Discord junto a un humano y posiblemente otras IAs (ChatGPT, Claude, Grok, Gemini).
Responde de forma natural como miembro del equipo. No repitas el saludo en cada mensaje.
Si otras IAs ya respondieron, evita repetir lo mismo; aporta valor adicional o complementa.`
  );

  return parts.join('\n');
}
