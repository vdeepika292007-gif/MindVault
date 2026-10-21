# MindVault Version 2 — Personal Knowledge Vault

MindVault is a web-based personal knowledge management application designed to help users organize, store, edit, and manage their notes in one place.

Version 2 extends the original browser-based prototype with a PHP backend, a MySQL database, user authentication, and persistent storage. The project focuses on a clean interface, organized knowledge capture, and secure handling of user data.

## ✨ Core Features

- User registration and login
- Create, view, edit, and delete notes
- Persistent note storage using MySQL
- User-specific note access
- Session-based authentication
- Theme settings that persist after refresh
- Server-side input validation
- Database operations using PDO prepared statements
- CSRF protection for supported state-changing requests
- Guest and browser-based storage functionality, where supported by the application

## 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling and responsive interface |
| JavaScript | Frontend interactions and API requests |
| PHP 8+ | Backend logic and REST API |
| MySQL 8+ | Persistent relational storage |
| PDO | Database connectivity |
| Git and GitHub | Version control and project hosting |

## 🏗️ Architecture

MindVault follows a frontend–backend–database architecture.

1. **Frontend:** HTML, CSS, and JavaScript provide the user interface.
2. **Backend:** PHP endpoints handle authentication, notes, and settings.
3. **Database:** MySQL stores user accounts, notes, and user settings.
4. **Communication:** The frontend communicates with the backend through HTTP requests and JSON responses.

## 📂 Project Structure

```text
MindVault/
├── api/
│   ├── auth/
│   │   ├── login.php
│   │   ├── logout.php
│   │   ├── me.php
│   │   └── register.php
│   ├── captures/
│   │   ├── index.php
│   │   ├── create.php
│   │   ├── update.php
│   │   ├── delete.php
│   │   └── import.php
│   ├── config/
│   │   ├── config.example.php
│   │   └── database.php
│   ├── helpers/
│   │   ├── auth.php
│   │   ├── response.php
│   │   └── validator.php
│   └── settings/
│       └── index.php
├── css/
│   └── style.css
├── js/
│   ├── api.js
│   └── app.js
├── index.html
├── package.json
└── README.md
```

*This tree highlights the main files reviewed during development. Additional files may exist in the project.*

## 🚀 Local Setup

### Prerequisites

- PHP 8 or later
- MySQL 8 or later
- PHP `pdo_mysql` and `mbstring` extensions
- A modern web browser

### 1. Clone or open the project

Open the MindVault project folder in your code editor or terminal.

### 2. Configure the database

Ensure the MySQL server is running and that the `mindvault` database and required tables have been created.

If your repository includes a database schema file, use that file to initialize a fresh database.

### 3. Configure database credentials

Create the local configuration file using the example template if needed:

```powershell
Copy-Item api/config/config.example.php api/config/config.php
```

Update `api/config/config.php` with your local database settings. For this development setup, the database connection uses port `3307` and the dedicated `mindvault_app` account.

**Important:** Use your own locally configured password. Never put real credentials in this README or commit the private configuration file.

The actual configuration file is excluded through `.gitignore`.

### 4. Start the PHP development server

From the MindVault project root, run:

```powershell
php -S 127.0.0.1:8000
```

If PHP is not available in your system PATH, use the PHP executable installed on your computer.

Keep the terminal running while using the application.

### 5. Open MindVault

Visit:

http://127.0.0.1:8000

## 🔐 Security Design

MindVault includes several security-related controls:

- **Password hashing:** PHP password-hashing functions are used to protect stored passwords.
- **Session management:** Authentication uses server-side sessions and secure cookie options.
- **Session ID regeneration:** Session identifiers are regenerated during login to help prevent session fixation.
- **User authorization:** Private note operations are scoped to the authenticated user.
- **Prepared statements:** PDO parameterized queries are used for database operations.
- **CSRF protection:** Supported state-changing requests validate a session-associated security token.
- **Input validation:** Server-side validation helps reject invalid request data.
- **Configuration protection:** The local database configuration is excluded from Git.

These controls improve security, but they do not constitute a guarantee that the application is free from vulnerabilities. A complete independent security audit and production testing have not been established by the development checks described below.

## 🧪 Development Testing

The following checks were performed during development:

- PHP syntax checks across the API files
- Login and logout behavior
- Note creation, editing, and deletion
- Note persistence after refreshing the browser
- Settings persistence after refreshing the browser
- Restriction of note access while logged out
- Git whitespace checks
- Verification that the private database configuration is ignored by Git

Additional tests are recommended for account registration, duplicate accounts, multi-user isolation, invalid requests, guest-data migration, backup import/export, and production security.

## 🛡️ Deployment Considerations

Before deploying MindVault to a public server:

1. Use HTTPS.
2. Configure a dedicated database account with only the permissions the application needs.
3. Store credentials outside the public repository.
4. Review session cookie settings for production.
5. Disable detailed error output to users.
6. Test authorization boundaries using multiple accounts.
7. Review CSRF handling, input validation, rate limiting, and error responses.
8. Back up the database and test recovery procedures.

The PHP built-in development server is intended for local development, not public production hosting.

## 📌 Project Status

MindVault's core note-management workflows have been exercised locally, and the PHP API files passed syntax checks during development.

Further testing, documentation verification, and a comprehensive security review are recommended before describing the application as production-ready.

## 🎯 Learning Objectives

This project provides practical experience with:

- Full-stack web application development
- PHP backend programming
- Relational database design and MySQL
- REST API communication
- Authentication and authorization
- Session and CSRF security concepts
- Frontend–backend integration
- Git-based version control

## 👩‍💻 Author

Developed as a learning project to explore web development, database integration, and application security.