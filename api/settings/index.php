<?php
/**
 * MindVault API — User Settings Endpoint
 * GET  /api/settings/index.php -> Retrieve current user's settings
 * POST /api/settings/index.php -> Update user settings (theme, last_insight_date)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

setup_api_headers();

$user = require_auth();
$userId = $user['id'];
$pdo = get_db_connection();

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET') {
    try {
        $stmt = $pdo->prepare('SELECT theme, last_insight_date FROM user_settings WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $settings = $stmt->fetch();

        if (!$settings) {
            $settings = [
                'theme'             => 'light',
                'last_insight_date' => null
            ];
        }

        json_response([
            'success'  => true,
            'settings' => $settings
        ]);
    } catch (Exception $e) {
        error_log('Failed to fetch user settings: ' . $e->getMessage());
        error_response('Failed to retrieve settings.', 500);
    }
}

if ($method === 'POST' || $method === 'PUT') {
    verify_csrf_token();

    $input = get_json_input();
    $theme = isset($input['theme']) ? trim((string)$input['theme']) : null;
    $lastInsightDate = isset($input['last_insight_date']) ? trim((string)$input['last_insight_date']) : null;

    // Validate theme if provided
    $allowedThemes = ['light', 'dark'];
    if ($theme !== null && !in_array($theme, $allowedThemes, true)) {
        error_response('Invalid theme value. Allowed: light, dark.', 422);
    }

    // Validate last_insight_date format if provided (YYYY-MM-DD or null/empty)
    if ($lastInsightDate !== null && $lastInsightDate !== '') {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $lastInsightDate)) {
            error_response('Invalid date format for last_insight_date (expected YYYY-MM-DD).', 422);
        }
    } else {
        $lastInsightDate = null;
    }

    try {
        // Fetch current settings to preserve values not passed
        $stmt = $pdo->prepare('SELECT theme, last_insight_date FROM user_settings WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $existing = $stmt->fetch();

        $newTheme = $theme ?? ($existing['theme'] ?? 'light');
        $newDate = $lastInsightDate !== null ? $lastInsightDate : ($existing['last_insight_date'] ?? null);

        $upsert = $pdo->prepare(
            'INSERT INTO user_settings (user_id, theme, last_insight_date)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                theme = VALUES(theme), 
                last_insight_date = VALUES(last_insight_date)'
        );
        $upsert->execute([$userId, $newTheme, $newDate]);

        json_response([
            'success'  => true,
            'message'  => 'Settings updated successfully.',
            'settings' => [
                'theme'             => $newTheme,
                'last_insight_date' => $newDate
            ]
        ]);
    } catch (Exception $e) {
        error_log('Failed to update user settings: ' . $e->getMessage());
        error_response('Failed to save settings.', 500);
    }
}

error_response('Method Not Allowed', 405);
