<?php
/**
 * MindVault API — Update Capture Endpoint
 * POST / PUT /api/captures/update.php
 *
 * Security: Enforces ownership by verifying both capture_id AND session user_id.
 * No user can ever update another user's capture.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

setup_api_headers();

$method = strtoupper($_SERVER['REQUEST_METHOD']);
if (!in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
    error_response('Method Not Allowed', 405);
}

$user = require_auth();
$userId = $user['id'];

$input = get_json_input();
$id = trim($input['id'] ?? '');

if ($id === '') {
    error_response('Capture ID is required for update.', 400);
}

$validation = validate_capture_fields($input);
if (!$validation['valid']) {
    error_response('Please correct the validation errors.', 422, $validation['errors']);
}

$data = $validation['cleaned'];
$pdo = get_db_connection();

try {
    // 1. Verify existence and ownership
    $checkStmt = $pdo->prepare('SELECT id, user_id, created_at FROM captures WHERE id = ? LIMIT 1');
    $checkStmt->execute([$id]);
    $existing = $checkStmt->fetch();

    if (!$existing) {
        error_response('Capture not found.', 404);
    }

    if ((int)$existing['user_id'] !== $userId) {
        // Forbidden: Attempting to update another user's capture
        error_response('You do not have permission to modify this capture.', 403);
    }

    // 2. Perform the update scoped strictly to user_id
    $updateStmt = $pdo->prepare(
        'UPDATE captures
         SET title = ?, content = ?, type = ?, url = ?, tags = ?, is_pinned = ?, is_archived = ?, updated_at = NOW()
         WHERE id = ? AND user_id = ?'
    );

    $tagsJson = json_encode($data['tags'], JSON_UNESCAPED_UNICODE);

    $updateStmt->execute([
        $data['title'],
        $data['content'],
        $data['type'],
        $data['url'] ?: null,
        $tagsJson,
        $data['is_pinned'],
        $data['is_archived'],
        $id,
        $userId
    ]);

    $updatedItem = [
        'id'         => $id,
        'title'      => $data['title'],
        'content'    => $data['content'],
        'type'       => $data['type'],
        'url'        => $data['url'],
        'tags'       => $data['tags'],
        'isPinned'   => (bool)$data['is_pinned'],
        'isArchived' => (bool)$data['is_archived'],
        'createdAt'  => date('c', strtotime($existing['created_at'])),
        'updatedAt'  => date('c')
    ];

    json_response([
        'success' => true,
        'message' => 'Capture updated successfully.',
        'item'    => $updatedItem
    ]);

} catch (Exception $e) {
    error_log('Failed to update capture: ' . $e->getMessage());
    error_response('Database error while updating capture.', 500);
}
