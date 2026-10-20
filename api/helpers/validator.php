<?php
/**
 * MindVault Validation & Normalization Helper
 * Validates account credentials, capture fields, and URLs.
 */

function validate_username(string $username): ?string {
    $trimmed = trim($username);
    if ($trimmed === '') {
        return 'Username is required.';
    }
    if (strlen($trimmed) < 3 || strlen($trimmed) > 50) {
        return 'Username must be between 3 and 50 characters.';
    }
    if (!preg_match('/^[a-zA-Z0-9_\-\.]+$/', $trimmed)) {
        return 'Username may only contain letters, numbers, dots, underscores, and hyphens.';
    }
    return null;
}

function validate_email(string $email): ?string {
    $trimmed = trim($email);
    if ($trimmed === '') {
        return 'Email address is required.';
    }
    if (!filter_var($trimmed, FILTER_VALIDATE_EMAIL)) {
        return 'Please enter a valid email address.';
    }
    if (strlen($trimmed) > 255) {
        return 'Email address is too long.';
    }
    return null;
}

/**
 * Validates account password for registration.
 *
 * DEVELOPMENT-ONLY POLICY:
 * For local testing convenience, simple passwords of 4 or more characters (e.g. 4–8
 * characters without requiring symbols, uppercase letters, or numbers) are permitted.
 *
 * SECURITY WARNING:
 * This relaxed minimum length policy is strictly for local development and unit testing.
 * In any production or public deployment, enforce a minimum of 8–12 characters with
 * appropriate entropy/complexity requirements.
 */
function validate_password(string $password): ?string {
    // Development-only relaxed length rule (allows simple 4-8 char passwords for testing)
    if (strlen($password) < 4) {
        return 'Password must be at least 4 characters long (development mode).';
    }
    if (strlen($password) > 200) {
        return 'Password is too long (maximum 200 characters).';
    }
    return null;
}

function normalize_tags(mixed $tags): array {
    if (is_string($tags)) {
        // Try decoding if JSON string
        $decoded = json_decode($tags, true);
        if (is_array($decoded)) {
            $tags = $decoded;
        } else {
            $tags = preg_split('/[\s,]+/', $tags);
        }
    }

    if (!is_array($tags)) {
        return [];
    }

    $clean = [];
    foreach ($tags as $t) {
        $trimmed = strtolower(trim((string)$t));
        $trimmed = ltrim($trimmed, '#');
        if ($trimmed !== '' && strlen($trimmed) <= 30) {
            $clean[$trimmed] = true;
        }
    }

    return array_values(array_keys($clean));
}

function validate_capture_fields(array $data): array {
    $errors = [];

    $title = trim($data['title'] ?? '');
    if ($title === '') {
        $errors['title'] = 'Title is required.';
    } elseif (mb_strlen($title) > 255) {
        $errors['title'] = 'Title must be 255 characters or fewer.';
    }

    $content = trim($data['content'] ?? '');
    if ($content === '') {
        $errors['content'] = 'Content is required.';
    }

    $validTypes = ['note', 'idea', 'link', 'snippet'];
    $type = $data['type'] ?? 'note';
    if (!in_array($type, $validTypes, true)) {
        $errors['type'] = 'Type must be one of: ' . implode(', ', $validTypes);
    }

    $url = trim($data['url'] ?? '');
    if ($url !== '') {
        if (!filter_var($url, FILTER_VALIDATE_URL) || (!str_starts_with($url, 'http://') && !str_starts_with($url, 'https://'))) {
            $errors['url'] = 'URL must be a valid web address starting with http:// or https://';
        }
    } elseif ($type === 'link') {
        $errors['url'] = 'Link captures require a valid web URL.';
    }

    return [
        'valid'   => empty($errors),
        'errors'  => $errors,
        'cleaned' => [
            'title'       => $title,
            'content'     => $content,
            'type'        => $type,
            'url'         => $url,
            'tags'        => normalize_tags($data['tags'] ?? []),
            'is_pinned'   => !empty($data['is_pinned']) ? 1 : 0,
            'is_archived' => !empty($data['is_archived']) ? 1 : 0
        ]
    ];
}
