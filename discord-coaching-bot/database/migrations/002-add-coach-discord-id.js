module.exports = {
    async up(db) {
        const tableInfo = await db.all("PRAGMA table_info('coaches')");
        if (!tableInfo.some(column => column.name === 'discord_id')) {
            await db.exec('ALTER TABLE coaches ADD COLUMN discord_id TEXT');
        }
    },
    async down(db) {
        // This is a bit more complex, so we'll just leave it as is for now.
        // await db.exec('ALTER TABLE coaches DROP COLUMN discord_id');
    },
};
