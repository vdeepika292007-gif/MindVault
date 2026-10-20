<?php
/**
 * MindVault API — List User Captures
 * GET /api/captures/index.php
 *
 * Security: Only returns captures belonging to the authenticated session's user_id.
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth.php';

setup_api_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    error_response('Method Not Allowed', 405);
}

// Require authenticated session
$user = require_auth();
$userId = $user['id'];

$pdo = get_db_connection();

try {
    $stmt = $pdo->prepare(
        'SELECT id, title, content, type, url, tags, is_pinned, is_archived, created_at, updated_at
         FROM captures
         WHERE user_id = ?
         ORDER BY is_pinned DESC, updated_at DESC'
    );
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $items = [];
    foreach ($rows as $row) {
        $tags = [];
        if (!empty($row['tags'])) {
            $decoded = json_decode($row['tags'], true);
            $tags = is_array($decoded) ? $decoded : [];
        }

        $items[] = [
            'id'         => $row['id'],
            'title'      => $row['title'],
            'content'    => $row['content'],
            'type'       => $row['type'],
            'url'        => $row['url'] ?? '',
            'tags'       => $tags,
            'isPinned'   => (bool)$row['is_pinned'],
            'isArchived' => (bool)$row['is_archived'],
            'createdAt'  => date('c', strtotime($row['created_at'])),
            'updatedAt'  => date('c', strtotime($row['updated_at']))
        ];
    }

    json_response([
        'success' => true,
        'count'   => count($items),
        'items'   => $items
    ]);

} catch (Exception $e) {
    error_log('Failed to fetch user captures: ' . $e->getMessage());
    error_response('An error occurred while retrieving your captures.', 500);
}
