# Discord Coaching Scheduler Bot

This is a production-ready Discord bot for a 1-on-1 coaching appointment system. It's built with Node.js, discord.js v14, and uses SQLite for a persistent database.

## Features

- **Admin Permissions:** Only users with the "Coaching Admin" role can manage coaches and sessions.
- **Coach Management:** Admins can add, remove, and list coaches.
- **Session Creation:** Admins can create coaching sessions up to 3 months in advance.
- **Session Booking:** Users can view available sessions and claim them.
- **User Session Management:** Users can view their upcoming sessions and cancel them.
- **Cancellation Rules:** Users can only cancel a session if it's more than 48 hours away.
- **Automatic Reminders:** The bot sends automatic reminders 24 hours before a session.
- **Clean UI:** All interactions are handled through slash commands, modals, and interactive components.

## Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/discord-coaching-bot.git
   cd discord-coaching-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file:**
   Create a `.env` file in the root directory and add the following:
   ```
   DISCORD_TOKEN=your-bot-token
   CLIENT_ID=your-bot-client-id
   GUILD_ID=your-discord-server-id
   ADMIN_ROLE_ID=your-admin-role-id
   ```

4. **Run database migrations:**
    ```bash
    node migrate.js
    ```

5. **Deploy the slash commands:**
   ```bash
   node deploy-commands.js
   ```

6. **Start the bot:**
   ```bash
   node index.js
   ```

**Note on Role IDs:** To get a role ID, you need to enable Developer Mode in your Discord settings (User Settings > Advanced > Developer Mode). Then, right-click the role in your server's settings and click "Copy Role ID".

## Usage

### Admin Commands

- `/addcoach user:@user [description]` - Adds a new coach.
- `/listcoaches` - Lists all coaches.
- `/removecoach id:<id>` - Removes a coach.
- `/createsession date:<date> time:<time>` - Creates a new coaching session.

### User Commands

- `/sessions` - Displays available coaching sessions.
- `/mysessions` - Displays your upcoming coaching sessions.
