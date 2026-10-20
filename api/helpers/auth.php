<?php
/**
 * MindVault Authentication & Session Helper
 * Enforces server-side session authentication, HttpOnly cookie security,
 * session ID regeneration, and per-user authorization boundaries.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/response.php';

function session_start_secure(): void {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $config = get_config();
    $sessionConfig = $config['session'] ?? [];

    $isHttps = (
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ||
        (!empty($sessionConfig['secure']))
    );

    session_name($sessionConfig['name'] ?? 'mindvault_session');

    session_set_cookie_params([
        'lifetime' => $sessionConfig['lifetime'] ?? (86400 * 7),
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => $sessionConfig['samesite'] ?? 'Lax'
    ]);

    session_start();
}

function get_auth_user(): ?array {
    session_start_secure();
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    return [
        'id'       => (int)$_SESSION['user_id'],
        'username' => $_SESSION['username'] ?? '',
        'email'    => $_SESSION['email'] ?? ''
    ];
}

function get_auth_user_id(): int {
    $user = get_auth_user();
    if (!$user) {
        error_response('Authentication required. Please sign in.', 401);
    }
    return $user['id'];
}

function require_auth(): array {
    $user = get_auth_user();
    if (!$user) {
        error_response('Authentication required. Please sign in.', 401);
    }
    return $user;
}

function login_user(array $user): void {
    session_start_secure();

    // Prevent session fixation attacks by regenerating ID
    session_regenerate_id(true);

    $_SESSION['user_id']    = (int)$user['id'];
    $_SESSION['username']   = $user['username'];
    $_SESSION['email']      = $user['email'];
    $_SESSION['logged_in_at'] = time();

    // Generate fresh CSRF token for subsequent state-changing requests
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
}

function logout_user(): void {
    session_start_secure();
    $_SESSION = [];

    // Expire the session cookie in browser
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params["path"],
            $params["domain"],
            $params["secure"],
            $params["httponly"]
        );
    }

    session_destroy();
}

function get_csrf_token(): string {
    session_start_secure();
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}


function verify_csrf_token(): void {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if (!in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
        return;
    }

    // Ensure the session is active before reading its token.
    session_start_secure();

    $headerToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $input = get_json_input();
    $bodyToken = $input['csrf_token'] ?? ($_POST['csrf_token'] ?? '');
    $provided = (string) ($headerToken ?: $bodyToken);
    $sessionToken = (string) ($_SESSION['csrf_token'] ?? '');

    // Reject requests if the token is absent or does not match.
    if (
        $sessionToken === '' ||
        $provided === '' ||
        !hash_equals($sessionToken, $provided)
    ) {
        error_response(
            'Invalid or missing security token (CSRF). Please refresh and try again.',
            403
        );
    }
}
