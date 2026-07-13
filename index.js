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

// --- CONFIGURATIE ---
const COUNT_CHANNEL_ID = '1517242275602759790'; // <-- HIER ZET JE HET TELKANAAL ID NEER
const WELCOME_CHANNEL_ID = '1517153163302404200';
const LEVEL_CHANNEL_ID = '1517153163302404201'; // Pas dit ID aan voor je levels kanaal

// Jouw exacte categorieën
const TICKET_CATEGORIES = {
    ticket_soli: "1526298535010766889", // werken bij de efteling
    ticket_mc: "1526298606112477504",   // atractie hulp
    ticket_ban: "1526298683409436722",  // ban epeal
    ticket_dc: "1526249047818506250",   // discord vragen
    ticket_web: "1526250027897454682"   // park info
};

// --- DATA OPSLAG ---
let currentCount = 0;
let lastCounterId = null;
const userLevels = {}; 
const activeGames = {}; 

// --- EFTELING VRAGEN DATA ---
const eftelingQuestions = [
    { q: "In welk jaar opende de Efteling haar deuren?", a: "1952" },
    { q: "Hoe heet de bekende vuurspuwende draak bij de Joris en de Draak?", a: "draak lloyd" },
    { q: "Welke attractie heeft de bekende bewoner 'Lange Jan'?", a: "sprookjesbos" },
    { q: "Hoe heet de achtbaan die in het donker rijdt en een vogel als thema heeft?", a: "vogel rok" },
    { q: "Wat roept Holle Bolle Gijs altijd?", a: "papier hier" },
    { q: "Hoe heet de houten achtbaan waarin je strijdt tegen water of vuur?", a: "joris en de draak" },
    { q: "Wat is de naam van de dive coaster die 37,5 meter loodrecht naar beneden valt?", a: "baron 1898" },
    { q: "In welke attractie maak je een boottocht door een oosterse wereld uit 1001 nacht?", a: "fata morgana" }
];

// --- VLAG RADEN DATA (Uitgebreid met veel leukere en moeilijkere landen!) ---
const flagGames = [
    // Makkelijk / Leuk
    { flag: "🇳🇱", name: "nederland" },
    { flag: "🇧🇪", name: "belgie" },
    { flag: "🇩🇪", name: "duitsland" },
    { flag: "🇫🇷", name: "frankrijk" },
    { flag: "🇬🇧", name: "engeland" },
    { flag: "🇺🇸", name: "amerika" },
    { flag: "🇮🇹", name: "italie" },
    { flag: "🇪🇸", name: "spanje" },
    // Gemiddeld
    { flag: "🇯🇵", name: "japan" },
    { flag: "🇨🇦", name: "canada" },
    { flag: "🇧🇷", name: "brazilie" },
    { flag: "🇲🇦", name: "marokko" },
    { flag: "🇹🇷", name: "turkije" },
    { flag: "🇦🇺", name: "australie" },
    { flag: "🇲🇽", name: "mexico" },
    { flag: "🇦🇷", name: "argentinie" },
    { flag: "🇪🇬", name: "egypte" },
    { flag: "🇿🇦", name: "zuid-afrika" },
    { flag: "🇬🇷", name: "griekenland" },
    { flag: "🇮🇳", name: "india" },
    { flag: "🇵🇹", name: "portugal" },
    { flag: "🇨🇭", name: "zwitserland" },
    { flag: "🇸🇪", name: "zweden" },
    { flag: "🇨🇳", name: "china" },
    // Moeilijk / Uitdagend
    { flag: "🇰🇷", name: "zuid-korea" },
    { flag: "🇮🇸", name: "ijsland" },
    { flag: "🇳🇿", name: "nieuw-zeeland" },
    { flag: "🇺🇦", name: "oekraine" },
    { flag: "🇸🇦", name: "saoedi-arabie" },
    { flag: "🇯🇲", name: "jamaica" },
    { flag: "🇰🇪", name: "kenia" },
    { flag: "🇵🇪", name: "peru" },
    // Extreem moeilijk (Voor de experts!)
    { flag: "🇳🇵", name: "nepal" },
    { flag: "🇧🇹", name: "bhutan" },
    { flag: "🇱 اجرا", name: "sri lanka" },
    { flag: "🇰🇬", name: "kirgizie" },
    { flag: "🇲🇬", name: "madagaskar" },
    { flag: "🇵🇬", name: "papoea-nieuw-guinea" },
    { flag: "🇻🇦", name: "vaticaanstad" },
    { flag: "🇸🇪", name: "kazachstan" }
];

function startNewFlagGame(channel) {
    const game = flagGames[Math.floor(Math.random() * flagGames.length)];
    activeGames[channel.id] = { type: 'vlag', answer: game.name };
    channel.send(`🗺️ **Volgende vlag!** Welk land hoort bij deze vlag: ${game.flag}?`).catch(console.error);
}

function startNewEftelingGame(channel) {
    const game = eftelingQuestions[Math.floor(Math.random() * eftelingQuestions.length)];
    activeGames[channel.id] = { type: 'vraag', answer: game.a };
    channel.send(`🏰 **Volgende Efteling vraag!** ${game.q}`).catch(console.error);
}

client.once('ready', () => {
    console.log(`🤖 Ingelogd als ${client.user.tag}! Bot is volledig operationeel.`);
});

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

    // --- LEVEL SYSTEEM ---
    if (!userLevels[userId]) userLevels[userId] = { xp: 0, level: 1 };
    userLevels[userId].xp += Math.floor(Math.random() * 10) + 5; 
    const xpNeeded = userLevels[userId].level * 100;
    if (userLevels[userId].xp >= xpNeeded) {
        userLevels[userId].level += 1;
        userLevels[userId].xp = 0;
        message.reply(`🎉 **Level Up!** Je bent nu level **${userLevels[userId].level}**!`).catch(console.error);
    }

    // --- MINI-GAMES ---
    if (message.content === '!vlag') {
        if (activeGames[message.channel.id]) return message.reply("Er is al een spel bezig!");
        startNewFlagGame(message.channel);
        return;
    }
    if (message.content === '!eftelingvraag') {
        if (activeGames[message.channel.id]) return message.reply("Er is al een spel bezig!");
        startNewEftelingGame(message.channel);
        return;
    }
    if (message.content === '!stop') {
        if (activeGames[message.channel.id]) {
            delete activeGames[message.channel.id];
            return message.reply("🛑 Het spel is stopgezet!");
        }
    }

    const channelGame = activeGames[message.channel.id];
    if (channelGame && message.content.toLowerCase() === channelGame.answer.toLowerCase()) {
        const gameType = channelGame.type;
        delete activeGames[message.channel.id];
        await message.reply(`🏆 Goed geraden <@${userId}>! Het antwoord was **${channelGame.answer}**.`);
        setTimeout(() => {
            if (gameType === 'vlag') startNewFlagGame(message.channel);
            if (gameType === 'vraag') startNewEftelingGame(message.channel);
        }, 2000);
        return;
    }

    // --- TICKET SETUP ---
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

// --- TICKETS VERWERKEN ---
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
                name: `🎫-${prefix}-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORIES[interaction.customId],
                permissionOverwrites: [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
