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

// --- EVENT: MESSAGE CREATE ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // --- LEVEL SYSTEEM (XP PER BERICHT) ---
    const userId = message.author.id;
    if (!userLevels[userId]) userLevels[userId] = { xp: 0, level: 1 };
    
    userLevels[userId].xp += Math.floor(Math.random() * 10) + 5; // 5 tot 15 XP per bericht
    const xpNeeded = userLevels[userId].level * 100;

    if (userLevels[userId].xp >= xpNeeded) {
        userLevels[userId].level += 1;
        userLevels[userId].xp = 0;
        message.reply(`🎉 **Level Up!** Je bent nu level **${userLevels[userId].level}**!`);
    }

    // --- LEVEL COMMANDO ---
    if (message.content === '!level') {
        const levelData = userLevels[userId];
        return message.reply(`🌟 **Je Efteling Status:**\n• Level: ${levelData.level}\n• XP: ${levelData.xp}/${levelData.level * 100}`);
    }

    // --- TELSYS ---
    if (message.channel.id === COUNT_CHANNEL_ID) {
        const number = parseInt(message.content);
        if (isNaN(number)) return message.delete().catch(console.error);

        if (number !== currentCount + 1) {
            currentCount = 0;
            lastCounterId = null;
            return message.reply(`❌ Fout! Het juiste getal was ${currentCount + 1}. We beginnen weer bij 1!`);
        }

        if (message.author.id === lastCounterId) {
            currentCount = 0;
            lastCounterId = null;
            return message.reply("❌ Je mag niet twee keer achter elkaar tellen!");
        }

        currentCount = number;
        lastCounterId = message.author.id;
        return message.react('✅');
    }

    // --- MINI-GAMES: VLAG RADEN & EFTELING VRAAG ---
    if (message.content === '!vlag') {
        if (activeGames[message.channel.id]) return message.reply("Er is al een spel bezig in dit kanaal!");
        
        const game = flagGames[Math.floor(Math.random() * flagGames.length)];
        activeGames[message.channel.id] = { type: 'vlag', answer: game.name };
        return message.reply(`🗺️ **Vlag Raden!** Welk land hoort bij deze vlag: ${game.flag}? (Typ je antwoord in de chat)`);
    }

    if (message.content === '!eftelingvraag') {
        if (activeGames[message.channel.id]) return message.reply("Er is al een spel bezig in dit kanaal!");
        
        const game = eftelingQuestions[Math.floor(Math.random() * eftelingQuestions.length)];
        activeGames[message.channel.id] = { type: 'vraag', answer: game.a };
        return message.reply(`🏰 **Efteling Quiz!** ${game.q}`);
    }

    // Antwoorden controleren voor actieve games
    const channelGame = activeGames[message.channel.id];
    if (channelGame) {
        if (message.content.toLowerCase() === channelGame.answer.toLowerCase()) {
            delete activeGames[message.channel.id];
            return message.reply(`🏆 Goed geraden <@${message.author.id}>! Het antwoord was inderdaad **${channelGame.answer}**.`);
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
        message.delete();
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

        const ticketChannel = await interaction.guild.channels.create({
            name: `${prefix}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORIES[interaction.customId],
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${ticketType} - ${interaction.user.username}`)
            .setDescription(`Bedankt voor je bericht aan de **Efteling**. Leg je vraag zo duidelijk mogelijk uit.\n\nKlik op de rode knop om dit ticket te sluiten.`)
            .setColor(0x2E1F14);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Sluit Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed], components: [row] });
        await interaction.editReply({ content: `Je ticket is aangemaakt: ${ticketChannel}`, ephemeral: true });
    }

    if (interaction.customId === 'close_ticket') {
        await interaction.reply("Dit ticket wordt over 5 seconden gesloten...");
        setTimeout(() => {
            interaction.channel.delete().catch(console.error);
        }, 5000);
    }
});

// --- WELKOMSTCODE ---
client.on('guildMemberAdd', async (member) => {
    const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor("#2E1F14")
        .setTitle("🕯️ Een nieuw avontuur begint in de Efteling...")
        .setDescription(
            `Welkom ${member}.\n\n` +
            `De poorten van de Efteling zijn voor je geopend.\n\n` +
            `👥 Jij bent onze **${member.guild.memberCount}e** bezoeker.\n\n` +
            `✨ Voel je thuis en geniet van je magische avontuur.`
        )
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
        .setFooter({ text: `Efteling • Welkom` })
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

client.once('ready', () => {
    console.log(`Bot is online als ${client.user.tag}!`);
});

client.login(TOKEN);

