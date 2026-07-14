const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

const levelsFilePath = path.join(__dirname, '../levels.json');
const countingFilePath = path.join(__dirname, '../counting.json');
const flagsFilePath = path.join(__dirname, '../flags.json');

// Actieve vlaggenrondes tracker
global.activeFlagGames = global.activeFlagGames || {};

function loadLevels() {
    if (!fs.existsSync(levelsFilePath)) fs.writeFileSync(levelsFilePath, JSON.stringify({}, null, 2));
    return JSON.parse(fs.readFileSync(levelsFilePath, 'utf-8'));
}
function saveLevels(data) { fs.writeFileSync(levelsFilePath, JSON.stringify(data, null, 2)); }

function loadCounting() {
    if (!fs.existsSync(countingFilePath)) fs.writeFileSync(countingFilePath, JSON.stringify({}, null, 2));
    return JSON.parse(fs.readFileSync(countingFilePath, 'utf-8'));
}
function saveCounting(data) { fs.writeFileSync(countingFilePath, JSON.stringify(data, null, 2)); }

// Functie om direct een nieuwe vlag te starten
async function startNewFlagRound(channel) {
    if (!fs.existsSync(flagsFilePath)) return;
    const flags = JSON.parse(fs.readFileSync(flagsFilePath, 'utf-8'));
    const randomFlag = flags[Math.floor(Math.random() * flags.length)];

    global.activeFlagGames[channel.id] = {
        correctAnswers: randomFlag.names,
        flagEmoji: randomFlag.flag,
        isEnded: false
    };

    const embed = new EmbedBuilder()
        .setTitle('🌍 Welk land is dit?')
        .setDescription(`Raad de vlag zo snel mogelijk:\n\n# ${randomFlag.flag}`)
        .setColor('#145A32')
        .setFooter({ text: 'Typ je antwoord gewoon hier in de chat! (15 seconden)' })
        .setTimestamp();

    const gameMessage = await channel.send({ embeds: [embed] });

    // Als er na 15 seconden niemand heeft geraden, sluit de ronde en start een nieuwe
    setTimeout(async () => {
        const game = global.activeFlagGames[channel.id];
        if (game && !game.isEnded && game.flagEmoji === randomFlag.flag) {
            game.isEnded = true;
            await channel.send(`⏱️ **Tijd is voorbij!** Niemand heeft het geraden. Het juiste antwoord was: **${randomFlag.names[0].toUpperCase()}**.`);
            
            // Start meteen weer een nieuwe ronde
            setTimeout(() => startNewFlagRound(channel), 2000);
        }
    }, 15000);
}

const xpCooldowns = new Set();

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const guildId = message.guild.id;

        const serverConfig = Object.values(config.servers).find(s => s.guildId === guildId);
        if (!serverConfig) return;

        // --- 1. VLAGGEN RAADSPEL LOGICA ---
        if (message.channel.id === serverConfig.vlaggen) {
            const game = global.activeFlagGames[message.channel.id];
            const userAnswer = message.content.trim().toLowerCase();

            if (game && !game.isEnded) {
                // Controleer of het antwoord in de lijst van juiste namen staat
                if (game.correctAnswers.includes(userAnswer)) {
                    game.isEnded = true; // Stop de ronde meteen zodat niemand anders meer kan scoren
                    
                    await message.react('🎉').catch(() => {});
                    await message.reply(`🥇 **Goed geraden <@${userId}>!** Het was inderdaad **${game.correctAnswers[0].toUpperCase()}**! We gaan direct door naar de volgende vlag...`);

                    // Start direct de volgende ronde na 2 seconden pauze
                    setTimeout(() => {
                        startNewFlagRound(message.channel);
                    }, 2000);
                    return;
                }
            }
        }

        // --- 2. TELSYSTEEM ---
        const contentClean = message.content.trim();
        const isNumber = /^\d+$/.test(contentClean);

        if (message.channel.id === serverConfig.tellen && isNumber) {
            const countingData = loadCounting();
            if (!countingData[guildId]) countingData[guildId] = { currentNumber: 0, lastUser: null };

            const inputNumber = parseInt(contentClean, 10);
            const nextNumber = countingData[guildId].currentNumber + 1;

            if (inputNumber !== nextNumber) {
                countingData[guildId] = { currentNumber: 0, lastUser: null };
                saveCounting(countingData);
                await message.react('❌').catch(() => {});
                return message.reply(`🔴 **Fout!** <@${userId}> typte **${inputNumber}** in plaats van **${nextNumber}**. We beginnen weer bij **1**!`);
            }

            if (countingData[guildId].lastUser === userId) {
                countingData[guildId] = { currentNumber: 0, lastUser: null };
                saveCounting(countingData);
                await message.react('❌').catch(() => {});
                return message.reply(`🔴 **Fout!** <@${userId}>, je mag niet twee keer achter elkaar tellen! We beginnen weer bij **1**!`);
            }

            countingData[guildId].currentNumber = nextNumber;
            countingData[guildId].lastUser = userId;
            saveCounting(countingData);
            await message.react('✅').catch(() => {});
            return;
        }

        // --- 3. LEVELSYSTEEM ---
        if (xpCooldowns.has(userId)) return;

        const levelsData = loadLevels();
        if (!levelsData[userId]) levelsData[userId] = { xp: 0, level: 0, username: message.author.username };

        const xpToGive = Math.floor(Math.random() * 11) + 15;
        levelsData[userId].xp += xpToGive;
        levelsData[userId].username = message.author.username;

        const neededXp = (levelsData[userId].level + 1) * 500;

        if (levelsData[userId].xp >= neededXp) {
            levelsData[userId].level += 1;
            const levelUpEmbed = new EmbedBuilder()
                .setTitle('🌟 Level Omhoog!')
                .setDescription(`🎉 Gefeliciteerd <@${userId}>! Je bent zojuist gestegen naar **Level ${levelsData[userId].level}**!`)
                .setColor('#145A32')
                .setTimestamp();

            await message.channel.send({ embeds: [levelUpEmbed] }).catch(() => {});

            const logChannel = message.guild.channels.cache.get(serverConfig.logs);
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
        xpCooldowns.add(userId);
        setTimeout(() => { xpCooldowns.delete(userId); }, 60000);
    },
    // Exporteer de functie zodat we hem via het command kunnen opstarten
    startNewFlagRound
};
