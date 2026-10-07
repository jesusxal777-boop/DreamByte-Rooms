import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { roomManager } from '../rooms/roomManager.js';
import type { AutonomyMode } from '../types/index.js';

export const contextCommand = new SlashCommandBuilder()
  .setName('context')
  .setDescription('Gestiona el contexto y modo de autonomía de esta sala')
  .addSubcommand((sub) =>
    sub
      .setName('set')
      .setDescription('Establece el contexto de la sala')
      .addStringOption((opt) =>
        opt.setName('texto').setDescription('Descripción del contexto').setRequired(true).setMaxLength(1500)
      )
  )
  .addSubcommand((sub) => sub.setName('show').setDescription('Muestra el contexto y modo actuales'))
  .addSubcommand((sub) => sub.setName('clear').setDescription('Limpia el contexto de la sala'))
  .addSubcommand((sub) =>
    sub
      .setName('mode')
      .setDescription('Cambia el modo de autonomía de las IAs')
      .addStringOption((opt) =>
        opt
          .setName('modo')
          .setDescription('red | yellow | green')
          .setRequired(true)
          .addChoices(
            { name: '🔴 Red (solo menciones)', value: 'red' },
            { name: '🟡 Yellow (relevante)', value: 'yellow' },
            { name: '🟢 Green (autónomo)', value: 'green' }
          )
      )
  );

export async function handleContextCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;

  if (sub === 'set') {
    const texto = interaction.options.getString('texto', true);
    const room = await roomManager.setContext(channelId, texto, guildId);
    await interaction.reply({
      content: `✅ Contexto actualizado:\n> ${room.context.slice(0, 300)}${room.context.length > 300 ? '…' : ''}`,
    });
    return;
  }

  if (sub === 'show') {
    const room = await roomManager.getOrCreate(channelId, guildId);
    const embed = new EmbedBuilder()
      .setTitle('📋 Contexto de la sala')
      .setColor(0x5865f2)
      .addFields(
        { name: 'Contexto', value: room.context || '_Sin contexto_' },
        { name: 'Modo', value: formatMode(room.autonomyMode) },
        { name: 'Agentes', value: room.enabledAgents.join(', ') || '_ninguno_' }
      );
    await interaction.reply({ embeds: [embed] });
    return;
  }

  if (sub === 'clear') {
    await roomManager.clearContext(channelId);
    await interaction.reply({ content: '🧹 Contexto limpiado.' });
    return;
  }

  if (sub === 'mode') {
    const mode = interaction.options.getString('modo', true) as AutonomyMode;
    const room = await roomManager.setAutonomyMode(channelId, mode);
    await interaction.reply({ content: `Modo cambiado a **${formatMode(room.autonomyMode)}**` });
  }
}

function formatMode(mode: AutonomyMode): string {
  switch (mode) {
    case 'red': return '🔴 Red — solo responden si las mencionas';
    case 'yellow': return '🟡 Yellow — responden cuando es relevante';
    case 'green': return '🟢 Green — participan de forma más autónoma';
    default: return mode;
  }
}
