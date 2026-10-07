import type {
  AgentConfig,
  AgentDecision,
  AutonomyMode,
  RouterDecision,
  RouterInput,
} from '../types/index.js';

/**
 * AI Router - decides which agents should respond.
 * Independent of any specific AI provider.
 */

const IMPLEMENTATION_KEYWORDS = [
  'implementa', 'código', 'code', 'función', 'function', 'clase', 'class',
  'bug', 'error', 'fix', 'arregla', 'refactor', 'typescript', 'javascript',
  'api', 'endpoint', 'pr', 'pull request', 'commit', 'archivo', 'file',
];

const ARCHITECTURE_KEYWORDS = [
  'arquitectura', 'architecture', 'diseño', 'design', 'estructura',
  'módulo', 'module', 'sistema', 'system', 'escalable', 'patrón', 'pattern',
];

const RESEARCH_KEYWORDS = [
  'investiga', 'research', 'busca', 'search', 'compara', 'compare',
  'opción', 'option', 'alternativa', 'alternative', 'documentación', 'docs',
];

const REVIEW_KEYWORDS = [
  'revisa', 'review', 'opinión', 'opinion', 'qué piensas', 'what do you think',
  'alternativa', 'mejor', 'better', 'crítica', 'critique',
];

function scoreAgent(agent: AgentConfig, message: string, context: string): number {
  const text = `${message} ${context}`.toLowerCase();
  let score = 1;

  const role = agent.role.toLowerCase();

  if (agent.id === 'claude' || role.includes('desarrollador') || role.includes('implementación')) {
    if (IMPLEMENTATION_KEYWORDS.some((k) => text.includes(k))) score += 3;
  }
  if (agent.id === 'chatgpt' || role.includes('coordinador') || role.includes('arquitectura')) {
    if (ARCHITECTURE_KEYWORDS.some((k) => text.includes(k))) score += 3;
    if (IMPLEMENTATION_KEYWORDS.some((k) => text.includes(k))) score += 1;
  }
  if (agent.id === 'grok' || role.includes('revisión') || role.includes('alternativas')) {
    if (REVIEW_KEYWORDS.some((k) => text.includes(k))) score += 3;
    if (IMPLEMENTATION_KEYWORDS.some((k) => text.includes(k))) score += 1;
  }
  if (agent.id === 'gemini' || role.includes('investigación')) {
    if (RESEARCH_KEYWORDS.some((k) => text.includes(k))) score += 3;
  }

  if (text.includes(agent.id) || text.includes(agent.name.toLowerCase())) {
    score += 2;
  }

  return score;
}

function detectMentions(content: string, agents: AgentConfig[]): string[] {
  const lower = content.toLowerCase();
  const mentioned: string[] = [];
  for (const agent of agents) {
    for (const trigger of agent.triggers) {
      if (lower.includes(trigger.toLowerCase())) {
        mentioned.push(agent.id);
        break;
      }
    }
  }
  return [...new Set(mentioned)];
}

export function routeAgents(input: RouterInput): RouterDecision {
  const { roomContext, autonomyMode, message, availableAgents, mentionedAgents } = input;
  const content = message.content;
  const agents = availableAgents.filter((a) => a.enabled);

  const explicit = mentionedAgents.length > 0
    ? mentionedAgents
    : detectMentions(content, agents);

  if (autonomyMode === 'red') {
    if (explicit.length === 0) {
      return { agents: [], shouldRespond: false, note: 'Mode red: no explicit mention' };
    }
    const decisions: AgentDecision[] = explicit.map((id, i) => ({
      id,
      priority: i + 1,
      reason: 'Mencionado explícitamente',
    }));
    return { agents: decisions, shouldRespond: true };
  }

  if (autonomyMode === 'yellow') {
    const isQuestion = /\?|¿|cómo|qué|por qué|ayuda|help|puedes|podrías/.test(content.toLowerCase());
    const hasKeywords =
      IMPLEMENTATION_KEYWORDS.some((k) => content.toLowerCase().includes(k)) ||
      ARCHITECTURE_KEYWORDS.some((k) => content.toLowerCase().includes(k)) ||
      RESEARCH_KEYWORDS.some((k) => content.toLowerCase().includes(k)) ||
      REVIEW_KEYWORDS.some((k) => content.toLowerCase().includes(k));

    if (explicit.length === 0 && !isQuestion && !hasKeywords) {
      if (!roomContext || content.trim().length < 15) {
        return { agents: [], shouldRespond: false, note: 'Mode yellow: not relevant enough' };
      }
    }

    const scored = agents
      .map((a) => ({ agent: a, score: scoreAgent(a, content, roomContext) }))
      .sort((a, b) => b.score - a.score);

    const selectedIds = new Set<string>(explicit);
    for (const { agent } of scored) {
      if (selectedIds.size >= 2) break;
      selectedIds.add(agent.id);
    }

    const decisions: AgentDecision[] = Array.from(selectedIds).map((id, i) => {
      const a = agents.find((x) => x.id === id)!;
      return {
        id,
        priority: i + 1,
        reason: explicit.includes(id)
          ? 'Mencionado explícitamente'
          : `Relevante por rol (${a.role.split(',')[0]})`,
      };
    });

    return { agents: decisions, shouldRespond: decisions.length > 0 };
  }

  // green
  const scored = agents
    .map((a) => ({ agent: a, score: scoreAgent(a, content, roomContext) }))
    .sort((a, b) => b.score - a.score);

  const selectedIds = new Set<string>(explicit);
  for (const { agent, score } of scored) {
    if (selectedIds.size >= 3) break;
    if (score >= 1 || explicit.includes(agent.id)) {
      selectedIds.add(agent.id);
    }
  }

  if (selectedIds.size === 0 && agents.length > 0 && content.trim().length > 5) {
    selectedIds.add(scored[0].agent.id);
  }

  const decisions: AgentDecision[] = Array.from(selectedIds).map((id, i) => {
    const a = agents.find((x) => x.id === id)!;
    return {
      id,
      priority: i + 1,
      reason: explicit.includes(id)
        ? 'Mencionado explícitamente'
        : `Modo green - rol relevante (${a.role.split(',')[0]})`,
    };
  });

  return { agents: decisions, shouldRespond: decisions.length > 0 };
}
