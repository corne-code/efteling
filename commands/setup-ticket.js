const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Plaats het ticket-keuzemenu in dit kanaal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Alleen voor Admins

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🏰 Efteling Support & Contact')
            .setDescription(
                'Welkom bij de support van de Efteling! Heb je hulp nodig, wil je solliciteren of heb je een vraag? Klik op één van de onderstaande knoppen om een ticket te openen.\n\n' +
                '**Kies de juiste categorie:**\n' +
                '📝 **Werken bij de Efteling:** Voor sollicitaties en vragen over functies.\n' +
                '🎮 **Attractie Hulp:** Problemen of vragen over attracties in-game.\n' +
                '🔨 **Ban Appeal:** Ben je verbannen en wil je bezwaar maken?\n' +
                '💬 **Discord Vragen:** Algemene vragen over deze Discord server.\n' +
                '🌐 **Park Info:** Vragen over openingstijden, evenementen of het park.'
            )
            .setColor('#145A32') // Efteling groen
            .setFooter({ text: 'Efteling Spoorwegen • Selecteer een optie', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        // Rij 1 met de eerste 3 knoppen
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_werken')
                .setLabel('Werken bij')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('ticket_attractie')
                .setLabel('Attractie Hulp')
                .setEmoji('🎮')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ticket_ban')
                .setLabel('Ban Appeal')
                .setEmoji('🔨')
                .setStyle(ButtonStyle.Danger)
        );

        // Rij 2 met de overige 2 knoppen
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_discord')
                .setLabel('Discord Vragen')
                .setEmoji('💬')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ticket_park')
                .setLabel('Park Info')
                .setEmoji('🌐')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({ content: 'Ticket-systeem wordt hier geplaatst...', ephemeral: true });
        await interaction.channel.send({ embeds: [embed], components: [row1, row2] });
    },
};
