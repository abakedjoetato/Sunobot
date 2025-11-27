const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { openDb } = require('../database/database');
const moment = require('moment-timezone');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const db = await openDb();

        if (interaction.isCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                logger.error(error, `Error executing command: ${interaction.commandName}`);
                await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
            }
        } else if (interaction.isStringSelectMenu()) {
            try {
                if (interaction.customId.startsWith('create_session_')) {
                    const timestamp = interaction.customId.split('_')[2];
                    const sessionDateTime = moment.unix(timestamp).utc();
                    const selectedCoaches = JSON.stringify(interaction.values);

                    const coaches = await db.all(`SELECT name FROM coaches WHERE id IN (${interaction.values.map(() => '?').join(',')})`, interaction.values);
                    const coachNames = coaches.map(c => c.name).join(', ');

                    const guildScheduledEvent = await interaction.guild.scheduledEvents.create({
                        name: 'Coaching Session',
                        scheduledStartTime: sessionDateTime.toDate(),
                        privacyLevel: 2, // GUILD_ONLY
                        entityType: 3, // EXTERNAL
                        description: `Coaching session with ${coachNames}`,
                        entityMetadata: {
                            location: 'Discord'
                        }
                    });

                    await db.run('INSERT INTO sessions (datetime, availableCoaches, guildScheduledEventId) VALUES (?, ?, ?)', sessionDateTime.format('YYYY-MM-DD HH:mm:ss'), selectedCoaches, guildScheduledEvent.id);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Session Created')
                        .setDescription(`Successfully created a session for **${sessionDateTime.format('YYYY-MM-DD HH:mm')} UTC**.`);
                    await interaction.update({ content: '', embeds: [successEmbed], components: [] });
                } else if (interaction.customId === 'claim_session_select') {
                    const sessionId = interaction.values[0];
                    const session = await db.get('SELECT * FROM sessions WHERE id = ?', sessionId);
                    if (!session || session.isClaimed) {
                        return await interaction.update({ content: 'This session is no longer available.', components: [], ephemeral: true });
                    }

                    if (session.guildScheduledEventId) {
                        try {
                            await interaction.guild.scheduledEvents.delete(session.guildScheduledEventId);
                        } catch (error) {
                            logger.error(error, `Failed to delete guild scheduled event: ${session.guildScheduledEventId}`);
                        }
                    }

                    const availableCoachesIds = JSON.parse(session.availableCoaches);
                    if (availableCoachesIds.length === 1) {
                        const coachId = availableCoachesIds[0];
                        await db.run('UPDATE sessions SET isClaimed = 1, claimedBy = ?, claimedCoach = ? WHERE id = ?', interaction.user.id, coachId, sessionId);
                        const updatedSession = await db.get('SELECT datetime FROM sessions WHERE id = ?', sessionId);
                        const sessionDateTime = moment(updatedSession.datetime);
                        await interaction.update({ content: 'Session claimed successfully! You will receive a confirmation DM.', components: [], ephemeral: true, embeds: [] });
                        await interaction.user.send(`You have successfully claimed a coaching session for <t:${sessionDateTime.unix()}:F>.`);
                        const coach = await db.get('SELECT discord_id FROM coaches WHERE id = ?', coachId);
                        const coachUser = await interaction.client.users.fetch(coach.discord_id);
                        await coachUser.send(`A session at <t:${sessionDateTime.unix()}:F> has been claimed by ${interaction.user.tag}.`);
                    } else {
                        const coaches = await db.all(`SELECT id, name FROM coaches WHERE id IN (${availableCoachesIds.map(() => '?').join(',')})`, availableCoachesIds);
                        const coachOptions = coaches.map(coach => ({ label: coach.name, value: coach.id.toString() }));
                        const selectMenu = new StringSelectMenuBuilder()
                            .setCustomId(`claim_session_coach_${sessionId}`)
                            .setPlaceholder('Select a coach')
                            .addOptions(coachOptions);
                        const actionRow = new ActionRowBuilder().addComponents(selectMenu);
                        await interaction.update({ content: 'Please select a coach:', components: [actionRow], ephemeral: true, embeds: [] });
                    }
                } else if (interaction.customId.startsWith('claim_session_coach_')) {
                    const sessionId = interaction.customId.split('_')[3];
                    const coachId = interaction.values[0];
                    await db.run('UPDATE sessions SET isClaimed = 1, claimedBy = ?, claimedCoach = ? WHERE id = ?', interaction.user.id, coachId, sessionId);
                    const session = await db.get('SELECT datetime FROM sessions WHERE id = ?', sessionId);
                    const sessionDateTime = moment(session.datetime);
                    await interaction.update({ content: 'Session claimed successfully! You will receive a confirmation DM.', components: [], ephemeral: true, embeds: [] });
                    try {
                        await interaction.user.send(`You have successfully claimed a coaching session for <t:${sessionDateTime.unix()}:F>.`);
                    } catch (error) {
                        logger.warn(`Could not send DM to user ${interaction.user.id}`, error);
                    }
                    const coach = await db.get('SELECT discord_id FROM coaches WHERE id = ?', coachId);
                    try {
                        const coachUser = await interaction.client.users.fetch(coach.discord_id);
                        await coachUser.send(`A session at <t:${sessionDateTime.unix()}:F> has been claimed by ${interaction.user.tag}.`);
                    } catch (error) {
                        logger.warn(`Could not send DM to coach ${coach.discord_id}`, error);
                    }
                } else if (interaction.customId === 'cancel_session_select') {
                    const sessionId = interaction.values[0];
                    const session = await db.get('SELECT * FROM sessions WHERE id = ? AND claimedBy = ?', sessionId, interaction.user.id);
                    if (!session) {
                        return await interaction.update({ content: 'You do not have a session with that ID.', components: [], ephemeral: true });
                    }
                    const sessionDateTime = moment(session.datetime);
                    if (sessionDateTime.isBefore(moment().add(48, 'hours'))) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor('#FF0000')
                            .setTitle('Cancellation Denied')
                            .setDescription('You cannot cancel a session that is less than 48 hours away.');
                        return await interaction.update({ embeds: [errorEmbed], components: [] });
                    }

                    if (session.guildScheduledEventId) {
                        try {
                            await interaction.guild.scheduledEvents.delete(session.guildScheduledEventId);
                        } catch (error) {
                            logger.error(error, `Failed to delete guild scheduled event: ${session.guildScheduledEventId}`);
                        }
                    }

                    const coachId = session.claimedCoach;
                    await db.run('UPDATE sessions SET isClaimed = 0, claimedBy = NULL, claimedCoach = NULL WHERE id = ?', sessionId);
                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Session Cancelled')
                        .setDescription('Your session has been successfully cancelled.');
                    await interaction.update({ embeds: [successEmbed], components: [] });
                    try {
                        await interaction.user.send(`Your coaching session for <t:${sessionDateTime.unix()}:F> has been cancelled.`);
                    } catch (error) {
                        logger.warn(`Could not send DM to user ${interaction.user.id}`, error);
                    }
                    const coach = await db.get('SELECT discord_id FROM coaches WHERE id = ?', coachId);
                    if (coach) {
                        try {
                            const coachUser = await interaction.client.users.fetch(coach.discord_id);
                            await coachUser.send(`The session at <t:${sessionDateTime.unix()}:F> with ${interaction.user.tag} has been cancelled.`);
                        } catch (error) {
                            logger.warn(`Could not send DM to coach ${coach.discord_id}`, error);
                        }
                    }
                } else if (interaction.customId === 'removeCoachSelect') {
                    const coachId = interaction.values[0];

                    const session = await db.get('SELECT 1 FROM sessions WHERE claimedCoach = ? OR json_valid(availableCoaches) AND ? IN (SELECT value FROM json_each(availableCoaches)) LIMIT 1', coachId, coachId);

                    if (session) {
                        return interaction.update({ content: 'This coach is assigned to upcoming sessions and cannot be removed.', components: [], ephemeral: true });
                    }

                    const result = await db.run('DELETE FROM coaches WHERE id = ?', coachId);
                    if (result.changes === 0) {
                        return interaction.update({ content: `No coach found with ID: ${coachId}`, components: [], ephemeral: true });
                    }

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Coach Removed')
                        .setDescription(`Successfully removed the coach.`);
                    await interaction.update({ content: '', embeds: [successEmbed], components: [] });
                }
            } catch (error) {
                logger.error(error, `Error processing select menu: ${interaction.customId}`);
                await interaction.update({ content: 'There was an error processing your request.', components: [], ephemeral: true });
            }
        } else if (interaction.isButton()) {
            if (interaction.customId.startsWith('sessions_')) {
                const direction = interaction.customId.split('_')[1];
                let page = parseInt(interaction.customId.split('_')[2], 10);
                page += (direction === 'next' ? 1 : -1);
                const { buildSessionsPage } = require('../commands/sessions');
                try {
                    const pageContent = await buildSessionsPage(page);
                    await interaction.update(pageContent);
                } catch (error) {
                    logger.error(error, `Error building sessions page: ${page}`);
                }
            }
        } else if (interaction.isModalSubmit()) {
            if (interaction.customId === 'addCoachModal') {
                const userId = interaction.fields.getTextInputValue('userIdInput');
                const description = interaction.fields.getTextInputValue('descriptionInput');

                try {
                    const user = await interaction.client.users.fetch(userId);
                    const db = await openDb();
                    await db.run('INSERT INTO coaches (name, description, discord_id) VALUES (?, ?, ?)', user.username, description, user.id);

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Coach Added')
                        .setDescription(`Successfully added **${user.username}** as a coach.`);
                    await interaction.reply({ embeds: [successEmbed], ephemeral: true });
                } catch (error) {
                    logger.error(error, `Failed to add coach with ID: ${userId}`);
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('Error')
                        .setDescription('Failed to add coach. Please make sure the User ID is correct and the user exists.');
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            } else if (interaction.customId === 'createSessionModal') {
                try {
                    const date = interaction.fields.getTextInputValue('dateInput');
                    const time = interaction.fields.getTextInputValue('timeInput');
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
            }
        }
    },
};
