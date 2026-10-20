<?php
/**
 * MindVault API — User Logout Endpoint
 * POST /api/auth/logout.php
 */

require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

setup_api_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_response('Method Not Allowed', 405);
}

// Require an authenticated session before logging out.
require_auth();

// Verify the CSRF token before destroying the session.
verify_csrf_token();

// Destroy session and expire session cookie.
logout_user();

json_response([
    'success' => true,
    'message' => 'You have been successfully signed out.'
]);
