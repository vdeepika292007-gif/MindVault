<?php
/**
 * MindVault API — User Authentication / Login Endpoint
 * POST /api/auth/login.php
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

setup_api_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_response('Method Not Allowed', 405);
}

$input = get_json_input();
$identifier = trim($input['identifier'] ?? ($input['username'] ?? ($input['email'] ?? '')));
$password   = (string)($input['password'] ?? '');

$errors = [];
if ($identifier === '') {
    $errors['identifier'] = 'Username or email is required.';
}
if ($password === '') {
    $errors['password'] = 'Password is required.';
}

if (!empty($errors)) {
    error_response('Please provide your login credentials.', 422, $errors);
}

$pdo = get_db_connection();

// Prepared lookup by either username or email
$stmt = $pdo->prepare('SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ? LIMIT 1');
$stmt->execute([$identifier, $identifier]);
$userRecord = $stmt->fetch();

if (!$userRecord || !password_verify($password, $userRecord['password_hash'])) {
    // Intentionally generic response to prevent username enumeration attacks
    error_response('Invalid username/email or password. Please try again.', 401);
}

// Check if password hash algorithm needs an upgrade (e.g. if PHP upgraded defaults)
if (password_needs_rehash($userRecord['password_hash'], PASSWORD_DEFAULT)) {
    $newHash = password_hash($password, PASSWORD_DEFAULT);
    $updateStmt = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $updateStmt->execute([$newHash, $userRecord['id']]);
}

$user = [
    'id'       => (int)$userRecord['id'],
    'username' => $userRecord['username'],
    'email'    => $userRecord['email']
];

// Establish authenticated session with ID regeneration and HttpOnly cookie
login_user($user);

json_response([
    'success'    => true,
    'message'    => "Welcome back, {$user['username']}!",
    'user'       => $user,
    'csrf_token' => get_csrf_token()
]);
