const { SlashCommandBuilder } = require('discord.js');
const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const { openDb } = require('../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addcoach')
        .setDescription('Adds a new coach.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add as a coach.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('An optional bio for the coach.')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command.');
            return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true });
        }

        const user = interaction.options.getUser('user');
        const description = interaction.options.getString('description');
        const db = await openDb();
        await db.run('INSERT INTO coaches (name, description, discord_id) VALUES (?, ?, ?)', user.username, description, user.id);

        const successEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('Coach Added')
            .setDescription(`Successfully added **${user.username}** as a coach.`);
        await interaction.reply({ embeds: [successEmbed] });
    },
};
