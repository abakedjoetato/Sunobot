const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { openDb } = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removecoach')
        .setDescription('Removes a coach.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        const db = await openDb();
        const coaches = await db.all('SELECT id, name FROM coaches');

        if (coaches.length === 0) {
            return interaction.reply({ content: 'There are no coaches to remove.', ephemeral: true });
        }

        const options = coaches.map(coach => ({
            label: coach.name,
            value: coach.id.toString(),
        }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('removeCoachSelect')
                    .setPlaceholder('Select a coach to remove')
                    .addOptions(options),
            );

        await interaction.reply({ content: 'Please select a coach to remove:', components: [row], ephemeral: true });
    },
};
