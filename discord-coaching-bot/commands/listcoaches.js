const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { openDb } = require('../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listcoaches')
        .setDescription('Lists all coaches.'),
    async execute(interaction) {
        if (process.env.ADMIN_ROLE_ID && !interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command.');
            return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true });
        }

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
