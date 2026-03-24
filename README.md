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
