const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcoach')
        .setDescription('Adds a new coach.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('addCoachModal')
                .setTitle('Add New Coach');

            const userIdInput = new TextInputBuilder()
                .setCustomId('userIdInput')
                .setLabel("Coach's User ID")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const descriptionInput = new TextInputBuilder()
                .setCustomId('descriptionInput')
                .setLabel("Coach's Bio")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false);

            const firstActionRow = new ActionRowBuilder().addComponents(userIdInput);
            const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);

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
