<?php
/**
 * MindVault Version 2 — Configuration Template (Safe Example)
 *
 * HOW TO USE:
 * 1. Copy this file and rename it to 'config.php' in the same directory:
 *    cp config.example.php config.php
 * 2. Update the DB_USER and DB_PASS to match your local MySQL installation.
 * 3. Never commit 'config.php' to Git! (It is protected in .gitignore).
 */

return [
    'db' => [
        'host'     => '127.0.0.1',
        'port'     => 3307,
        'dbname'   => 'mindvault',
        'username' => 'mindvault_app',
        'password' => '', // Set your local MySQL root password here
        'charset'  => 'utf8mb4'
    ],
    'session' => [
        'name'     => 'mindvault_session',
        'lifetime' => 60 * 60 * 24 * 7, // 7 days
        'secure'   => false, // Set to true on HTTPS production servers
        'httponly' => true,
        'samesite' => 'Lax'
    ],
    'cors' => [
        // Allow same-origin by default; add domain if frontend runs on a separate port during dev
        'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8000', 'http://localhost']
    ]
];
