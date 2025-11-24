const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

async function openDb() {
    return sqlite.open({
        filename: path.join(__dirname, 'coaching.db'),
        driver: sqlite3.Database
    });
}

module.exports = { openDb };
