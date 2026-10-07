import 'dotenv/config';
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  Message,
  ChatInputCommandInteraction,
  TextChannel,
} from 'discord.js';
import { initProviders, getConfiguredProviderIds } from './providers/index.js';
import { roomManager } from './rooms/roomManager.js';
import { routeAgents } from './router/agentRouter.js';
import { executeAgents } from './agents/agentExecutor.js';
import { getEnabledAgents } from './agents/defaultAgents.js';
import { toConversationMessage, splitMessage, formatAgentReply } from './utils/discordHelpers.js';
import { handleContextCommand } from './commands/context.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN is required. Copy .env.example to .env and fill it.');
  process.exit(1);
}

// Init AI providers from env
initProviders();
console.log('[Boot] Configured providers:', getConfiguredProviderIds());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  console.log(`✅ DreamByte Rooms online as ${c.user.tag}`);
  console.log(`   Serving ${c.guilds.cache.size} guild(s)`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'context') {
      await handleContextCommand(interaction as ChatInputCommandInteraction);
    }
  } catch (err) {
    console.error('[Interaction] Error:', err);
    const msg = { content: 'Hubo un error al procesar el comando.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg).catch(() => {});
    } else {
      await interaction.reply(msg).catch(() => {});
    }
  }
});

client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content?.trim()) return;

  try {
    await handleHumanMessage(message);
  } catch (err) {
    console.error('[Message] Error handling message:', err);
  }
});

async function handleHumanMessage(message: Message): Promise<void> {
  const channelId = message.channelId;
  const guildId = message.guildId;

  const room = await roomManager.getOrCreate(channelId, guildId);

  const convMsg = toConversationMessage(message);
  await roomManager.addMessage(channelId, convMsg, guildId);

  const updatedRoom = await roomManager.getOrCreate(channelId, guildId);

  const available = getEnabledAgents().filter((a) =>
    updatedRoom.enabledAgents.includes(a.id)
  );
  const lower = message.content.toLowerCase();
  const mentionedAgents = available
    .filter((a) => a.triggers.some((t) => lower.includes(t.toLowerCase())))
    .map((a) => a.id);

  const decision = routeAgents({
    roomContext: updatedRoom.context,
    autonomyMode: updatedRoom.autonomyMode,
    message: convMsg,
    conversationHistory: updatedRoom.history,
    availableAgents: available,
    mentionedAgents,
  });

  if (!decision.shouldRespond || decision.agents.length === 0) {
    return;
  }

  const ordered = [...decision.agents].sort((a, b) => a.priority - b.priority);
  const agentIds = ordered.map((d) => d.id);

  // Typing indicator
  if (message.channel.isTextBased() && 'sendTyping' in message.channel) {
    await message.channel.sendTyping().catch(() => {});
  }

  const replies = await executeAgents(agentIds, updatedRoom, convMsg);

  // Safe channel for sending messages
  const channel = message.channel as TextChannel;
  if (!channel || typeof channel.send !== 'function') {
    console.warn('[Message] Channel is not sendable');
    return;
  }

  for (const reply of replies) {
    const formatted = formatAgentReply(reply.displayName, reply.content);
    const chunks = splitMessage(formatted);

    for (const chunk of chunks) {
      const sent = await channel.send({ content: chunk });
      await roomManager.addMessage(
        channelId,
        {
          id: sent.id,
          authorId: client.user?.id ?? 'bot',
          authorName: reply.displayName,
          content: reply.content,
          timestamp: sent.createdTimestamp,
          isBot: true,
          agentId: reply.agentId,
        },
        guildId
      );
    }
  }
}

client.login(token).catch((err) => {
  console.error('Failed to login to Discord:', err);
  process.exit(1);
});
