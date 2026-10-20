<?php
/**
 * MindVault API — JSON Backup Import / Migration Endpoint
 * POST /api/captures/import.php
 *
 * Security: Assigns ALL imported captures strictly to currently authenticated user session.
 * Never trusts any external ownership IDs inside the uploaded file.
 * Avoids silent duplicate creation and validates every capture record.
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
if (empty($input)) {
    error_response('Invalid or empty JSON payload submitted.', 400);
}

// 1. Structure validation
if (!isset($input['items']) || !is_array($input['items'])) {
    error_response('Import file must contain a valid "items" array.', 422);
}

$schemaVersion = $input['schemaVersion'] ?? 1;
if ((int)$schemaVersion !== 1) {
    error_response("Unsupported backup schema version ($schemaVersion). Version 1 is supported.", 422);
}

$rawItems = $input['items'];
if (count($rawItems) === 0) {
    error_response('No captures found in the provided backup file.', 422);
}

if (count($rawItems) > 1000) {
    error_response('Import exceeds maximum allowable batch size of 1,000 captures.', 413);
}

$pdo = get_db_connection();

try {
    // Fetch user's existing captures to check for duplicates by (title, content) or existing ID
    $existingStmt = $pdo->prepare('SELECT id, title, content FROM captures WHERE user_id = ?');
    $existingStmt->execute([$userId]);
    $existingRows = $existingStmt->fetchAll();

    $existingIds = [];
    $existingHashes = [];

    foreach ($existingRows as $row) {
        $existingIds[$row['id']] = true;
        // Hash title + content to detect duplicate captures
        $hash = md5(trim($row['title']) . '||' . trim($row['content']));
        $existingHashes[$hash] = true;
    }

    $importedCount = 0;
    $skippedDuplicates = 0;
    $validationErrors = 0;

    $insertStmt = $pdo->prepare(
        'INSERT INTO captures (id, user_id, title, content, type, url, tags, is_pinned, is_archived, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $pdo->beginTransaction();

    foreach ($rawItems as $index => $raw) {
        if (!is_array($raw)) {
            $validationErrors++;
            continue;
        }

        $val = validate_capture_fields($raw);
        if (!$val['valid']) {
            $validationErrors++;
            continue;
        }

        $cleaned = $val['cleaned'];
        $contentHash = md5($cleaned['title'] . '||' . $cleaned['content']);

        // Check for duplicate content
        if (isset($existingHashes[$contentHash])) {
            $skippedDuplicates++;
            continue;
        }

        // Determine ID: if original ID collision exists, generate fresh UUID
        $rawId = trim((string)($raw['id'] ?? ''));
        $targetId = ($rawId !== '' && !isset($existingIds[$rawId]) && strlen($rawId) <= 64)
            ? $rawId
            : ('mv_' . bin2hex(random_bytes(16)));

        $createdAt = (!empty($raw['createdAt']) && strtotime($raw['createdAt']))
            ? date('Y-m-d H:i:s', strtotime($raw['createdAt']))
            : date('Y-m-d H:i:s');

        $updatedAt = (!empty($raw['updatedAt']) && strtotime($raw['updatedAt']))
            ? date('Y-m-d H:i:s', strtotime($raw['updatedAt']))
            : $createdAt;

        $tagsJson = json_encode($cleaned['tags'], JSON_UNESCAPED_UNICODE);

        $insertStmt->execute([
            $targetId,
            $userId,
            $cleaned['title'],
            $cleaned['content'],
            $cleaned['type'],
            $cleaned['url'] ?: null,
            $tagsJson,
            $cleaned['is_pinned'],
            $cleaned['is_archived'],
            $createdAt,
            $updatedAt
        ]);

        $existingIds[$targetId] = true;
        $existingHashes[$contentHash] = true;
        $importedCount++;
    }

    $pdo->commit();

    json_response([
        'success'           => true,
        'message'           => "Migration complete: $importedCount captures imported successfully.",
        'imported_count'    => $importedCount,
        'skipped_duplicates'=> $skippedDuplicates,
        'validation_errors' => $validationErrors,
        'total_evaluated'   => count($rawItems)
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Import error: ' . $e->getMessage());
    error_response('Database error during capture migration.', 500);
}
