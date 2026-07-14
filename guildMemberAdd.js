const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const guildId = member.guild.id;

        // Zoek de juiste serverconfiguratie op
        const serverConfig = Object.values(config.servers).find(s => s.guildId === guildId);
        if (!serverConfig || !serverConfig.welkom) return;

        const welcomeChannel = member.guild.channels.cache.get(serverConfig.welkom);
        if (!welcomeChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🏰 Welkom bij de Efteling!')
            .setDescription(`👋 Welkom <@${member.id}> in onze gezellige Discord server!\n\nWe wensen je een magische tijd toe. Vergeet niet de regels te lezen en veel plezier met praten en spelen! ✨`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setColor('#145A32')
            .setFooter({ text: `Lid #${member.guild.memberCount}`, iconURL: member.guild.iconURL() })
            .setTimestamp();

        await welcomeChannel.send({ content: `Welkom ${member}!`, embeds: [embed] }).catch(() => {});
    },
};
