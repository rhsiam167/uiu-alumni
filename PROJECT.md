# UIU Alumni Portal — Technical & Architectural Documentation

## 1. Project Overview
The **UIU Alumni Portal** is a web-based community platform built for **United International University (UIU), Bangladesh**. It connects alumni, current students, and administrators to facilitate networking, 1-to-1 mentorship, career opportunities (jobs & internships), university events, direct messaging, and financial contributions.

---

## 2. Technology Stack & Project Structure

- **Backend**: Node.js, Express, PostgreSQL (`pg` pool, Knex migrations), Zod validation, JWT in HttpOnly cookies, Multer (PDF uploads), Nodemailer (`MAIL_MODE=log` or `smtp`).
- **Frontend**: Standard HTML5, Vanilla CSS, ES Modules JavaScript (`apiClient`, `auth.js`, `utils.js`).
- **Testing**: Vitest + Supertest for backend unit/integration tests (`npm test`).

```
uiu-alumni/
├── backend/
│   ├── src/
│   │   ├── app.js               # Express application setup, security middleware, static frontend
│   │   ├── server.js            # Server entrypoint (Port 5000)
│   │   ├── config/              # Env configuration (dotenv, Zod)
│   │   ├── db/                  # PostgreSQL connection pool & Knex migrations
│   │   ├── middleware/          # Auth, CORS, CSP, origin check, Zod validation, error handler
│   │   ├── modules/             # Auth, Users, Mentorship, Jobs, Events, Donations, Chat, Admin
│   │   └── utils/               # ApiError, CSV exporter, schema helpers
│   ├── tests/                   # Vitest unit & integration test suites
│   ├── scripts/                 # Seed database, create admin script
│   └── README.md                # Backend setup & deployment guide
├── frontend/                    # Web application frontend served by Express at http://localhost:5000
│   ├── index.html               # Public landing page
│   ├── css/                     # Main CSS & design tokens
│   ├── js/                      # Core JS modules (client.js, auth.js, utils.js)
│   └── pages/                   # Page components (login, register, dashboard, jobs, events, admin, etc.)
├── docs/
│   ├── API-CONTRACT.md          # Complete REST API specification
│   └── DESIGN-SYSTEM.md         # UI component & style guide
├── start.bat                    # One-click startup script for Windows
└── PROJECT.md                   # This project overview document
```

---

## 3. How to Run the Application

1. **Install Prerequisites**: Node.js 20+ and PostgreSQL 14+.
2. **Configure Database & Environment**:
   - Create PostgreSQL databases `uiu_alumni` and `uiu_alumni_test`.
   - Copy `backend/.env.example` to `backend/.env` and update credentials.
3. **Run Migrations and Seed**:
   ```cmd
   cd backend
   npm install
   npm run migrate
   npm run seed
   ```
4. **Launch Application**:
   Run `start.bat` from root or `npm run dev` inside `backend`.
   Open `http://localhost:5000` in your browser.

---

## 4. Test Accounts & Pre-populated Data

All test accounts use password: **`Test@1234`**

| Role | Email | Details |
|---|---|---|
| **Admin** | `admin@uiu.test` | System Administrator |
| **Alumni** | `alumni@uiu.test` | Anik Rahman (Senior Software Engineer) |
| **Student** | `student@uiu.test` | Sadman Malik (CSE Undergrad) |

---

## 5. Security & Architectural Principles

1. **Cookie-based Authentication**: JWT tokens are stored in HttpOnly, SameSite=Lax cookies (`token`). No token is stored in `localStorage` or transmitted in headers.
2. **Strict CSP & Content Isolation**: Helmet enforces strict Content Security Policy (`script-src 'self'`). All dynamic data in innerHTML is escaped with `escapeHtml()`, and URLs are validated with `safeUrl()`.
3. **Parameterized Database Queries**: Every database query uses standard SQL parameterized placeholders (`$1, $2`) through `pg` pool to prevent SQL injection.
4. **Role-based Access Control (RBAC)**: Enforced on all protected endpoints (`requireAuth`, `requireRole`). Suspended or rejected accounts are blocked on every API request.
