const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
const logger = require('../utils/logger');

async function openDb() {
    const db = await sqlite.open({
        filename: path.join(__dirname, 'coaching.db'),
        driver: sqlite3.Database
    });

    // Apply schema changes directly for now.
    try {
        const sessionsInfo = await db.all("PRAGMA table_info('sessions')");
        if (!sessionsInfo.some(column => column.name === 'guildScheduledEventId')) {
            await db.exec('ALTER TABLE sessions ADD COLUMN guildScheduledEventId TEXT');
            logger.info('Added guildScheduledEventId column to sessions table.');
        }

        const coachesInfo = await db.all("PRAGMA table_info('coaches')");
        if (!coachesInfo.some(column => column.name === 'discord_id')) {
            await db.exec('ALTER TABLE coaches ADD COLUMN discord_id TEXT');
            logger.info('Added discord_id column to coaches table.');
        }
    } catch (error) {
        logger.error(error, 'Failed to apply schema changes.');
    }

    return db;
}

module.exports = { openDb };
