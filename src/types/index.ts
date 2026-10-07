/**
 * Core types for DreamByte Rooms
 */

export type AutonomyMode = 'red' | 'yellow' | 'green';

export interface AgentConfig {
  id: string;
  name: string;
  displayName: string;
  role: string;
  systemPrompt: string;
  providerId: string;
  enabled: boolean;
  /** Mentions that trigger this agent (e.g. ["claude", "@claude"]) */
  triggers: string[];
}

export interface RoomState {
  channelId: string;
  guildId: string | null;
  context: string;
  autonomyMode: AutonomyMode;
  history: ConversationMessage[];
  enabledAgents: string[];
  lastUpdated: number;
}

export interface ConversationMessage {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: number;
  isBot: boolean;
  agentId?: string; // if message came from an AI agent
}

export interface AIRequest {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  id: string;
  name: string;
  generateResponse(input: AIRequest): Promise<AIResponse>;
  isConfigured(): boolean;
}

export interface RouterInput {
  roomContext: string;
  autonomyMode: AutonomyMode;
  message: ConversationMessage;
  conversationHistory: ConversationMessage[];
  availableAgents: AgentConfig[];
  mentionedAgents: string[]; // agent ids explicitly mentioned
}

export interface AgentDecision {
  id: string;
  priority: number;
  reason: string;
}

export interface RouterDecision {
  agents: AgentDecision[];
  shouldRespond: boolean;
  note?: string;
}

/** Future extension points */
export interface VoiceSession {
  channelId: string;
  // placeholder for Discord Voice
}

export interface ScreenCapture {
  // placeholder
}

export interface FileAttachment {
  name: string;
  url: string;
  contentType?: string;
  size?: number;
}

export interface MemoryStore {
  getRoom(channelId: string): Promise<RoomState | null>;
  saveRoom(room: RoomState): Promise<void>;
  deleteRoom(channelId: string): Promise<void>;
}
