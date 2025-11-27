const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createsession')
        .setDescription('Creates a new coaching session.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        try {
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
