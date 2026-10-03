# UIU Alumni Portal — Backend Documentation & Setup Guide

This is the Express + PostgreSQL backend for the UIU Alumni Portal. The backend serves both the REST API under `/api/*` and the static frontend directly at `http://localhost:5000`.

---

## 🚀 Windows Setup Guide

### 1. Prerequisites
- **Node.js**: v20+ installed.
- **PostgreSQL**: v14+ installed and running locally.

### 2. PostgreSQL Setup
Open Command Prompt or PowerShell and create the databases and user using `psql`:

```sql
-- Open psql as postgres admin:
psql -U postgres

-- In psql, run:
CREATE USER uiu_admin WITH PASSWORD 'your_secure_password';
CREATE DATABASE uiu_alumni OWNER uiu_admin;
CREATE DATABASE uiu_alumni_test OWNER uiu_admin;
GRANT ALL PRIVILEGES ON DATABASE uiu_alumni TO uiu_admin;
GRANT ALL PRIVILEGES ON DATABASE uiu_alumni_test TO uiu_admin;
\q
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:

```cmd
copy .env.example .env
```

Generate a random 48-byte hex secret for JWT:
```cmd
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Edit `.env` and set your credentials:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgres://uiu_admin:your_secure_password@127.0.0.1:5432/uiu_alumni
DATABASE_URL_TEST=postgres://uiu_admin:your_secure_password@127.0.0.1:5432/uiu_alumni_test
JWT_SECRET=your_generated_hex_secret
APP_BASE_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:5000
MAIL_MODE=log
```

### 4. Install Dependencies & Run Database Scripts
```cmd
npm install
npm run migrate
npm run seed
```

### 5. Start Application
```cmd
npm run dev
```
Open `http://localhost:5000` in your browser.

---

## 📧 Mailer Modes (`MAIL_MODE`)
- **`MAIL_MODE=log`** (Default for development): Outgoing emails (e.g. job applications, registration status notifications) are written directly as `.eml` files to `backend/dev-mails/`.
- **`MAIL_MODE=smtp`**: Sends real emails via standard SMTP server (e.g. Mailtrap or Gmail App Password). Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASS` in `.env`.

---

## 🧪 Running Tests & Database Scripts
- **Run Backend Suite**: `npm test`
- **Reset Database**: `npm run reset-db` (truncates tables and re-runs migrations and seeds)
- **Create Admin User**: `npm run create-admin`

---

## ❓ Common Errors & Troubleshooting
1. **Port 5000 in use (`EADDRINUSE`)**:
   Find the process using port 5000: `netstat -ano | findstr :5000` and kill it using `taskkill /F /PID <pid>`.
2. **`psql` is not recognized**:
   Add `C:\Program Files\PostgreSQL\<version>\bin` to your Windows System `PATH` Environment Variable.
3. **Database connection failed (`FATAL: password authentication failed`)**:
   Verify `DATABASE_URL` in `.env` matches your local PostgreSQL username, password, host, and database name.
