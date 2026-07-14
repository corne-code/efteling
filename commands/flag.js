const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const quizFilePath = path.join(__dirname, '../quiz.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quiz')
        .setDescription('Start een nieuwe quizronde met Efteling- en algemene vragen.'),

    async execute(interaction) {
        // De strenge kanaal-check is hier volledig verwijderd!

        if (!fs.existsSync(quizFilePath)) {
            return interaction.reply({ content: 'De quiz database is niet gevonden!', ephemeral: true });
        }

        const questions = JSON.parse(fs.readFileSync(quizFilePath, 'utf-8'));
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

        const letters = ['A', 'B', 'C', 'D'];
        let descriptionText = `**${randomQuestion.question}**\n\n`;
        
        const row = new ActionRowBuilder();

        randomQuestion.answers.forEach((answer, index) => {
            descriptionText += `**${letters[index]}:** ${answer}\n`;
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`quiz_${index}`)
                    .setLabel(letters[index])
                    .setStyle(ButtonStyle.Primary)
            );
        });

        const embed = new EmbedBuilder()
            .setTitle('🏰 Efteling & Algemene Kennis Quiz')
            .setDescription(descriptionText)
            .setColor('#145A32')
            .setFooter({ text: 'Je hebt 15 seconden om te antwoorden!' })
            .setTimestamp();

        const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = response.createMessageComponentCollector({ time: 15000 });
        const answeredUsers = new Set();

        collector.on('collect', async i => {
            if (answeredUsers.has(i.user.id)) {
                return i.reply({ content: 'Je hebt al een antwoord gegeven!', ephemeral: true });
            }

            answeredUsers.add(i.user.id);
            const clickedIndex = parseInt(i.customId.split('_'), 10);

            if (clickedIndex === randomQuestion.correct) {
                await i.reply({ content: `🎉 **Correct!** Je hebt het juiste antwoord gekozen.`, ephemeral: true });
            } else {
                const correctLetter = letters[randomQuestion.correct];
                await i.reply({ content: `❌ **Helaas!** Dat was onjuist. Het goede antwoord was **${correctLetter}**: ${randomQuestion.answers[randomQuestion.correct]}`, ephemeral: true });
            }
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder();
            row.components.forEach(button => {
                disabledRow.addComponents(ButtonBuilder.from(button).setDisabled(true));
            });

            const endEmbed = EmbedBuilder.from(embed)
                .setFooter({ text: 'De tijd is voorbij! Gebruik /quiz voor een nieuwe vraag.' });

            await interaction.editReply({ embeds: [endEmbed], components: [disabledRow] }).catch(() => {});
        });
    },
};
