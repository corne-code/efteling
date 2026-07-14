const { REST, Routes } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`[BOT] Succesvol ingelogd als ${client.user.tag}!`);

        // Status van de bot instellen
        client.user.setActivity('naar de Efteling Spoorwegen', { type: 3 }); // Type 3 = Watching

        // Registreer de Slash Commands bij Discord
        const commands = [];
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

        try {
            console.log(`[COMMANDS] Starten met het registreren van ${commands.length} slash commands...`);

            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: commands }
            );

            console.log('[COMMANDS] Alle slash commands zijn succesvol geregistreerd bij Discord!');
        } catch (error) {
            console.error('[ERROR] Fout bij het registreren van slash commands:', error);
        }
    },
};
