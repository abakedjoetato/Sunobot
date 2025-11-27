const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { openDb } = require('../database/database');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createsession')
        .setDescription('Creates a new coaching session.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('createSessionModal')
            .setTitle('Create New Session');

        const dateInput = new TextInputBuilder()
            .setCustomId('dateInput')
            .setLabel('Date (YYYY-MM-DD)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const timeInput = new TextInputBuilder()
            .setCustomId('timeInput')
            .setLabel('Time (HH:MM, 24hr format, UTC)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(dateInput);
        const secondActionRow = new ActionRowBuilder().addComponents(timeInput);

        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);
    },
};
