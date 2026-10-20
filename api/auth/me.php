<?php
/**
 * MindVault API — Current Session Profile Endpoint
 * GET /api/auth/me.php
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

setup_api_headers();

$user = get_auth_user();

if (!$user) {
    json_response([
        'success'       => true,
        'authenticated' => false,
        'user'          => null,
        'settings'      => null
    ]);
}

$pdo = get_db_connection();

// Fetch user settings
$stmt = $pdo->prepare('SELECT theme, last_insight_date FROM user_settings WHERE user_id = ? LIMIT 1');
$stmt->execute([$user['id']]);
$settings = $stmt->fetch() ?: ['theme' => 'light', 'last_insight_date' => null];

json_response([
    'success'       => true,
    'authenticated' => true,
    'user'          => $user,
    'settings'      => $settings,
    'csrf_token'    => get_csrf_token()
]);
