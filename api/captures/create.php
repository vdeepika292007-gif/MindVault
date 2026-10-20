<?php
/**
 * MindVault API — Create Capture Endpoint
 * POST /api/captures/create.php
 *
 * Security: Assigns capture strictly to authenticated user_id from session.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

setup_api_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_response('Method Not Allowed', 405);
}

$user = require_auth();
$userId = $user['id'];

$input = get_json_input();
$validation = validate_capture_fields($input);

if (!$validation['valid']) {
    error_response('Please correct the validation errors.', 422, $validation['errors']);
}

$data = $validation['cleaned'];

// Generate ID or preserve client-generated UUID
$id = trim($input['id'] ?? '');
if ($id === '' || strlen($id) > 64) {
    $id = 'mv_' . bin2hex(random_bytes(16));
}

$pdo = get_db_connection();

try {
    $stmt = $pdo->prepare(
        'INSERT INTO captures (id, user_id, title, content, type, url, tags, is_pinned, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())'
    );

    $tagsJson = json_encode($data['tags'], JSON_UNESCAPED_UNICODE);

    $stmt->execute([
        $id,
        $userId,
        $data['title'],
        $data['content'],
        $data['type'],
        $data['url'] ?: null,
        $tagsJson,
        $data['is_pinned'],
        $data['is_archived']
    ]);

    $nowIso = date('c');

    $newItem = [
        'id'         => $id,
        'title'      => $data['title'],
        'content'    => $data['content'],
        'type'       => $data['type'],
        'url'        => $data['url'],
        'tags'       => $data['tags'],
        'isPinned'   => (bool)$data['is_pinned'],
        'isArchived' => (bool)$data['is_archived'],
        'createdAt'  => $nowIso,
        'updatedAt'  => $nowIso
    ];

    json_response([
        'success' => true,
        'message' => 'Capture saved to your vault.',
        'item'    => $newItem
    ], 201);

} catch (Exception $e) {
    error_log('Failed to create capture: ' . $e->getMessage());
    error_response('Database error while saving capture.', 500);
}
