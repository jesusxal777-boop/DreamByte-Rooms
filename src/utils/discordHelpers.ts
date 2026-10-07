import type { Message } from 'discord.js';
import type { ConversationMessage } from '../types/index.js';

export function toConversationMessage(msg: Message, agentId?: string): ConversationMessage {
  return {
    id: msg.id,
    authorId: msg.author.id,
    authorName: msg.author.displayName || msg.author.username,
    content: msg.content,
    timestamp: msg.createdTimestamp,
    isBot: msg.author.bot,
    agentId,
  };
}

export function splitMessage(text: string, maxLen = 1900): string[] {
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      parts.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf('\n', maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf(' ', maxLen);
    if (splitAt < maxLen * 0.5) splitAt = maxLen;
    parts.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  return parts;
}

export function formatAgentReply(displayName: string, content: string): string {
  return `**${displayName}:**\n${content}`;
}
