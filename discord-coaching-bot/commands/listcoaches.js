const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { openDb } = require('../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listcoaches')
        .setDescription('Lists all coaches.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    async execute(interaction) {
        const db = await openDb();
        const rows = await db.all('SELECT * FROM coaches');

        if (rows.length === 0) {
            return interaction.reply({ content: 'There are no coaches yet.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('Coaches')
            .setDescription('Here is a list of all coaches:');

        rows.forEach(row => {
            embed.addFields({ name: `ID: ${row.id} - ${row.name}`, value: row.description || 'No description provided.' });
        });

        await interaction.reply({ embeds: [embed] });
    },
};
