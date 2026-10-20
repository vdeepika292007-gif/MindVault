<?php
/**
 * MindVault Response Helper
 * Standardized JSON envelope, HTTP status codes, and secure CORS headers.
 */

function setup_api_headers(): void {
    // Only send headers if not already sent
    if (headers_sent()) {
        return;
    }

    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');

    // CORS handling for local development flexibility
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin) {
        $config = function_exists('get_config') ? get_config() : [];
        $allowed = $config['cors']['allowed_origins'] ?? [
            'http://localhost:5173', 'http://127.0.0.1:5173',
            'http://localhost:8000', 'http://127.0.0.1:8000',
            'http://localhost', 'http://127.0.0.1'
        ];

        if (in_array($origin, $allowed, true)) {
            header("Access-Control-Allow-Origin: $origin");
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
        }
    }

    // Handle preflight OPTIONS request
    if (isset($_SERVER['REQUEST_METHOD']) && strtoupper($_SERVER['REQUEST_METHOD']) === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function json_response(mixed $data, int $statusCode = 200): void {
    setup_api_headers();
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(string $message, int $statusCode = 400, array $errors = []): void {
    setup_api_headers();
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $message,
        'errors'  => $errors
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function get_json_input(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
