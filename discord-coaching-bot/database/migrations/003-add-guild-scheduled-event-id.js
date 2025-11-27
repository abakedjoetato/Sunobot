module.exports = {
    async up(db) {
        const tableInfo = await db.all("PRAGMA table_info('sessions')");
        if (!tableInfo.some(column => column.name === 'guildScheduledEventId')) {
            await db.exec('ALTER TABLE sessions ADD COLUMN guildScheduledEventId TEXT');
        }
    },
    async down(db) {
        // This is a bit more complex, so we'll just leave it as is for now.
        // await db.exec('ALTER TABLE sessions DROP COLUMN guildScheduledEventId');
    },
};
