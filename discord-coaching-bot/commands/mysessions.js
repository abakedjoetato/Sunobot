const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { openDb } = require('../database/database');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mysessions')
        .setDescription('Displays your upcoming coaching sessions.'),
    async execute(interaction) {
        const db = await openDb();
        const sessions = await db.all('SELECT s.id, s.datetime, c.name as coachName FROM sessions s JOIN coaches c ON s.claimedCoach = c.id WHERE s.claimedBy = ? AND s.isClaimed = 1 ORDER BY s.datetime ASC', interaction.user.id);

        if (sessions.length === 0) {
            return interaction.reply({ content: 'You have no upcoming sessions.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('Your Upcoming Sessions');

        sessions.forEach(session => {
            const sessionDateTime = moment(session.datetime);
            embed.addFields({
                name: `Session ID: ${session.id}`,
                value: `**Time:** <t:${sessionDateTime.unix()}:F>\\n**Coach:** ${session.coachName}`
            });
        });

        const sessionOptions = sessions
            .filter(session => moment(session.datetime).isAfter(moment().add(48, 'hours')))
            .map(session => {
                const sessionDateTime = moment(session.datetime);
                return {
                    label: `Session ID: ${session.id} on ${sessionDateTime.format('YYYY-MM-DD')}`,
                    value: session.id.toString(),
                };
            });

        const components = [];
        if (sessionOptions.length > 0) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('cancel_session_select')
                .setPlaceholder('Select a session to cancel')
                .addOptions(sessionOptions);
            const actionRow = new ActionRowBuilder().addComponents(selectMenu);
            components.push(actionRow);
        }

        await interaction.reply({ embeds: [embed], components, ephemeral: true });
    },
};
