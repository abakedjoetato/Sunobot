const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const { openDb } = require('../database/database');
const moment = require('moment-timezone');
const { EmbedBuilder } = require('discord.js');

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
                console.error(error);
                await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
            }
        } else if (interaction.isStringSelectMenu()) {
            try {
                if (interaction.customId.startsWith('create_session_')) {
                    const timestamp = interaction.customId.split('_')[2];
                    const sessionDateTime = moment.unix(timestamp).utc().format('YYYY-MM-DD HH:mm:ss');
                    const selectedCoaches = JSON.stringify(interaction.values);
                    await db.run('INSERT INTO sessions (datetime, availableCoaches) VALUES (?, ?)', sessionDateTime, selectedCoaches);
                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('Session Created')
                        .setDescription(`Successfully created a session for **${moment(sessionDateTime).format('YYYY-MM-DD HH:mm')} UTC**.`);
                    await interaction.update({ content: '', embeds: [successEmbed], components: [] });
                } else if (interaction.customId === 'claim_session_select') {
                    const sessionId = interaction.values[0];
                    const session = await db.get('SELECT * FROM sessions WHERE id = ?', sessionId);
                    if (!session || session.isClaimed) {
                        return await interaction.update({ content: 'This session is no longer available.', components: [], ephemeral: true });
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
                        console.error(`Could not send DM to user ${interaction.user.id}`, error);
                    }
                    const coach = await db.get('SELECT discord_id FROM coaches WHERE id = ?', coachId);
                    try {
                        const coachUser = await interaction.client.users.fetch(coach.discord_id);
                        await coachUser.send(`A session at <t:${sessionDateTime.unix()}:F> has been claimed by ${interaction.user.tag}.`);
                    } catch (error) {
                        console.error(`Could not send DM to coach ${coach.discord_id}`, error);
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
                        console.error(`Could not send DM to user ${interaction.user.id}`, error);
                    }
                    const coach = await db.get('SELECT discord_id FROM coaches WHERE id = ?', coachId);
                    if (coach) {
                        try {
                            const coachUser = await interaction.client.users.fetch(coach.discord_id);
                            await coachUser.send(`The session at <t:${sessionDateTime.unix()}:F> with ${interaction.user.tag} has been cancelled.`);
                        } catch (error) {
                            console.error(`Could not send DM to coach ${coach.discord_id}`, error);
                        }
                    }
                }
            } catch (error) {
                console.error(error);
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
                    console.error(error);
                }
            }
        }
    },
};
