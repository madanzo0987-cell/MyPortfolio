# Madan Portfolio

This is your personal portfolio project with an admin panel to manage profile data, projects, and settings.

## Admin Login

- Email: `madan@admin.com`
- Password: `MadanAdmin123`

## Run Locally

1. Create and activate a virtual environment.
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Start the app:
   - `python app.py`
4. Open the site in your browser:
   - `http://127.0.0.1:5000`
5. Admin panel:
   - `http://127.0.0.1:5000/admin`

## Telegram Notifications (Step-by-Step)

This sends every contact-form message to Telegram.

1. Create a Telegram bot:
   - Open `@BotFather` in Telegram.
   - Run `/newbot` and follow the instructions.
   - Copy the **bot token** it gives you.

2. Get your chat ID (you can add this later):
   - Open `@userinfobot` in Telegram.
   - It will show your **chat ID**.

3. Add the details in the Admin Panel:
   - Go to `Admin > Settings > Notifications`.
   - Turn on **Telegram Notifications**.
   - Paste your **Bot Token**.
   - Paste your **Chat ID** (or leave it blank for now).
   - Click **Save Settings**.

4. Test it:
   - Submit the contact form on your site.
   - You should receive a Telegram message.

## Notes

- If you don’t add a chat ID yet, the system will not send Telegram messages.
- You can update the token or chat ID any time from the Admin Panel.


## Deploy on Render (Step-by-Step)

1. Push your code to GitHub.
2. Go to Render and click **New > Web Service**.
3. Connect your GitHub repo.
4. Set **Build Command**:
   - `pip install -r requirements.txt`
5. Set **Start Command**:
   - `gunicorn app:app`
6. Add Environment Variables:
   - `SECRET_KEY` = any strong random string
   - `DATABASE_URL` = your Render PostgreSQL connection string
7. Click **Deploy**.
8. Open your service URL and log in to `/admin`.

### PostgreSQL vs SQLite

- **Local dev** uses SQLite (`db/portfolio.db`) automatically.
- **Render** uses PostgreSQL automatically when `DATABASE_URL` is set.
- The app will create tables and seed default data on first run.
