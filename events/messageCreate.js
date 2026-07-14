const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const levelsFilePath = path.join(__dirname, '../levels.json');

// Laad of herstel het levels.json bestand
function loadLevels() {
    if (!fs.existsSync(levelsFilePath)) {
        fs.writeFileSync(levelsFilePath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(levelsFilePath, 'utf-8'));
}

// Sla de levels op
function saveLevels(data) {
    fs.writeFileSync(levelsFilePath, JSON.stringify(data, null, 2));
}

// Cooldown tracker om XP-spam te voorkomen (max 1x per minuut)
const xpCooldowns = new Set();

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Negeer bots en privéberichten
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;

        // Als de gebruiker in de cooldown zit, geef geen XP
        if (xpCooldowns.has(userId)) return;

        const levelsData = loadLevels();

        // Als de gebruiker nog niet bestaat in de database, maak hem aan
        if (!levelsData[userId]) {
            levelsData[userId] = {
                xp: 0,
                level: 0,
                username: message.author.username
            };
        }

        // Genereer willekeurige XP tussen 15 en 25
        const xpToGive = Math.floor(Math.random() * 11) + 15;
        levelsData[userId].xp += xpToGive;
        levelsData[userId].username = message.author.username; // Update altijd even de naam

        // Bereken hoeveel XP nodig is voor het volgende level (bijv. level * 500)
        const neededXp = (levelsData[userId].level + 1) * 500;

        // Level-up logica
        if (levelsData[userId].xp >= neededXp) {
            levelsData[userId].level += 1;
            
            // Stuur een mooi Efteling level-up bericht in het kanaal
            const levelUpEmbed = new EmbedBuilder()
                .setTitle('🌟 Level Omhoog!')
                .setDescription(`🎉 Gefeliciteerd <@${userId}>! Je bent zojuist gestegen naar **Level ${levelsData[userId].level}** in de Efteling!`)
                .setColor('#145A32')
                .setTimestamp();

            await message.channel.send({ embeds: [levelUpEmbed] }).catch(() => {});

            // Log de level-up naar het logkanaal uit config.json
            const logChannel = message.guild.channels.cache.get(config.channels.logs);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📈 Level Log')
                    .setDescription(`**Gebruiker:** <@${userId}>\n**Nieuw Level:** ${levelsData[userId].level}`)
                    .setColor('#3498DB')
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
            }
        }

        saveLevels(levelsData);

        // Zet op cooldown voor 60 seconden
        xpCooldowns.add(userId);
        setTimeout(() => {
            xpCooldowns.delete(userId);
        }, 60000);
    },
};
