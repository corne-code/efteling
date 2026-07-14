const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const messageEvent = require('../events/messageCreate.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('flag')
        .setDescription('Start het non-stop vlaggen-raadspel in dit kanaal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // De strenge ID-check is nu weggehaald zodat het commando altijd luistert
        await interaction.reply({ content: '🚀 **Vlaggen-raadspel wordt nu in dit kanaal opgestart...**', ephemeral: true });
        
        // Start direct de eerste vlaggenronde in de chat
        messageEvent.startNewFlagRound(interaction.channel);
    },
};
