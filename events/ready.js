const { REST, Routes } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`[BOT] Succesvol ingelogd als ${client.user.tag}!`);

        // Status van de bot instellen
        client.user.setActivity('naar de Efteling Spoorwegen', { type: 3 });

        // Verzamel de Slash Commands
        const commands = [];
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

        try {
            console.log(`[COMMANDS] Starten met het registreren van ${commands.length} slash commands per server...`);

            // Loop door alle servers die in je config.json staan
            for (const serverKey in config.servers) {
                const server = config.servers[serverKey];
                
                // Controleer of er een geldig Guild ID is ingevuld (en niet de placeholder tekst)
                if (server.guildId && server.guildId !== "HIER_ID_VAN_SERVER_1" && server.guildId !== "VUL_HIER_DE_ID_VAN_SERVER_2_IN") {
                    await rest.put(
                        Routes.applicationGuildCommands(client.user.id, server.guildId),
                        { body: commands }
                    );
                    console.log(`[COMMANDS] Slash commands succesvol geregistreerd voor server: ${server.guildId}`);
                }
            }

            console.log('[COMMANDS] Registratieproces afgerond!');
        } catch (error) {
            console.error('[ERROR] Fout bij het registreren van slash commands:', error);
        }
    },
};
