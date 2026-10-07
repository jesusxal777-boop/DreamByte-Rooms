import type { AutonomyMode, ConversationMessage, MemoryStore, RoomState } from '../types/index.js';
import { defaultAgents } from '../agents/defaultAgents.js';

const MAX_HISTORY = 30;

/**
 * In-memory room manager.
 * Designed so it can later be swapped for a Supabase (or other) MemoryStore implementation.
 */
class InMemoryRoomManager implements MemoryStore {
  private rooms = new Map<string, RoomState>();

  async getRoom(channelId: string): Promise<RoomState | null> {
    return this.rooms.get(channelId) ?? null;
  }

  async saveRoom(room: RoomState): Promise<void> {
    room.lastUpdated = Date.now();
    this.rooms.set(room.channelId, room);
  }

  async deleteRoom(channelId: string): Promise<void> {
    this.rooms.delete(channelId);
  }

  async getOrCreate(channelId: string, guildId: string | null = null): Promise<RoomState> {
    let room = await this.getRoom(channelId);
    if (!room) {
      room = {
        channelId,
        guildId,
        context: '',
        autonomyMode: 'yellow',
        history: [],
        enabledAgents: defaultAgents.filter((a) => a.enabled).map((a) => a.id),
        lastUpdated: Date.now(),
      };
      await this.saveRoom(room);
    }
    return room;
  }

  async setContext(channelId: string, context: string, guildId: string | null = null): Promise<RoomState> {
    const room = await this.getOrCreate(channelId, guildId);
    room.context = context.trim();
    await this.saveRoom(room);
    return room;
  }

  async clearContext(channelId: string): Promise<RoomState> {
    const room = await this.getOrCreate(channelId);
    room.context = '';
    await this.saveRoom(room);
    return room;
  }

  async setAutonomyMode(channelId: string, mode: AutonomyMode): Promise<RoomState> {
    const room = await this.getOrCreate(channelId);
    room.autonomyMode = mode;
    await this.saveRoom(room);
    return room;
  }

  async addMessage(channelId: string, message: ConversationMessage, guildId: string | null = null): Promise<RoomState> {
    const room = await this.getOrCreate(channelId, guildId);
    room.history.push(message);
    if (room.history.length > MAX_HISTORY) {
      room.history = room.history.slice(-MAX_HISTORY);
    }
    await this.saveRoom(room);
    return room;
  }

  async getHistory(channelId: string): Promise<ConversationMessage[]> {
    const room = await this.getRoom(channelId);
    return room?.history ?? [];
  }
}

export const roomManager = new InMemoryRoomManager();
