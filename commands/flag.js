const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');
const messageEvent = require('../events/messageCreate.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('flag')
        .setDescription('Start het non-stop vlaggen-raadspel in dit kanaal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const serverConfig = Object.values(config.servers).find(s => s.guildId === guildId);

        if (!serverConfig || interaction.channel.id !== serverConfig.vlaggen) {
            return interaction.reply({ content: 'Je kunt dit spel alleen opstarten in het officiële vlaggen-kanaal!', ephemeral: true });
        }

        await interaction.reply({ content: '🚀 **Vlaggen-raadspel wordt nu opgestart...**', ephemeral: true });
        
        // Roep de startfunctie aan uit het eventbestand
        messageEvent.startNewFlagRound(interaction.channel);
    },
};
