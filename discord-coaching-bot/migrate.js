const fs = require('fs').promises;
const path = require('path');
const { openDb } = require('./database/database');

const migrationsDir = path.join(__dirname, 'database', 'migrations');

async function runMigrations() {
    const db = await openDb();
    await db.exec('CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');

    const files = await fs.readdir(migrationsDir);
    const runMigrations = await db.all('SELECT name FROM migrations');
    const migrationsToRun = files.filter(f => f.endsWith('.js') && !runMigrations.some(m => m.name === f));

    for (const file of migrationsToRun) {
        const migration = require(path.join(migrationsDir, file));
        await migration.up(db);
        await db.run('INSERT INTO migrations (name) VALUES (?)', file);
    }
}

runMigrations().catch(console.error);
