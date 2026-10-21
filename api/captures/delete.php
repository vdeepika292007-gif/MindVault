<?php
/**
 * MindVault API — Delete Capture Endpoint
 * POST / DELETE /api/captures/delete.php
 *
 * Security: Enforces ownership by verifying both capture_id AND session user_id.
 * No user can delete another user's capture.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

setup_api_headers();

$method = strtoupper($_SERVER['REQUEST_METHOD']);
if (!in_array($method, ['POST', 'DELETE'], true)) {
    error_response('Method Not Allowed', 405);
}

$user = require_auth();
verify_csrf_token();
$userId = $user['id'];

$input = get_json_input();
$id = trim($input['id'] ?? ($_GET['id'] ?? ''));

if ($id === '') {
    error_response('Capture ID is required for deletion.', 400);
}

$pdo = get_db_connection();

try {
    // 1. Verify existence and ownership
    $checkStmt = $pdo->prepare('SELECT id, user_id, title FROM captures WHERE id = ? LIMIT 1');
    $checkStmt->execute([$id]);
    $existing = $checkStmt->fetch();

    if (!$existing) {
        error_response('Capture not found.', 404);
    }

    if ((int)$existing['user_id'] !== $userId) {
        // Forbidden: Attempting to delete another user's record
        error_response('You do not have permission to delete this capture.', 403);
    }

    // 2. Delete scoped strictly to user_id
    $delStmt = $pdo->prepare('DELETE FROM captures WHERE id = ? AND user_id = ?');
    $delStmt->execute([$id, $userId]);

    json_response([
        'success' => true,
        'message' => 'Capture deleted successfully.',
        'id'      => $id
    ]);

} catch (Exception $e) {
    error_log('Failed to delete capture: ' . $e->getMessage());
    error_response('Database error while deleting capture.', 500);
}
