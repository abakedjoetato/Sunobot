const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { openDb } = require('../database/database');
const moment = require('moment-timezone');
const logger = require('../utils/logger');

const SESSIONS_PER_PAGE = 5;

async function buildSessionsPage(page) {
    const db = await openDb();
    const offset = (page - 1) * SESSIONS_PER_PAGE;

    const coaches = await db.all('SELECT * FROM coaches');
    const coachMap = new Map(coaches.map(c => [c.id, c.name]));

    const sessions = await db.all('SELECT * FROM sessions WHERE isClaimed = 0 ORDER BY datetime ASC LIMIT ? OFFSET ?', SESSIONS_PER_PAGE, offset);

    if (sessions.length === 0) {
        return { content: 'There are no available sessions.', embeds: [], components: [], ephemeral: true };
    }

    const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('Available Coaching Sessions')
        .setFooter({ text: `Page ${page}` });

    const sessionOptions = sessions.map(session => {
        const sessionDateTime = moment(session.datetime);
        const availableCoachesIds = JSON.parse(session.availableCoaches);
        const coachNames = availableCoachesIds.map(id => coachMap.get(id)).join(', ');
        embed.addFields({
            name: `Session ID: ${session.id}`,
            value: `**Time:** <t:${sessionDateTime.unix()}:F>\\n**Coaches:** ${coachNames}`
        });
        return {
            label: `Session ID: ${session.id} on ${sessionDateTime.format('YYYY-MM-DD')}`,
            value: session.id.toString(),
        };
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('claim_session_select')
        .setPlaceholder('Select a session to claim')
        .addOptions(sessionOptions);

    const actionRow = new ActionRowBuilder().addComponents(selectMenu);

    const row = await db.get('SELECT COUNT(id) as count FROM sessions WHERE isClaimed = 0');
    const totalPages = Math.ceil(row.count / SESSIONS_PER_PAGE);
    const navigationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sessions_prev_${page}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 1),
        new ButtonBuilder()
            .setCustomId(`sessions_next_${page}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages),
    );

    return { embeds: [embed], components: [actionRow, navigationRow], ephemeral: true };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sessions')
        .setDescription('Displays available coaching sessions.'),
    async execute(interaction) {
        try {
            const pageContent = await buildSessionsPage(1);
            await interaction.reply(pageContent);
        } catch (error) {
            logger.error(error, 'Failed to fetch sessions');
            if (!interaction.replied) {
                await interaction.reply({ content: 'There was an error while fetching sessions.', ephemeral: true });
            }
        }
    },
    buildSessionsPage,
};
