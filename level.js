const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const levelsFilePath = path.join(__dirname, '../levels.json');

function loadLevels() {
    if (!fs.existsSync(levelsFilePath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(levelsFilePath, 'utf-8'));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Bekijk je eigen level of de top 10 actieve leden.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Bekijk je huidige level en XP.')
                .addUserOption(option => option.setName('gebruiker').setDescription('De gebruiker waarvan je het level wilt zien.')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Bekijk de top 10 van de server.')),

    async execute(interaction) {
        const levelsData = loadLevels();
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'status') {
            const targetUser = interaction.options.getUser('gebruiker') || interaction.user;
            const userData = levelsData[targetUser.id];

            if (!userData || userData.xp === 0) {
                return interaction.reply({ content: `${targetUser.username} heeft nog geen XP verdiend. Typ wat berichtjes om te beginnen!`, ephemeral: true });
            }

            const currentLevel = userData.level;
            const currentXp = userData.xp;
            const neededXp = (currentLevel + 1) * 500;

            const embed = new EmbedBuilder()
                .setTitle(`🏰 Efteling Paspoort van ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '✨ Huidig Level', value: `Level **${currentLevel}**`, inline: true },
                    { name: '📈 Totaal XP', value: `**${currentXp}** XP`, inline: true },
                    { name: '🎯 Volgend Level', value: `**${currentXp}/${neededXp}** XP`, inline: false }
                )
                .setColor('#145A32')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'leaderboard') {
            // Sorteer alle gebruikers op basis van hun totale XP
            const sorted = Object.entries(levelsData)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => b.xp - a.xp)
                .slice(0, 10); // Pak alleen de top 10

            if (sorted.length === 0) {
                return interaction.reply({ content: 'Het leaderboard is nog helemaal leeg!', ephemeral: true });
            }

            let leaderboardText = "";
            sorted.forEach((user, index) => {
                let medal = `${index + 1}.`;
                if (index === 0) medal = '🥇';
                if (index === 1) medal = '🥈';
                if (index === 2) medal = '🥉';

                leaderboardText += `${medal} **${user.username}** — Level ${user.level} (${user.xp} XP)\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('🏆 Efteling Ranglijst (Top 10)')
                .setDescription(leaderboardText)
                .setColor('#145A32')
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    },
};
