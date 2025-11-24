const { SlashCommandBuilder } = require('discord.js');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { openDb } = require('../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removecoach')
        .setDescription('Removes a coach.')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('The ID of the coach to remove.')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command.');
            return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true });
        }

        const id = interaction.options.getInteger('id');
        const db = await openDb();

        const session = await db.get('SELECT 1 FROM sessions WHERE claimedCoach = ? OR json_valid(availableCoaches) AND ? IN (SELECT value FROM json_each(availableCoaches)) LIMIT 1', id, id);

        if (session) {
            return interaction.reply({ content: 'This coach is assigned to upcoming sessions and cannot be removed.', ephemeral: true });
        }

        const result = await db.run('DELETE FROM coaches WHERE id = ?', id);
        if (result.changes === 0) {
            return interaction.reply({ content: `No coach found with ID: ${id}`, ephemeral: true });
        }

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Coach Removed')
            .setDescription(`Successfully removed the coach with ID: **${id}**.`);
        await interaction.reply({ embeds: [successEmbed] });
    },
};
