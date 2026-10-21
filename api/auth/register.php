<?php
/**
 * MindVault API — User Registration Endpoint
 * POST /api/auth/register.php
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

setup_api_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_response('Method Not Allowed', 405);
}

$input = get_json_input();
$username = trim($input['username'] ?? '');
$email    = trim($input['email'] ?? '');
$password = (string)($input['password'] ?? '');

$errors = [];
if ($err = validate_username($username)) {
    $errors['username'] = $err;
}
if ($err = validate_email($email)) {
    $errors['email'] = $err;
}
if ($err = validate_password($password)) {
    $errors['password'] = $err;
}

if (!empty($errors)) {
    error_response('Please correct the validation errors.', 422, $errors);
}

$pdo = get_db_connection();

// Check for duplicate username or email
$stmt = $pdo->prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1');
$stmt->execute([$username, $email]);
$existing = $stmt->fetch();

if ($existing) {
    if (strcasecmp($existing['username'], $username) === 0) {
        $errors['username'] = 'This username is already taken. Please choose another.';
    }
    if (strcasecmp($existing['email'], $email) === 0) {
        $errors['email'] = 'An account with this email address already exists.';
    }
    error_response('Account with these details already exists.', 409, $errors);
}

// Securely hash password using modern standard (Bcrypt/Argon2 depending on PHP environment)
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

try {
    $pdo->beginTransaction();

    $insert = $pdo->prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    $insert->execute([$username, $email, $passwordHash]);
    $userId = (int)$pdo->lastInsertId();

    // Create default user settings
    $settingsStmt = $pdo->prepare('INSERT INTO user_settings (user_id, theme) VALUES (?, ?)');
    $settingsStmt->execute([$userId, 'light']);

    $pdo->commit();

    $user = [
        'id'       => $userId,
        'username' => $username,
        'email'    => $email
    ];

    // Automatically authenticate the new user session
    login_user($user);

    json_response([
        'success'    => true,
        'message'    => 'Account created successfully! Welcome to MindVault.',
        'user'       => $user,
        'csrf_token' => get_csrf_token()
    ], 201);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Registration error: ' . $e->getMessage());
    error_response('Failed to create account due to a database error. Please try again later.', 500);
}
