module.exports.up = async function(db) {
    await db.exec('ALTER TABLE coaches ADD COLUMN discord_id TEXT');
    console.log('Migration 002-add-coach-discord-id complete.');
}
