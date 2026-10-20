# MindVault Version 2 — Multi-User Cloud Knowledge Vault

MindVault is a minimal-premium personal knowledge vault and AI second brain. Version 2 upgrades the browser-based prototype to a secure, multi-user web application powered by **PHP 8** and **MySQL**, while preserving the clean frontend aesthetic (Warm Paper & Ink / Dark Obsidian) and offline-first guest experience.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MindVault Frontend (SPA)                     │
│   • HTML5 Semantic Structure    • Vanilla CSS Design System     │
│   • ES Modules: app.js, ui.js, items.js, search.js, insight.js  │
│   • api.js HTTP Client (Fetch + Credentials + CSRF Protection)  │
└───────────────────────────────┬─────────────────────────────────┘
                                │ JSON REST API (HttpOnly Cookies)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHP 8 Backend Core                           │
│   • api/auth/       -> register.php, login.php, logout.php, me  │
│   • api/captures/   -> index.php, create.php, update.php,       │
│                        delete.php, import.php                   │
│   • api/settings/   -> index.php (theme & daily insights)       │
│   • api/helpers/    -> auth.php, response.php, validator.php    │
│   • api/config/     -> database.php, config.php (Protected)     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ PDO (Prepared Statements, UTF-8)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MySQL 8.x Database                           │
│   • `users`         -> id, username, email, password_hash       │
│   • `captures`      -> id, user_id (FK), title, content, type,  │
│                        url, tags (JSON), is_pinned, is_archived │
│   • `user_settings` -> user_id (FK), theme, last_insight_date   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security Guarantees & Technical Principles

1. **Password Hashing with Bcrypt**:
   Passwords are never stored in plaintext. They are hashed using PHP's native `password_hash($password, PASSWORD_BCRYPT)`, which uses a secure random 22-character salt and adaptive cost factor. Verification is performed using timing-safe `password_verify()`.

2. **Session Security & Fixation Protection**:
   - `session_start_secure()` configures cookies with `HttpOnly = true` (inaccessible to JavaScript, defending against XSS cookie theft).
   - `SameSite = Lax` prevents cross-site request cookie leaking.
   - `session_regenerate_id(true)` is invoked upon every login to neutralize session fixation attacks.

3. **Strict Relational User Boundaries (Multi-Tenant Isolation)**:
   Every private database query derives `user_id` strictly from `$_SESSION['user_id']`. The client can never supply or tamper with the user ID. Even if a user guesses another user's capture ID, update and delete queries enforce `WHERE id = :id AND user_id = :session_user_id`, guaranteeing total privacy.

4. **100% Prepared Statements (Zero SQL Injection)**:
   All queries use PDO parameterized statements. Input is never directly concatenated into SQL strings.

5. **Cross-Site Request Forgery (CSRF) Tokens**:
   State-changing requests (`POST`, `PUT`, `DELETE`) require a valid `X-CSRF-Token` header matching the token generated in the active session.

6. **Defensive Graceful Fallback (Guest Mode)**:
   If the PHP backend is offline or the user is not signed in, MindVault functions seamlessly in **Guest Mode** using browser `localStorage`. When the user decides to create an account or sign in, MindVault prompts a one-click migration to copy local captures to their private cloud database.

---

## 🚀 Quick Start & Local Setup Guide

### Prerequisites
- **MySQL 8.0 or later** (or MariaDB 10.4+). *Note: On Windows, MySQL Server is typically already running as a Windows Service (`MySQL84` or `MySQL`).*
- **PHP 8.0 or later** with `pdo_mysql` and `mbstring` extensions enabled.
- A modern web browser (Chrome, Firefox, Edge, Safari).

---

### Step 1: Verify Git Branch
Ensure you are working on the safe feature branch:
```bash
git checkout feature/php-mysql-v2
```

---

### Step 2: Set Up the MySQL Database

1. Open your terminal, MySQL CLI, or GUI tool (MySQL Workbench, HeidiSQL, or phpMyAdmin).
2. Run the database schema script located at `database/schema.sql`:

**Via MySQL CLI (PowerShell / Command Prompt / Bash):**
```bash
mysql -u root -p < database/schema.sql
```
*(Enter your MySQL root password when prompted).*

This automatically creates:
- Database: `mindvault` (with `utf8mb4_unicode_ci` charset)
- Tables: `users`, `captures`, and `user_settings` with foreign keys and cascade rules.

---

### Step 3: Configure Database Credentials

1. In the `api/config/` folder, copy the example config file:
   ```bash
   cp api/config/config.example.php api/config/config.php
   ```
   *(On Windows Command Prompt: `copy api\config\config.example.php api\config\config.php`)*

2. Open `api/config/config.php` in your text editor:
   ```php
   return [
       'db' => [
           'host'     => '127.0.0.1',
           'port'     => 3306,
           'dbname'   => 'mindvault',
           'username' => 'root',     // Your local MySQL username
           'password' => 'YOUR_PASSWORD_HERE', // Your local MySQL password
           'charset'  => 'utf8mb4'
       ],
       ...
   ];
   ```
   > 🔒 **Security Notice**: `api/config/config.php` is listed in `.gitignore`. It will never be committed to Git.

---

### Step 4: Start the Local Development Server

Run PHP's built-in web server directly from the project root directory:

```bash
php -S localhost:8000
```

*(Alternatively, if you use XAMPP, place the `MindVault` folder inside your `xampp/htdocs/` folder and start Apache and MySQL from the XAMPP Control Panel).*

---

### Step 5: Open MindVault

Navigate in your web browser to:
```
http://localhost:8000
```

---

## 🧪 15-Point Testing Checklist

Use this checklist to verify all features and security controls:

- [ ] **1. User Registration**:
  Click **Sign In** in the top navigation -> click **Create Account**. Register with username `alice`, email `alice@example.com`, and password `password123`. Verify successful registration, welcome toast, and user badge `@alice` appearing in the top bar.

- [ ] **2. Duplicate Prevention**:
  Attempt to register again with username `alice` or email `alice@example.com`. Confirm error message: *"Username or email already in use."*

- [ ] **3. Password Policy Validation**:
  Attempt to register with a password shorter than 8 characters (e.g., `pass`). Confirm the rejection error.

- [ ] **4. Create Captures (All 4 Types)**:
  Click **+ Capture** (or press `Ctrl + K` / `Cmd + K`):
  - **Note**: Title: *"System Architecture"*, content: *"Microservices vs Monoliths"*, tags: `architecture, backend`.
  - **Idea**: Title: *"AI Voice Synthesizer"*, content: *"Record personalized audio summaries"*, tags: `ai, audio`.
  - **Link**: Title: *"PHP Documentation"*, URL: `https://www.php.net`, tags: `php, reference`.
  - **Snippet**: Title: *"PDO Connection"*, content: `new PDO($dsn, $user, $pass);`, tags: `php, sql`.
  Confirm all 4 appear on the Dashboard and in the Library.

- [ ] **5. Refresh Persistence**:
  Refresh the browser (`F5` or `Ctrl + R`). Confirm you remain signed in and all 4 captures load from MySQL.

- [ ] **6. Edit Capture**:
  Open the detail modal for any capture -> click **Edit**. Update the title or add a tag. Save and verify changes persist in the database.

- [ ] **7. Pin / Unpin Capture**:
  Click the pin icon on a card. Confirm amber pin badge appears, stat card increments, and the card moves to the top of the Library.

- [ ] **8. Archive / Restore**:
  Click the archive icon. Switch Library filter from **Active** to **Archived**. Verify it appears under Archived and disappears from Active. Click Restore to return it.

- [ ] **9. Delete Capture**:
  Open detail view -> click **Delete** -> confirm in modal. Verify capture is permanently deleted from MySQL.

- [ ] **10. Smart Search**:
  In Library search, type `type:snippet` or `#php`. Confirm instant filtering with highlighted matching keywords.

- [ ] **11. Ask MindVault (Grounded Q&A)**:
  Navigate to **Ask MindVault**. Search for *"architecture"*. Verify answer synthesizes citations and cites your saved notes without hallucinating facts.

- [ ] **12. Multi-User Isolation Test (Critical)**:
  - Open a new **Private / Incognito Window** and navigate to `http://localhost:8000`.
  - Register as user `bob` (`bob@example.com`).
  - Verify Bob's vault is empty and Bob **cannot** see any of Alice's notes.
  - Create a note as Bob. Confirm Alice cannot see Bob's note.

- [ ] **13. Local-to-Cloud Migration**:
  In an incognito window without signing in (Guest mode), create 2 local notes. Now click **Sign In** and log in as Alice. MindVault detects the local notes and presents the **Sync Local Notes to Cloud?** dialog. Click **Import to Cloud** and verify notes are safely imported into MySQL.

- [ ] **14. JSON Backup Export & Import**:
  Open Vault Settings (gear icon) -> click **Export Vault as JSON**. Confirm valid `.json` download. Click **Import JSON Backup** to verify seamless migration.

- [ ] **15. Sign Out**:
  Click **Sign Out** in the header. Confirm session is destroyed, cookies expired, and MindVault safely returns to Guest Mode.

---

## 📁 Repository Structure

```
MindVault/
├── .gitignore                      # Protects config.php, .env, and logs
├── index.html                      # Single-page application shell & modals
├── package.json                    # Project metadata & npm scripts
├── README.md                       # Complete documentation & test guide
├── css/
│   └── style.css                   # Responsive Warm Paper & Dark Obsidian styles
├── js/
│   ├── api.js                      # Authenticated Fetch client with CSRF & session handling
│   ├── app.js                      # Application controller & view router
│   ├── items.js                    # Model validation, filters, stats, related notes
│   ├── storage.js                  # Defensive localStorage helper (Guest fallback)
│   ├── search.js                   # Keyword & Smart rule search engine
│   ├── insight.js                  # Daily Rediscovery deterministic connection engine
│   ├── ask.js                      # Grounded retrieval Q&A with citations
│   ├── ui.js                       # Accessible DOM card components, toasts, modal manager
│   └── aiAdapter.js                # Modular client adapter for future AI integrations
├── database/
│   └── schema.sql                  # MySQL 8 schema (users, captures, user_settings)
└── api/
    ├── config/
    │   ├── config.example.php      # Safe configuration template
    │   └── database.php            # Singleton PDO connection manager
    ├── helpers/
    │   ├── response.php            # JSON response & CORS helper
    │   ├── auth.php                # Session security, Bcrypt, HttpOnly cookies, CSRF
    │   └── validator.php           # Sanitization and input validation
    ├── auth/
    │   ├── register.php            # Account creation endpoint
    │   ├── login.php               # Login & session initiation endpoint
    │   ├── logout.php              # Session destruction endpoint
    │   └── me.php                  # Active session & profile endpoint
    ├── captures/
    │   ├── index.php               # GET user captures
    │   ├── create.php              # POST new capture
    │   ├── update.php              # POST/PUT update capture
    │   ├── delete.php              # POST/DELETE capture
    │   └── import.php              # POST JSON migration endpoint
    └── settings/
        └── index.php               # GET/POST user theme and insight settings
```

---

## 🚢 Deployment to Production Web Hosts

To deploy MindVault to a PHP/MySQL web host (such as cPanel, SiteGround, DigitalOcean, Linode, AWS, or similar):

1. Upload all files into your web root (e.g., `public_html/`).
2. Create a MySQL database and user via your hosting control panel.
3. Import `database/schema.sql` into your remote database via phpMyAdmin or MySQL CLI.
4. Create `api/config/config.php` on the server with your production database credentials.
5. In `api/config/config.php`, set:
   ```php
   'session' => [
       'secure' => true, // Enforces HTTPS-only cookies
       'samesite' => 'Lax'
   ]
   ```
6. Ensure your domain has an SSL certificate enabled (HTTPS).
