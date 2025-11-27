require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const logger = require('./utils/logger');

const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        logger.error(`Error: Missing required environment variable: ${envVar}`);
        process.exit(1);
    }
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        logger.info('Started refreshing application (/) commands for guild.');

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        logger.info('Successfully reloaded application (/) commands for guild.');
    } catch (error) {
        logger.error(error, 'Failed to reload application commands for guild');
    }
})();
