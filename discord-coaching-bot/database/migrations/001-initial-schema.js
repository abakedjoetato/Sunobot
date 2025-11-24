module.exports.up = async function(db) {
    await db.exec(`CREATE TABLE IF NOT EXISTS coaches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT
    )`);
    await db.exec(`CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        datetime TEXT NOT NULL,
        availableCoaches TEXT NOT NULL,
        isClaimed BOOLEAN NOT NULL DEFAULT 0,
        claimedBy TEXT,
        claimedCoach INTEGER,
        reminderSent BOOLEAN NOT NULL DEFAULT 0,
        FOREIGN KEY (claimedCoach) REFERENCES coaches(id)
    )`);
    console.log('Migration 001-initial-schema complete.');
}
