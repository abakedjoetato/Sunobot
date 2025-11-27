const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { openDb } = require('../database/database');
const moment = require('moment-timezone');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('viewsessions')
        .setDescription('Displays all claimed coaching sessions.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        try {
            const db = await openDb();
            const sessions = await db.all('SELECT s.id, s.datetime, s.claimedBy, c.name as coachName FROM sessions s JOIN coaches c ON s.claimedCoach = c.id WHERE s.isClaimed = 1 ORDER BY s.datetime ASC');

            if (sessions.length === 0) {
                return interaction.reply({ content: 'There are no claimed sessions.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('Claimed Sessions');

            for (const session of sessions) {
                const sessionDateTime = moment(session.datetime);
                embed.addFields({
                    name: `Session ID: ${session.id}`,
                    value: `**Time:** <t:${sessionDateTime.unix()}:F>\\n**User:** <@${session.claimedBy}>\\n**Coach:** ${session.coachName}`
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            logger.error(error, `Error executing ${interaction.commandName}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    },
};
