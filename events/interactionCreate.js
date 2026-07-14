const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config.json');

let ticketCounter = 1;

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // 1. Verwerk Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'Er is een fout opgetreden bij het uitvoeren van dit commando!', ephemeral: true });
            }
        }

        // Zoek de juiste serverconfiguratie op op basis van waar de knop is ingedrukt
        const serverConfig = Object.values(config.servers).find(s => s.guildId === interaction.guild.id);

        // 2. Verwerk Ticket Knoppen (Openen)
        if (interaction.isButton()) {
            const customId = interaction.customId;

            if (customId.startsWith('ticket_')) {
                await interaction.deferReply({ ephemeral: true });

                let categoryId = "";
                let ticketLabel = "";

                if (customId === 'ticket_werken') { categoryId = config.categories.werkenBij; ticketLabel = "werken-bij"; }
                if (customId === 'ticket_attractie') { categoryId = config.categories.attractieHulp; ticketLabel = "attractie-hulp"; }
                if (customId === 'ticket_ban') { categoryId = config.categories.banAppeal; ticketLabel = "ban-appeal"; }
                if (customId === 'ticket_discord') { categoryId = config.categories.discordVragen; ticketLabel = "discord-vragen"; }
                if (customId === 'ticket_park') { categoryId = config.categories.parkInfo; ticketLabel = "park-info"; }

                // Controleer op dubbele tickets
                const existingChannel = interaction.guild.channels.cache.find(c => c.name.includes(interaction.user.username.toLowerCase()) && c.parentId === categoryId);
                if (existingChannel) {
                    return interaction.editReply({ content: `Je hebt al een openstaand ticket in deze categorie: <#${existingChannel.id}>` });
                }

                const paddedNumber = String(ticketCounter).padStart(4, '0');
                ticketCounter++;

                // Rechten instellen (Owner, Admin, Co-Owner, IST)
                const permissionOverwrites = [
                    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: config.roles.owner, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: config.roles.admin, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: config.roles.coOwner, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: config.roles.ist, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
                ];

                // Park Toezicht krijgt ALLEEN toegang bij Attractie Hulp
                if (customId === 'ticket_attractie') {
                    permissionOverwrites.push({
                        id: config.roles.parkToezicht,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
                    });
                }

                const ticketChannel = await interaction.guild.channels.create({
                    name: `${paddedNumber}-${ticketLabel}`,
                    type: ChannelType.GuildText,
                    parent: categoryId,
                    permissionOverwrites: permissionOverwrites
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`🏰 Ticket ${paddedNumber}`)
                    .setDescription(`Welkom <@${interaction.user.id}>,\n\nHet support team zal je hier zo snel mogelijk helpen met je vraag over **${ticketLabel.replace('-', ' ')}**.\n\nKlik op de rode knop hieronder om dit ticket te sluiten.`)
                    .setColor('#145A32')
                    .setTimestamp();

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_sluiten')
                        .setLabel('Ticket Sluiten')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ content: `<@${interaction.user.id}> • Support Team`, embeds: [welcomeEmbed], components: [closeRow] });

                // Multi-server logkanaal fix
                if (serverConfig && serverConfig.logs) {
                    const logChannel = interaction.guild.channels.cache.get(serverConfig.logs);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🎟️ Ticket Geopend')
                            .setDescription(`**Ticket:** <#${ticketChannel.id}>\n**Geopend door:** <@${interaction.user.id}>\n**Categorie:** ${ticketLabel}`)
                            .setColor('#2ECC71')
                            .setTimestamp();
                        await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                    }
                }

                await interaction.editReply({ content: `Je ticket is succesvol aangemaakt: <#${ticketChannel.id}>` });
            }

            // 3. Verwerk Ticket Sluiten
            if (customId === 'ticket_sluiten') {
                await interaction.deferReply();

                const messages = await interaction.channel.messages.fetch({ limit: 100 });
                let transcriptText = `Transcript voor kanaal: ${interaction.channel.name}\n\n`;
                
                messages.reverse().forEach(msg => {
                    transcriptText += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
                });

                const buffer = Buffer.from(transcriptText, 'utf-8');

                // Multi-server logkanaal fix voor sluiten
                if (serverConfig && serverConfig.logs) {
                    const logChannel = interaction.guild.channels.cache.get(serverConfig.logs);
                    if (logChannel) {
                        const logEmbed = new EmbedBuilder()
                            .setTitle('🔒 Ticket Gesloten')
                            .setDescription(`**Ticket:** ${interaction.channel.name}\n**Gesloten door:** <@${interaction.user.id}>`)
                            .setColor('#E74C3C')
                            .setTimestamp();

                        await logChannel.send({ 
                            embeds: [logEmbed], 
                            files: [{ attachment: buffer, name: `transcript-${interaction.channel.name}.txt` }] 
                        }).catch(() => {});
                    }
                }

                await interaction.editReply({ content: 'Dit ticket wordt over 5 seconden gesloten en verwijderd...' });
                
                setTimeout(async () => {
                    await interaction.channel.delete().catch(() => {});
                }, 5000);
            }
        }
    },
};
