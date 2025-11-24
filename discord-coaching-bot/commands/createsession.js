const { SlashCommandBuilder } = require('discord.js');
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { openDb } = require('../database/database');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('createsession')
        .setDescription('Creates a new coaching session.')
        .addStringOption(option =>
            option.setName('date')
                .setDescription('The date of the session (YYYY-MM-DD).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('time')
                .setDescription('The time of the session (HH:MM, 24hr format).')
                .setRequired(true)),
    async execute(interaction) {
        if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
            const noPermsEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Permission Denied')
                .setDescription('You do not have permission to use this command.');
            return interaction.reply({ embeds: [noPermsEmbed], ephemeral: true });
        }

        const date = interaction.options.getString('date');
        const time = interaction.options.getString('time');
        const dateTimeString = `${date} ${time}`;
        const sessionDateTime = moment.tz(dateTimeString, 'YYYY-MM-DD HH:mm', 'UTC');

        if (!sessionDateTime.isValid()) {
            return interaction.reply({ content: 'Invalid date or time format. Please use YYYY-MM-DD and HH:MM.', ephemeral: true });
        }

        if (sessionDateTime.isBefore(moment())) {
            return interaction.reply({ content: 'You cannot create a session in the past.', ephemeral: true });
        }

        if (sessionDateTime.isAfter(moment().add(90, 'days'))) {
            return interaction.reply({ content: 'You can only create sessions up to 90 days in advance.', ephemeral: true });
        }

        const db = await openDb();
        const coaches = await db.all('SELECT id, name FROM coaches');

        if (coaches.length === 0) {
            return interaction.reply({ content: 'There are no coaches available. Please add a coach first.', ephemeral: true });
        }

        const options = coaches.map(coach => ({
            label: coach.name,
            value: coach.id.toString(),
        }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`create_session_${sessionDateTime.unix()}`)
                    .setPlaceholder('Select coaches')
                    .setMinValues(1)
                    .setMaxValues(options.length)
                    .addOptions(options),
            );

        await interaction.reply({ content: 'Please select the coaches for this session:', components: [row], ephemeral: true });
    },
};
