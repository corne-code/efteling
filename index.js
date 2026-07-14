const { Client, GatewayIntentBits, Collection } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');
require('dotenv').config();

// 1. Initialiseer de Discord Client met de juiste Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Collecties voor commands
client.commands = new Collection();

// 2. Render Webserver (Zorgt dat de bot online blijft)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Efteling Bot is succesvol online!');
});

app.listen(PORT, () => {
    console.log(`[SERVER] Webserver draait op poort ${PORT}`);
});

// 3. Event Handler
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
    console.log(`[HANDLERS] ${eventFiles.length} events succesvol geladen.`);
}

// 4. Command Handler
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        }
    }
    console.log(`[HANDLERS] ${client.commands.size} slash commands geladen.`);
}

// 5. Log in met de Discord Token
client.login(process.env.TOKEN);
