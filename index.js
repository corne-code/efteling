const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const http = require('http');

// Webserver voor Render/UptimeRobot
http.createServer((req, res) => {
    res.write("Efteling Bot is running!");
    res.end();
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;

// --- CONFIGURATIE (Pas deze ID's aan in Discord) ---
const COUNT_CHANNEL_ID = '1517242275602759790';
const WELCOME_CHANNEL_ID = '1517153163302404200';
const LEVEL_CHANNEL_ID = '1517153163302404201'; // <-- PAS DIT ID AAN VOOR JE LEVELS KANAAL

const TICKET_CATEGORIES = {
    ticket_soli: "1525019961171509409",
    ticket_mc: "1525019522921267251",
    ticket_ban: "1525225726490706021",
    ticket_dc: "1525225822204723210",
    ticket_web: "1525225910540964000"
};

// --- DATA OPSLAG (In-memory) ---
let currentCount = 0;
let lastCounterId = null;
const userLevels = {}; // Slaat XP en Levels op: { userId: { xp: 0, level: 1 } }
const activeGames = {}; // Slaat lopende spelletjes per kanaal op

// --- EFTELING VRAGEN DATA ---
const eftelingQuestions = [
    { q: "In welk jaar opende de Efteling haar deuren?", a: "1952" },
    { q: "Hoe heet de bekende vuurspuwende draak bij de Joris en de Draak?", a: "draak lloyd" },
    { q: "Welke attractie heeft de bekende bewoner 'Lange Jan'?", a: "sprookjesbos" },
    { q: "Hoe heet de achtbaan die in het donker rijdt en een vogel als thema heeft?", a: "vogel rok" },
    { q: "Wat roept Holle Bolle Gijs altijd?", a: "papier hier" }
];

// --- VLAG RADEN DATA ---
const flagGames = [
    { flag: "🇳🇱", name: "nederland" },
    { flag: "🇧🇪", name: "belgie" },
    { flag: "🇩🇪", name: "duitsland" },
    { flag: "🇫🇷", name: "frankrijk" },
    { flag: "🇬🇧", name: "engeland" }
];

// --- HULPFUNCTIES VOOR MINI-GAMES ---
function startNewFlagGame(channel) {
    const game = flagGames[Math.floor(Math.random() * flagGames.length)];
    activeGames[channel.id] = { type: 'vlag', answer: game.name };
    channel.send(`🗺️ **Volgende vlag!** Welk land hoort bij deze vlag: ${game.flag}?`);
}

function startNewEftelingGame(channel) {
    const game = eftelingQuestions[Math.floor(Math.random() * eftelingQuestions.length)];
    activeGames[channel.id] = { type: 'vraag', answer: game.a };
    channel.send(`🏰 **Volgende Efteling vraag!** ${game.q}`);
}

// --- EVENT: BOT READY ---
client.once('ready', () => {
    console.log(`🤖 Ingelogd als ${client.user.tag}! Efteling Bot is klaar voor gebruik.`);
});

// --- EVENT: MESSAGE CREATE ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;

    // --- TELSYS ---
    if (message.channel.id === COUNT_CHANNEL_ID) {
        const number = parseInt(message.content);
        if (isNaN(number)) return message.delete().catch(console.error);

        if (number !== currentCount + 1) {
            const correctTarget = currentCount + 1;
            currentCount = 0;
            lastCounterId = null;
            return message.reply(`❌ Fout! Het juiste getal moest ${correctTarget} zijn. We beginnen weer bij 1!`);
        }

        if (userId === lastCounterId) {
            currentCount = 0;
            lastCounterId = null;
            return message.reply("❌ Je mag niet twee keer achter elkaar tellen! We beginnen weer bij 1!");
        }

        currentCount = number;
        lastCounterId = userId;
        return message.react('✅').catch(console.error);
    }

    // --- LEVEL SYSTEEM (XP PER BERICHT) ---
    if (!userLevels[userId]) userLevels[userId] = { xp: 0, level: 1 };
    
    userLevels[userId].xp += Math.floor(Math.random() * 10) + 5; 
    const xpNeeded = userLevels[userId].level * 100;

    if (userLevels[userId].xp >= xpNeeded) {
        userLevels[userId].level += 1;
        userLevels[userId].xp = 0;
        
        // Stuur bericht naar de chat waar de gebruiker praat
        message.reply(`🎉 **Level Up!** Je bent nu level **${userLevels[userId].level}**!`);
        
        // Stuur direct een melding naar het speciale levels-kanaal
        const levelChannel = message.guild.channels.cache.get(LEVEL_CHANNEL_ID);
        if (levelChannel) {
            const levelEmbed = new EmbedBuilder()
                .setTitle("🌟 Efteling Status Omhoog!")
                .setDescription(`🏆 Gijs wenst <@${userId}> gefeliciteerd!\nGebruiker is gestegen naar **Level ${userLevels[userId].level}**!`)
                .setColor(0x2E1F14)
                .setTimestamp();
            levelChannel.send({ embeds: [levelEmbed] }).catch(console.error);
        }
    }

    // --- LEVEL COMMANDO ---
    if (message.content === '!level') {
        const levelData = userLevels[userId];
        return message.reply(`🌟 **Je Efteling Status:**\n• Level: ${levelData.level}\n• XP: ${levelData.xp}/${levelData.level * 100}`);
    }

    // --- MINI-GAMES COMMANDO'S ---
    if (message.content === '!vlag') {
        if (activeGames[message.channel.id]) return message.reply("Er is al een spel bezig in dit kanaal! Typ `!stop` om het te beëindigen.");
        
        const game = flagGames[Math.floor(Math.random() * flagGames.length)];
        activeGames[message.channel.id] = { type: 'vlag', answer: game.name };
        return message.reply(`🗺️ **Vlag Raden Gestart!** Welk land hoort bij deze vlag: ${game.flag}? (Typ \`!stop\` om te stoppen)`);
    }

    if (message.content === '!eftelingvraag') {
        if (activeGames[message.channel.id]) return message.reply("Er is al een spel bezig in dit kanaal! Typ `!stop` om het te beëindigen.");
        
        const game = eftelingQuestions[Math.floor(Math.random() * eftelingQuestions.length)];
        activeGames[message.channel.id] = { type: 'vraag', answer: game.a };
        return message.reply(`🏰 **Efteling Quiz Gestart!** ${game.q} (Typ \`!stop\` om te stoppen)`);
    }

    // Handmatig een spel stoppen
    if (message.content === '!stop') {
        if (activeGames[message.channel.id]) {
            delete activeGames[message.channel.id];
            return message.reply("🛑 Het spel is stopgezet!");
        }
    }

    // Antwoorden controleren & direct een nieuwe vraag starten
    const channelGame = activeGames[message.channel.id];
    if (channelGame) {
        if (message.content.toLowerCase() === channelGame.answer.toLowerCase()) {
            const gameType = channelGame.type;
            
            await message.reply(`🏆 Goed geraden <@${userId}>! Het antwoord was inderdaad **${channelGame.answer}**.`);
            
            // Wacht 2 seconden en start direct de volgende ronde
            setTimeout(() => {
                if (gameType === 'vlag') {
                    startNewFlagGame(message.channel);
                } else if (gameType === 'vraag') {
                    startNewEftelingGame(message.channel);
                }
            }, 2000);
            return;
        }
    }

    // --- TICKET SETUP COMMANDO ---
    if (message.content === '!setup-ticket' && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle("🏰 Efteling Support & Solicitaties")
            .setDescription("Welkom bij de Efteling klantenservice. Klik op een knop om een ticket te openen.")
            .setColor(0x2E1F14);

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_soli').setLabel('Werken bij de Efteling').setStyle(ButtonStyle.Primary).setEmoji('📝'),
            new ButtonBuilder().setCustomId('ticket_mc').setLabel('Attractie Hulp').setStyle(ButtonStyle.Success).setEmoji('🎮'),
            new ButtonBuilder().setCustomId('ticket_ban').setLabel('Ban Appeal').setStyle(ButtonStyle.Danger).setEmoji('🔨')
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_dc').setLabel('Discord Vragen').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
            new ButtonBuilder().setCustomId('ticket_web').setLabel('Park info').setStyle(ButtonStyle.Secondary).setEmoji('🌐')
        );

        await message.channel.send({ embeds: [embed], components: [row1, row2] });
        message.delete().catch(console.error);
    }
});

// --- INTERACTION HANDLING (TICKETS CREËREN & SLUITEN) ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('ticket_')) {
        await interaction.deferReply({ ephemeral: true });

        let ticketType = '';
        let prefix = 'ticket';

        if (interaction.customId === 'ticket_soli') { ticketType = 'Sollicitatie'; prefix = 'soli'; }
        if (interaction.customId === 'ticket_mc') { ticketType = 'Park Hulp'; prefix = 'park'; }
        if (interaction.customId === 'ticket_ban') { ticketType = 'Ban Appeal'; prefix = 'ban'; }
        if (interaction.customId === 'ticket_dc') { ticketType = 'Discord Hulp'; prefix = 'dc'; }
        if (interaction.customId === 'ticket_web') { ticketType = 'Website Hulp'; prefix = 'web'; }

        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: `${prefix}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORIES[interaction.customId],
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
                ]
            });

