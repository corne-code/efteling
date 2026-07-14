const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const countingFilePath = path.join(__dirname, '../counting.json');

function loadCounting() {
    if (!fs.existsSync(countingFilePath)) {
        return { currentNumber: 0, lastUser: null };
    }
    return JSON.parse(fs.readFileSync(countingFilePath, 'utf-8'));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('count')
        .setDescription('Bekijk de huidige stand van het telsysteem.'),

    async execute(interaction) {
        const countingData = loadCounting();

        const embed = new EmbedBuilder()
            .setTitle('🔢 Efteling Tel-Status')
            .setDescription(
                `Het huidige getal waar we zijn gebleven is: **${countingData.currentNumber}**\n\n` +
                `Het volgende getal dat getypt moet worden is: **${countingData.currentNumber + 1}**\n` +
                `Laatste persoon die geteld heeft: ${countingData.lastUser ? `<@${countingData.lastUser}>` : '*Niemand*'}`
            )
            .setColor('#145A32')
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },
};
