import os
import sqlite3
import uuid
import json
import smtplib
import urllib.parse
import urllib.request
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, session, jsonify, redirect, url_for
from flask_cors import CORS
import bcrypt
try:
    import psycopg2
    import psycopg2.extras
except Exception:
    psycopg2 = None

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app, supports_credentials=True)

DB_PATH = os.path.join(os.path.dirname(__file__), 'db', 'portfolio.db')

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)


class DB:
    def __init__(self, conn, is_postgres):
        self.conn = conn
        self.is_postgres = is_postgres

    def execute(self, query, params=()):
        if params is None:
            params = ()
        if self.is_postgres:
            q = query.replace('?', '%s')
            cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(q, params)
            return cur
        return self.conn.execute(query, params)

    def commit(self):
        self.conn.commit()

    def close(self):
        self.conn.close()


def get_db():
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        if psycopg2 is None:
            raise RuntimeError('psycopg2 is required for PostgreSQL connections')
        ssl_mode = os.environ.get('PGSSLMODE', 'require')
        conn = psycopg2.connect(database_url, sslmode=ssl_mode)
        return DB(conn, True)

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return DB(conn, False)


def init_db():
    db = get_db()
    if db.is_postgres:
        c = db.conn.cursor()
        statements = [
            '''
        CREATE TABLE IF NOT EXISTS portfolio (
            id TEXT PRIMARY KEY,
            name TEXT,
            title TEXT,
            about TEXT,
            email TEXT,
            phone TEXT,
            location TEXT,
            github TEXT,
            linkedin TEXT,
            twitter TEXT,
            instagram TEXT,
            website TEXT,
            avatar_url TEXT,
            resume_url TEXT,
            is_available INTEGER DEFAULT 1
        )''',
            '''
        CREATE TABLE IF NOT EXISTS stats (
            id TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            value TEXT NOT NULL,
            icon TEXT,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS tech_stack (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            category TEXT,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT,
            proficiency INTEGER DEFAULT 50,
            icon TEXT,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            github_url TEXT,
            live_url TEXT,
            tags TEXT,
            featured INTEGER DEFAULT 0,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS education (
            id TEXT PRIMARY KEY,
            institution TEXT NOT NULL,
            degree TEXT,
            field TEXT,
            start_date TEXT,
            end_date TEXT,
            description TEXT,
            icon TEXT,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS experience (
            id TEXT PRIMARY KEY,
            company TEXT NOT NULL,
            position TEXT,
            start_date TEXT,
            end_date TEXT,
            description TEXT,
            current INTEGER DEFAULT 0,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS certifications (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            issuer TEXT,
            date TEXT,
            credential_url TEXT,
            image_url TEXT,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS languages (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            proficiency TEXT,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS interests (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS achievements (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            date TEXT,
            category TEXT,
            link TEXT,
            display_order INTEGER DEFAULT 0
        )''',
            '''
        CREATE TABLE IF NOT EXISTS contact_messages (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''',
            '''
        CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY,
            theme TEXT DEFAULT 'dark',
            accent_color TEXT DEFAULT 'pink',
            cursor_enabled INTEGER DEFAULT 1,
            background_effects INTEGER DEFAULT 1,
            show_stats INTEGER DEFAULT 1,
            show_services INTEGER DEFAULT 1,
            show_skills INTEGER DEFAULT 1,
            show_projects INTEGER DEFAULT 1,
            show_education INTEGER DEFAULT 1,
            show_experience INTEGER DEFAULT 1,
            show_certifications INTEGER DEFAULT 1,
            show_languages INTEGER DEFAULT 1,
            show_interests INTEGER DEFAULT 1,
            show_achievements INTEGER DEFAULT 1,
            show_contact INTEGER DEFAULT 1,
            telegram_enabled INTEGER DEFAULT 0,
            telegram_bot_token TEXT,
            telegram_chat_id TEXT
        )''',
            '''
        CREATE TABLE IF NOT EXISTS admin_users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )'''
        ]
        for stmt in statements:
            c.execute(stmt)
    else:
        c = db.conn.cursor()
        c.executescript('''
            CREATE TABLE IF NOT EXISTS portfolio (
                id TEXT PRIMARY KEY,
                name TEXT,
                title TEXT,
                about TEXT,
                email TEXT,
                phone TEXT,
                location TEXT,
                github TEXT,
                linkedin TEXT,
                twitter TEXT,
                instagram TEXT,
                website TEXT,
                avatar_url TEXT,
                resume_url TEXT,
                is_available INTEGER DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS stats (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                value TEXT NOT NULL,
                icon TEXT,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS tech_stack (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                category TEXT,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS services (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS skills (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT,
                proficiency INTEGER DEFAULT 50,
                icon TEXT,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                image_url TEXT,
                github_url TEXT,
                live_url TEXT,
                tags TEXT,
                featured INTEGER DEFAULT 0,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS education (
                id TEXT PRIMARY KEY,
                institution TEXT NOT NULL,
                degree TEXT,
                field TEXT,
                start_date TEXT,
                end_date TEXT,
                description TEXT,
                icon TEXT,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS experience (
                id TEXT PRIMARY KEY,
                company TEXT NOT NULL,
                position TEXT,
                start_date TEXT,
                end_date TEXT,
                description TEXT,
                current INTEGER DEFAULT 0,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS certifications (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                issuer TEXT,
                date TEXT,
                credential_url TEXT,
                image_url TEXT,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS languages (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                proficiency TEXT,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS interests (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                icon TEXT,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS achievements (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                icon TEXT,
                date TEXT,
                category TEXT,
                link TEXT,
                display_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS contact_messages (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                theme TEXT DEFAULT 'dark',
                accent_color TEXT DEFAULT 'pink',
                cursor_enabled INTEGER DEFAULT 1,
                background_effects INTEGER DEFAULT 1,
                show_stats INTEGER DEFAULT 1,
                show_services INTEGER DEFAULT 1,
                show_skills INTEGER DEFAULT 1,
                show_projects INTEGER DEFAULT 1,
                show_education INTEGER DEFAULT 1,
                show_experience INTEGER DEFAULT 1,
                show_certifications INTEGER DEFAULT 1,
                show_languages INTEGER DEFAULT 1,
                show_interests INTEGER DEFAULT 1,
                show_achievements INTEGER DEFAULT 1,
                show_contact INTEGER DEFAULT 1,
                telegram_enabled INTEGER DEFAULT 0,
                telegram_bot_token TEXT,
                telegram_chat_id TEXT
            );

            CREATE TABLE IF NOT EXISTS admin_users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL
            );
        ''')

    if db.is_postgres:
        c.execute("ALTER TABLE portfolio ADD COLUMN IF NOT EXISTS instagram TEXT")
        c.execute("ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_enabled INTEGER DEFAULT 0")
        c.execute("ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT")
        c.execute("ALTER TABLE settings ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT")
    else:
        # Ensure instagram column exists for older databases
        cols = [r[1] for r in c.execute("PRAGMA table_info(portfolio)").fetchall()]
        if 'instagram' not in cols:
            c.execute("ALTER TABLE portfolio ADD COLUMN instagram TEXT")

        # Ensure telegram settings columns exist for older databases
        settings_cols = [r[1] for r in c.execute("PRAGMA table_info(settings)").fetchall()]
        if 'telegram_enabled' not in settings_cols:
            c.execute("ALTER TABLE settings ADD COLUMN telegram_enabled INTEGER DEFAULT 0")
        if 'telegram_bot_token' not in settings_cols:
            c.execute("ALTER TABLE settings ADD COLUMN telegram_bot_token TEXT")
        if 'telegram_chat_id' not in settings_cols:
            c.execute("ALTER TABLE settings ADD COLUMN telegram_chat_id TEXT")

    # Seed default data if empty
    existing = db.execute('SELECT id FROM portfolio').fetchone()
    if not existing:
        seed_data(db)

    db.commit()
    db.close()


def seed_data(db):
    pid = str(uuid.uuid4())
    db.execute('''INSERT INTO portfolio (id,name,title,about,email,phone,location,github,linkedin,twitter,instagram,website,avatar_url,resume_url,is_available)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
              (pid, 'Madan Kumar M', 'Student at Kristu Jayanti University', 
               'BCA (Cloud Computing) student at Kristu Jayanti University in Bengaluru, focused on full-stack web development and strong CS fundamentals. I enjoy building real-world projects, participating in hackathons, and continuously learning new technologies.',
               'madanzo0987@gmail.com', '+91 98765 43210', 'Bengaluru, Karnataka, India',
               'https://github.com/madanzo0987-cell', 'https://www.linkedin.com/in/madan-kumar-m-87a776384?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
               'https://twitter.com/madankumar', 'https://instagram.com/thenameismadan', 'https://madankumar.dev',
               '', '', 1))

    settings_id = str(uuid.uuid4())
    db.execute('INSERT INTO settings (id) VALUES (?)', (settings_id,))

    stats = [
        ('Projects Completed', '8+', '🚀', 0),
        ('Focus Area', 'Web Development', '💻', 1),
        ('Experience', 'Student', '📅', 2),
        ('Location', 'Bengaluru, Karnataka, India', '📍', 3),
    ]
    for label, value, icon, order in stats:
        db.execute('INSERT INTO stats VALUES (?,?,?,?,?)',
                  (str(uuid.uuid4()), label, value, icon, order))

    tech = [
        ('Python', '🐍', 'backend', 0), ('JavaScript', '⚡', 'frontend', 1),
        ('React', '⚛️', 'frontend', 2), ('Node.js', '🟢', 'backend', 3),
        ('PostgreSQL', '🐘', 'database', 4), ('Docker', '🐳', 'devops', 5),
        ('AWS', '☁️', 'devops', 6), ('Git', '📦', 'tools', 7),
    ]
    for name, icon, cat, order in tech:
        db.execute('INSERT INTO tech_stack VALUES (?,?,?,?,?)',
                  (str(uuid.uuid4()), name, icon, cat, order))

    services = [
        ('Web Development', 'Building responsive, fast and modern web applications with the latest technologies.', '🌐', 0),
        ('API Development', 'Designing and building RESTful APIs and microservices that power your applications.', '⚙️', 1),
        ('Database Design', 'Architecting efficient database schemas and optimizing queries for performance.', '🗄️', 2),
        ('UI/UX Design', 'Creating beautiful interfaces with a focus on user experience and accessibility.', '🎨', 3),
    ]
    for title, desc, icon, order in services:
        db.execute('INSERT INTO services VALUES (?,?,?,?,?)',
                  (str(uuid.uuid4()), title, desc, icon, order))

    skills_data = [
        ('Python', 'Backend', 95, '🐍', 0),
        ('JavaScript', 'Frontend', 90, '⚡', 1),
        ('React', 'Frontend', 85, '⚛️', 2),
        ('Node.js', 'Backend', 80, '🟢', 3),
        ('SQL', 'Database', 85, '🗄️', 4),
        ('Docker', 'DevOps', 75, '🐳', 5),
        ('AWS', 'DevOps', 70, '☁️', 6),
        ('TypeScript', 'Frontend', 80, '📘', 7),
        ('CSS/SCSS', 'Frontend', 88, '🎨', 8),
        ('Git', 'Tools', 90, '📦', 9),
    ]
    for name, cat, prof, icon, order in skills_data:
        db.execute('INSERT INTO skills VALUES (?,?,?,?,?,?)',
                  (str(uuid.uuid4()), name, cat, prof, icon, order))

    projects_data = [
        ('MyPortfolio', 'GitHub repository: MyPortfolio.', '', 'https://github.com/madanzo0987-cell/MyPortfolio', '', '["GitHub","Portfolio"]', 1, 0),
        ('Madanm', 'GitHub repository: Madanm.', '', 'https://github.com/madanzo0987-cell/Madanm', '', '["GitHub"]', 1, 1),
        ('Madank', 'GitHub repository: Madank.', '', 'https://github.com/madanzo0987-cell/Madank', '', '["GitHub"]', 1, 2),
        ('port', 'GitHub repository: port.', '', 'https://github.com/madanzo0987-cell/port', '', '["GitHub"]', 0, 3),
        ('portfolio-1', 'GitHub repository: portfolio-1.', '', 'https://github.com/madanzo0987-cell/portfolio-1', '', '["GitHub","Portfolio"]', 0, 4),
        ('portfolio.', 'GitHub repository: portfolio.', '', 'https://github.com/madanzo0987-cell/portfolio.', '', '["GitHub","Portfolio"]', 0, 5),
        ('portfolio', 'GitHub repository: portfolio.', '', 'https://github.com/madanzo0987-cell/portfolio', '', '["GitHub","Portfolio"]', 0, 6),
    ]
    for title, desc, img, gh, live, tags, featured, order in projects_data:
        db.execute('INSERT INTO projects VALUES (?,?,?,?,?,?,?,?,?)',
                  (str(uuid.uuid4()), title, desc, img, gh, live, tags, featured, order))

    education_data = [
        ('Kristu Jayanti University', 'BCA', 'Cloud Computing', '2025', 'Present', 'Currently pursuing BCA with a focus on cloud computing and software development.', '', 0),
    ]
    for inst, deg, field, start, end, desc, icon, order in education_data:
        db.execute('INSERT INTO education VALUES (?,?,?,?,?,?,?,?,?)',
                  (str(uuid.uuid4()), inst, deg, field, start, end, desc, icon, order))

    experience_data = [
        ('Campus Tech Club', 'Web Development Lead', '2024', '', 'Leading a student team to build web projects for campus events, mentoring peers and coordinating releases.', 1, 0),
        ('Summer Internship', 'Software Intern', '2024', '2024', 'Built internal dashboards and automated reports using Python and Flask.', 0, 1),
        ('Hackathons', 'Participant', '2023', '2024', 'Built prototypes in 24-48 hour sprints and collaborated with cross-functional teams.', 0, 2),
    ]
    for company, pos, start, end, desc, current, order in experience_data:
        db.execute('INSERT INTO experience VALUES (?,?,?,?,?,?,?,?)',
                  (str(uuid.uuid4()), company, pos, start, end, desc, current, order))

    certs = [
        ('AWS Certified Developer', 'Amazon Web Services', '2024', 'https://aws.amazon.com', '', 0),
        ('Google Cloud Professional', 'Google', '2022', 'https://cloud.google.com', '', 1),
    ]
    for name, issuer, date, url, img, order in certs:
        db.execute('INSERT INTO certifications VALUES (?,?,?,?,?,?,?)',
                  (str(uuid.uuid4()), name, issuer, date, url, img, order))

    langs = [
        ('English', 'Fluent', 0), ('Hindi', 'Fluent', 1), ('Kannada', 'Fluent', 2), ('Telugu', 'Fluent', 3),
    ]
    for name, prof, order in langs:
        db.execute('INSERT INTO languages VALUES (?,?,?,?)',
                  (str(uuid.uuid4()), name, prof, order))

    ints = [
        ('Open Source', '', 0), ('Competitive Programming', '', 1), ('Photography', '', 2),
        ('Hiking', '', 3), ('Gaming', '', 4), ('Reading', '', 5),
    ]
    for name, icon, order in ints:
        db.execute('INSERT INTO interests VALUES (?,?,?,?)',
                  (str(uuid.uuid4()), name, icon, order))

    achvs = [
        ('Hackathon Finalist', 'Reached finals in a national-level hackathon for a campus safety app.', '', '2024', 'community', '', 0),
        ('Open Source Contributor', 'Contributed to open source and shared learning projects on GitHub.', '', '2024', 'community', 'https://github.com/madanzo0987-cell', 1),
    ]
    for title, desc, icon, date, cat, link, order in achvs:
        db.execute('INSERT INTO achievements VALUES (?,?,?,?,?,?,?,?)',
                  (str(uuid.uuid4()), title, desc, icon, date, cat, link, order))

    # Default admin
    password = 'MadanAdmin123'
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    if db.is_postgres:
        db.execute('INSERT INTO admin_users (id,email,password_hash) VALUES (?,?,?) ON CONFLICT (email) DO NOTHING',
                   (str(uuid.uuid4()), 'madan@admin.com', hashed))
    else:
        db.execute('INSERT OR IGNORE INTO admin_users VALUES (?,?,?)',
                   (str(uuid.uuid4()), 'madan@admin.com', hashed))


def row_to_dict(row):
    return dict(row) if row else None


def rows_to_list(rows):
    return [dict(r) for r in rows]


def send_notification_email(message_data):
    smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    notify_email = os.environ.get('NOTIFY_EMAIL')

    if not all([smtp_user, smtp_password, notify_email]):
        return False

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"New Contact: {message_data['name']}"
        msg['From'] = smtp_user
        msg['To'] = notify_email

        html = f"""
        <html><body style="font-family:Arial,sans-serif;">
        <h2 style="color:#ec4899;">New Contact Form Submission</h2>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:8px;font-weight:bold;">Name:</td><td style="padding:8px;">{message_data['name']}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">{message_data['email']}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Subject:</td><td style="padding:8px;">{message_data.get('subject','N/A')}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Message:</td><td style="padding:8px;">{message_data['message']}</td></tr>
        </table>
        </body></html>
        """
        msg.attach(MIMEText(html, 'html'))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        return True
    except Exception:
        return False


def send_notification_telegram(message_data):
    try:
        conn = get_db()
        settings = row_to_dict(conn.execute('SELECT * FROM settings LIMIT 1').fetchone())
        conn.close()

        if not settings or not settings.get('telegram_enabled'):
            return False

        bot_token = (settings.get('telegram_bot_token') or '').strip()
        chat_id = (settings.get('telegram_chat_id') or '').strip()
        if not bot_token or not chat_id:
            return False

        text = (
            "New Contact Form Submission\n"
            f"Name: {message_data.get('name')}\n"
            f"Email: {message_data.get('email')}\n"
            f"Subject: {message_data.get('subject', 'N/A')}\n"
            f"Message: {message_data.get('message')}"
        )

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = urllib.parse.urlencode({
            "chat_id": chat_id,
            "text": text
        }).encode("utf-8")
        req = urllib.request.Request(url, data=payload, method="POST")
        with urllib.request.urlopen(req, timeout=10):
            return True
    except Exception:
        return False


# ─── Main Routes ────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/admin')
def admin():
    if not session.get('admin_logged_in'):
        return redirect(url_for('login'))
    return render_template('admin.html')


@app.route('/admin/login')
def login():
    if session.get('admin_logged_in'):
        return redirect(url_for('admin'))
    return render_template('login.html')


# ─── API Routes ──────────────────────────────────────────────────

@app.route('/papi/data')
def api_data():
    conn = get_db()
    data_type = request.args.get('type')

    if data_type == 'settings':
        settings = row_to_dict(conn.execute('SELECT * FROM settings LIMIT 1').fetchone())
        conn.close()
        return jsonify({'settings': settings})

    portfolio = row_to_dict(conn.execute('SELECT * FROM portfolio LIMIT 1').fetchone())
    stats = rows_to_list(conn.execute('SELECT * FROM stats ORDER BY display_order').fetchall())
    tech_stack = rows_to_list(conn.execute('SELECT * FROM tech_stack ORDER BY display_order').fetchall())
    services = rows_to_list(conn.execute('SELECT * FROM services ORDER BY display_order').fetchall())
    skills = rows_to_list(conn.execute('SELECT * FROM skills ORDER BY display_order').fetchall())
    projects = rows_to_list(conn.execute('SELECT * FROM projects ORDER BY display_order').fetchall())
    education = rows_to_list(conn.execute('SELECT * FROM education ORDER BY display_order').fetchall())
    experience = rows_to_list(conn.execute('SELECT * FROM experience ORDER BY display_order').fetchall())
    certifications = rows_to_list(conn.execute('SELECT * FROM certifications ORDER BY display_order').fetchall())
    languages = rows_to_list(conn.execute('SELECT * FROM languages ORDER BY display_order').fetchall())
    interests = rows_to_list(conn.execute('SELECT * FROM interests ORDER BY display_order').fetchall())
    achievements = rows_to_list(conn.execute('SELECT * FROM achievements ORDER BY display_order').fetchall())
    settings = row_to_dict(conn.execute('SELECT * FROM settings LIMIT 1').fetchone())
    conn.close()

    for p in projects:
        if p.get('tags') and isinstance(p['tags'], str):
            try:
                p['tags'] = json.loads(p['tags'])
            except Exception:
                p['tags'] = []

    return jsonify({
        'portfolio': portfolio,
        'stats': stats,
        'tech_stack': tech_stack,
        'services': services,
        'skills': skills,
        'projects': projects,
        'education': education,
        'experience': experience,
        'certifications': certifications,
        'languages': languages,
        'interests': interests,
        'achievements': achievements,
        'settings': settings,
        'admin_email': session.get('admin_email') if session.get('admin_logged_in') else None,
    })


@app.route('/papi/login', methods=['POST'])
def api_login():
    data = request.get_json()
    email = data.get('email', '')
    password = data.get('password', '')

    conn = get_db()
    user = row_to_dict(conn.execute('SELECT * FROM admin_users WHERE email = ?', (email,)).fetchone())
    conn.close()

    if user and bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
        session['admin_logged_in'] = True
        session['admin_email'] = email
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401


@app.route('/papi/login', methods=['DELETE'])
def api_logout():
    session.clear()
    return jsonify({'success': True})


@app.route('/papi/contact', methods=['POST'])
def api_contact():
    data = request.get_json()
    name = data.get('name', '').strip()
    email = data.get('email', '').strip()
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()

    if not name or not email or not message:
        return jsonify({'success': False, 'error': 'Name, email and message are required'}), 400

    msg_id = str(uuid.uuid4())
    conn = get_db()
    conn.execute('INSERT INTO contact_messages VALUES (?,?,?,?,?,?,?)',
                 (msg_id, name, email, subject, message, 0, datetime.utcnow()))
    conn.commit()
    conn.close()

    payload = {'name': name, 'email': email, 'subject': subject, 'message': message}
    send_notification_email(payload)
    send_notification_telegram(payload)

    return jsonify({'success': True, 'message': 'Message sent successfully!'})


@app.route('/papi/save', methods=['POST'])
def api_save():
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    action = data.get('action')
    conn = get_db()

    try:
        if action == 'portfolio':
            p = data.get('data', {})
            existing = conn.execute('SELECT id FROM portfolio LIMIT 1').fetchone()
            if existing:
                conn.execute('''UPDATE portfolio SET name=?,title=?,about=?,email=?,phone=?,location=?,
                    github=?,linkedin=?,twitter=?,instagram=?,website=?,avatar_url=?,resume_url=?,is_available=? WHERE id=?''',
                    (p.get('name'), p.get('title'), p.get('about'), p.get('email'), p.get('phone'),
                     p.get('location'), p.get('github'), p.get('linkedin'), p.get('twitter'),
                     p.get('instagram'), p.get('website'), p.get('avatar_url'), p.get('resume_url'),
                     p.get('is_available', 1), existing['id']))
            else:
                conn.execute('''INSERT INTO portfolio (id,name,title,about,email,phone,location,github,linkedin,twitter,instagram,website,avatar_url,resume_url,is_available)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                    (str(uuid.uuid4()), p.get('name'), p.get('title'), p.get('about'),
                     p.get('email'), p.get('phone'), p.get('location'), p.get('github'),
                     p.get('linkedin'), p.get('twitter'), p.get('instagram'), p.get('website'),
                     p.get('avatar_url'), p.get('resume_url'), p.get('is_available', 1)))

        elif action == 'skill':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE skills SET name=?,category=?,proficiency=?,icon=?,display_order=? WHERE id=?',
                    (d['name'], d.get('category'), d.get('proficiency', 50), d.get('icon'), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO skills VALUES (?,?,?,?,?,?)',
                    (str(uuid.uuid4()), d['name'], d.get('category'), d.get('proficiency', 50), d.get('icon'), d.get('display_order', 0)))

        elif action == 'deleteSkill':
            conn.execute('DELETE FROM skills WHERE id=?', (data.get('id'),))

        elif action == 'project':
            d = data.get('data', {})
            tags = json.dumps(d.get('tags', [])) if isinstance(d.get('tags'), list) else d.get('tags', '[]')
            if d.get('id'):
                conn.execute('UPDATE projects SET title=?,description=?,image_url=?,github_url=?,live_url=?,tags=?,featured=?,display_order=? WHERE id=?',
                    (d['title'], d.get('description'), d.get('image_url'), d.get('github_url'),
                     d.get('live_url'), tags, d.get('featured', 0), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO projects VALUES (?,?,?,?,?,?,?,?,?)',
                    (str(uuid.uuid4()), d['title'], d.get('description'), d.get('image_url'),
                     d.get('github_url'), d.get('live_url'), tags, d.get('featured', 0), d.get('display_order', 0)))

        elif action == 'deleteProject':
            conn.execute('DELETE FROM projects WHERE id=?', (data.get('id'),))

        elif action == 'education':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE education SET institution=?,degree=?,field=?,start_date=?,end_date=?,description=?,icon=?,display_order=? WHERE id=?',
                    (d['institution'], d.get('degree'), d.get('field'), d.get('start_date'),
                     d.get('end_date'), d.get('description'), d.get('icon'), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO education VALUES (?,?,?,?,?,?,?,?,?)',
                    (str(uuid.uuid4()), d['institution'], d.get('degree'), d.get('field'),
                     d.get('start_date'), d.get('end_date'), d.get('description'), d.get('icon'), d.get('display_order', 0)))

        elif action == 'deleteEducation':
            conn.execute('DELETE FROM education WHERE id=?', (data.get('id'),))

        elif action == 'experience':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE experience SET company=?,position=?,start_date=?,end_date=?,description=?,current=?,display_order=? WHERE id=?',
                    (d['company'], d.get('position'), d.get('start_date'), d.get('end_date'),
                     d.get('description'), d.get('current', 0), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO experience VALUES (?,?,?,?,?,?,?,?)',
                    (str(uuid.uuid4()), d['company'], d.get('position'), d.get('start_date'),
                     d.get('end_date'), d.get('description'), d.get('current', 0), d.get('display_order', 0)))

        elif action == 'deleteExperience':
            conn.execute('DELETE FROM experience WHERE id=?', (data.get('id'),))

        elif action == 'service':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE services SET title=?,description=?,icon=?,display_order=? WHERE id=?',
                    (d['title'], d.get('description'), d.get('icon'), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO services VALUES (?,?,?,?,?)',
                    (str(uuid.uuid4()), d['title'], d.get('description'), d.get('icon'), d.get('display_order', 0)))

        elif action == 'deleteService':
            conn.execute('DELETE FROM services WHERE id=?', (data.get('id'),))

        elif action == 'techStack':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE tech_stack SET name=?,icon=?,category=?,display_order=? WHERE id=?',
                    (d['name'], d.get('icon'), d.get('category'), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO tech_stack VALUES (?,?,?,?,?)',
                    (str(uuid.uuid4()), d['name'], d.get('icon'), d.get('category'), d.get('display_order', 0)))

        elif action == 'deleteTechStack':
            conn.execute('DELETE FROM tech_stack WHERE id=?', (data.get('id'),))

        elif action == 'certification':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE certifications SET name=?,issuer=?,date=?,credential_url=?,image_url=?,display_order=? WHERE id=?',
                    (d['name'], d.get('issuer'), d.get('date'), d.get('credential_url'),
                     d.get('image_url'), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO certifications VALUES (?,?,?,?,?,?,?)',
                    (str(uuid.uuid4()), d['name'], d.get('issuer'), d.get('date'),
                     d.get('credential_url'), d.get('image_url'), d.get('display_order', 0)))

        elif action == 'deleteCertification':
            conn.execute('DELETE FROM certifications WHERE id=?', (data.get('id'),))

        elif action == 'language':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE languages SET name=?,proficiency=?,display_order=? WHERE id=?',
                    (d['name'], d.get('proficiency'), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO languages VALUES (?,?,?,?)',
                    (str(uuid.uuid4()), d['name'], d.get('proficiency'), d.get('display_order', 0)))

        elif action == 'deleteLanguage':
            conn.execute('DELETE FROM languages WHERE id=?', (data.get('id'),))

        elif action == 'interest':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE interests SET name=?,icon=?,display_order=? WHERE id=?',
                    (d['name'], d.get('icon'), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO interests VALUES (?,?,?,?)',
                    (str(uuid.uuid4()), d['name'], d.get('icon'), d.get('display_order', 0)))

        elif action == 'deleteInterest':
            conn.execute('DELETE FROM interests WHERE id=?', (data.get('id'),))

        elif action == 'achievement':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE achievements SET title=?,description=?,icon=?,date=?,category=?,link=?,display_order=? WHERE id=?',
                    (d['title'], d.get('description'), d.get('icon'), d.get('date'),
                     d.get('category'), d.get('link'), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO achievements VALUES (?,?,?,?,?,?,?,?)',
                    (str(uuid.uuid4()), d['title'], d.get('description'), d.get('icon'),
                     d.get('date'), d.get('category'), d.get('link'), d.get('display_order', 0)))

        elif action == 'deleteAchievement':
            conn.execute('DELETE FROM achievements WHERE id=?', (data.get('id'),))

        elif action == 'settings':
            d = data.get('data', {})
            existing = conn.execute('SELECT id FROM settings LIMIT 1').fetchone()
            if existing:
                conn.execute('''UPDATE settings SET theme=?,accent_color=?,cursor_enabled=?,background_effects=?,
                    show_stats=?,show_services=?,show_skills=?,show_projects=?,show_education=?,
                    show_experience=?,show_certifications=?,show_languages=?,show_interests=?,
                    show_achievements=?,show_contact=?,telegram_enabled=?,telegram_bot_token=?,telegram_chat_id=? WHERE id=?''',
                    (d.get('theme','dark'), d.get('accent_color','pink'),
                     d.get('cursor_enabled',1), d.get('background_effects',1),
                     d.get('show_stats',1), d.get('show_services',1), d.get('show_skills',1),
                     d.get('show_projects',1), d.get('show_education',1), d.get('show_experience',1),
                     d.get('show_certifications',1), d.get('show_languages',1),
                     d.get('show_interests',1), d.get('show_achievements',1),
                     d.get('show_contact',1), d.get('telegram_enabled',0),
                     d.get('telegram_bot_token'), d.get('telegram_chat_id'),
                     existing['id']))

        elif action == 'markMessageRead':
            conn.execute('UPDATE contact_messages SET is_read=1 WHERE id=?', (data.get('id'),))

        elif action == 'deleteMessage':
            conn.execute('DELETE FROM contact_messages WHERE id=?', (data.get('id'),))

        elif action == 'stat':
            d = data.get('data', {})
            if d.get('id'):
                conn.execute('UPDATE stats SET label=?,value=?,icon=?,display_order=? WHERE id=?',
                    (d['label'], d['value'], d.get('icon'), d.get('display_order', 0), d['id']))
            else:
                conn.execute('INSERT INTO stats VALUES (?,?,?,?,?)',
                    (str(uuid.uuid4()), d['label'], d['value'], d.get('icon'), d.get('display_order', 0)))

        elif action == 'deleteStat':
            conn.execute('DELETE FROM stats WHERE id=?', (data.get('id'),))

        conn.commit()
        conn.close()
        return jsonify({'success': True})

    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/papi/messages')
def api_messages():
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    messages = rows_to_list(conn.execute('SELECT * FROM contact_messages ORDER BY created_at DESC').fetchall())
    conn.close()
    return jsonify({'messages': messages})


if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port, debug=False)
else:
    # Ensure DB is ready when running via gunicorn/WSGI
    init_db()
