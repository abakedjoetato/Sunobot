const { openDb } = require('../database/database');
const moment = require('moment-timezone');
const logger = require('../utils/logger');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        logger.info(`Ready! Logged in as ${client.user.tag}`);
        const db = await openDb();

        setInterval(async () => {
            const twentyFourHoursFromNow = moment().utc().add(24, 'hours');
            const twentyFourHoursAndFifteenMinutesFromNow = moment().utc().add(24, 'hours').add(15, 'minutes');

            const sessions = await db.all('SELECT s.*, c.discord_id as coachDiscordId FROM sessions s JOIN coaches c ON s.claimedCoach = c.id WHERE s.isClaimed = 1 AND s.reminderSent = 0 AND s.datetime BETWEEN ? AND ?', [twentyFourHoursFromNow.format('YYYY-MM-DD HH:mm:ss'), twentyFourHoursAndFifteenMinutesFromNow.format('YYYY-MM-DD HH:mm:ss')]);

            for (const session of sessions) {
                try {
                    const user = await client.users.fetch(session.claimedBy);
                    const coach = await client.users.fetch(session.coachDiscordId);

                    const reminderMessage = `Reminder: Your coaching session is in 24 hours. Date/time: <t:${moment(session.datetime).unix()}:F>. Coach: ${coach.tag}.`;

                    try {
                        await user.send(reminderMessage);
                    } catch (error) {
                        logger.warn(`Could not send reminder DM to user ${user.id}`, error);
                    }
                    try {
                        await coach.send(reminderMessage);
                    } catch (error) {
                        logger.warn(`Could not send reminder DM to coach ${coach.id}`, error);
                    }

                    await db.run('UPDATE sessions SET reminderSent = 1 WHERE id = ?', session.id);
                } catch (error) {
                    logger.error(error, `Failed to send reminder for session ${session.id}`);
                }
            }
        }, 15 * 60 * 1000); // 15 minutes
    },
};
