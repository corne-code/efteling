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

// --- CONFIGURATIE (Kanalen) ---
const COUNT_CHANNEL_ID = '1526331899533066433';   // Tellen kanaal
const VRAGEN_CHANNEL_ID = '1526331976313737276';  // Efteling vragen kanaal (loopt automatisch)
const VLAGGEN_CHANNEL_ID = '1526332179473367121'; // Vlaggen raden kanaal (loopt automatisch)
const WELCOME_CHANNEL_ID = '1517153163302404200'; // Welkom kanaal

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

// --- UITGEBREIDE & MOEILIJKERE EFTELING VRAGEN DATA ---
const eftelingQuestions = [
    { q: "In welk jaar opende de Efteling haar deuren?", a: "1952" },
    { q: "Hoe heet de bekende vuurspuwende draak bij de Joris en de Draak?", a: "draak lloyd" },
    { q: "Welke attractie heeft de bekende bewoner 'Lange Jan'?", a: "sprookjesbos" },
    { q: "Hoe heet de achtbaan die in het donker rijdt en een vogel als thema heeft?", a: "vogel rok" },
    { q: "Wat roept Holle Bolle Gijs altijd?", a: "papier hier" },
    { q: "Wat is de naam van de koning in Symbolica?", a: "koning pardulfus" },
    { q: "In welk jaar opende de dive coaster Baron 1898?", a: "2015" },
    { q: "Hoe heet de goudzoeker (de baron) van Baron 1898 voluit?", a: "gustave hooghmoed" },
    { q: "Wie componeerde de bekende muziek van de Villa Volta en de Indische Waterlelies?", a: "ruud bos" },
    { q: "Wat is de naam van de fictieve havenstad waar het verhaal van Joris en de Draak zich afspeelt?", a: "ravelijn" },
    { q: "Hoe heet de reus uit het sprookje van Klein Duimpje in het Sprookjesbos?", a: "reus" },
    { q: "Welke attractie verving de iconische Bob-achtbaan?", a: "max & moritz" },
    { q: "Hoe heet de geest die boven de hoofdshow van Danse Macabre zweeft?", a: "joseph charlatan" },
    { q: "Wat was de allereerste achtbaan van de Efteling, geopend in 1981?", a: "python" },
    { q: "Hoe heet het moerasmonster dat hoort bij de Piraña?", a: "extor" },
    { q: "Welke bekende ontwerper tekende de basis voor de Efteling samen met Peter Reijnders?", a: "anton pieck" },
    { q: "Wat is de naam van het paleis waarin Symbolica zich bevindt?", a: "paleis der fantasie" }
];

// --- UITGEBREIDE & MOEILIJKERE VLAG RADEN DATA ---
const flagGames = [
    { flag: "🇳🇱", name: "nederland" },
    { flag: "🇧🇪", name: "belgie" },
    { flag: "🇩🇪", name: "duitsland" },
    { flag: "🇫🇷", name: "frankrijk" },
    { flag: "🇬🇧", name: "engeland" },
    { flag: "🇨🇦", name: "canada" },
    { flag: "🇦🇺", name: "australie" },
    { flag: "🇧🇷", name: "brazilie" },
    { flag: "🇯🇵", name: "japan" },
    { flag: "🇰🇷", name: "zuid-korea" },
    { flag: "🇿🇦", name: "zuid-afrika" },
    { flag: "🇮🇸", name: "ijsland" },
    { flag: "🇳🇿", name: "nieuw-zeeland" },
    { flag: "🇦🇷", name: "argentinie" },
    { flag: "🇲🇽", name: "mexico" },
    { flag: "🇨🇭", name: "zwitserland" },
    { flag: "🇳🇴", name: "noorwegen" },
    { flag: "🇸🇪", name: "zweden" },
    { flag: "🇫🇮", name: "finland" },
    { flag: "🇮🇪", name: "ierland" }
];

// --- HULPFUNCTIES VOOR AUTOMATISCHE MINI-GAMES ---
function startNewFlagGame(channel) {
    if (!channel) return;
    const game = flagGames[Math.floor(Math.random() * flagGames.length)];
    activeGames[channel.id] = { type: 'vlag', answer: game.name };
    channel.send(`🗺️ **Volgende vlag!** Welk land hoort bij deze vlag: ${game.flag}?`);
}

function startNewEftelingGame(channel) {
    if (!channel) return;
    const game = eftelingQuestions[Math.floor(Math.random() * eftelingQuestions.length)];
    activeGames[channel.id] = { type: 'vraag', answer: game.a };
    channel.send(`🏰 **Volgende Efteling vraag!** ${game.q}`);
}

// --- EVENT: BOT READY ---
client.once('ready', async () => {
    console.log(`🤖 Ingelogd als ${client.user.tag}! Efteling Bot is klaar voor gebruik.`);

    // Start automatisch de games op in de juiste kanalen bij het opstarten
    try {
        const vragenChannel = await client.channels.fetch(VRAGEN_CHANNEL_ID).catch(() => null);
        if (vragenChannel) {
            vragenChannel.send("🏰 **De Efteling Quiz is gestart! Raad het juiste antwoord.**");
            startNewEftelingGame(vragenChannel);
        }

        const vlaggenChannel = await client.channels.fetch(VLAGGEN_CHANNEL_ID).catch(() => null);
        if (vlaggenChannel) {
            vlaggenChannel.send("🗺️ **Vlag Raden is gestart! Raad het juiste land.**");
            startNewFlagGame(vlaggenChannel);
        }
    } catch (error) {
        console.error("Fout bij het automatisch starten van de games: ", error);
    }
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

    // --- LEVEL SYSTEEM (WERKT DOOR DE HELE SERVER) ---
    if (!userLevels[userId]) userLevels[userId] = { xp: 0, level: 1 };
    
    userLevels[userId].xp += Math.floor(Math.random() * 10) + 5; 
    const xpNeeded = userLevels[userId].level * 100;

    if (userLevels[userId].xp >= xpNeeded) {
        userLevels[userId].level += 1;
        userLevels[userId].xp = 0;
        
        // Stuurt direct een reply in de chat waar de gebruiker praat (werkt overal)
        message.reply(`🎉 **Level Up!** Je bent nu level **${userLevels[userId].level}**! Holle Bolle Gijs is trots op je! 🌟`);
    }

    // --- LEVEL COMMANDO ---
    if (message.content === '!level') {
        const levelData = userLevels[userId];
        return message.reply(`🌟 **Je Efteling Status:**\n• Level: ${levelData.level}\n• XP: ${levelData.xp}/${levelData.level * 100}`);
    }

    // --- CONTROLEREN VAN ANTWOORDEN (AUTOMATISCH DOORLOOP-SYSTEEM) ---
    const channelGame = activeGames[message.channel.id];
    if (channelGame) {
        if (message.content.toLowerCase() === channelGame.answer.toLowerCase()) {
            const gameType = channelGame.type;
            
            await message.reply(`🏆 Goed geraden <@${userId}>! Het antwoord was inderdaad **${channelGame.answer}**.`);
            
            // Wacht 2 seconden en start direct de volgende ronde in dit kanaal
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
            new ButtonBuilder().setCustomId('ticket_dc').setLabel('Discord Hulp').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
            new ButtonBuilder().setCustomId('ticket_web').setLabel('Website Hulp').setStyle(ButtonStyle.Secondary).setEmoji('🌐')
        );

        return message.channel.send({ embeds: [embed], components: [row1, row2] });
    }
});

// --- INTERACTION EVENT (TICKETS CREËREN) ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const categoryId = TICKET_CATEGORIES[interaction.customId];
    if (!categoryId) return;

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const user = interaction.user;

    const channelName = `${interaction.customId.replace('ticket_', '')}-${user.username}`;

    try {const embed = new EmbedBuilder()
.setTitle(🏰 ${ticketType} - ${interaction.user.username})
.setDescription(Bedankt voor je bericht aan de **Efteling**. Leg je vraag zo duidelijk mogelijk uit.\n\nKlik op de rode knop om dit ticket te sluiten.)
.setColor(0x2E1F14);
const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId('close_ticket').setLabel('Sluit Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒')
);
await ticketChannel.send({ content: <@${interaction.user.id}>, embeds: [embed], components: [row] });
await interaction.editReply({ content: ✅ Je ticket is aangemaakt! Ga naar ${ticketChannel} });
} catch (error) {
console.error(error);
await interaction.editReply({ content: ❌ Er is iets misgegaan bij het aanmaken van je ticket. Controleer de categorie-ID's. });
}
}
if (interaction.customId === 'close_ticket') {
await interaction.reply({ content: "🔒 Dit ticket wordt over 5 seconden gesloten..." });
setTimeout(async () => {
try {
await interaction.channel.delete();
} catch (error) {
console.error("Kon kanaal niet verwijderen:", error);
}
}, 5000);
}
});
client.login(TOKEN);
