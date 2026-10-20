<?php
/**
 * MindVault Response Helper
 * Standardized JSON envelope, HTTP status codes, and secure CORS headers.
 */

// Configure PHP to log errors without corrupting JSON API response stream
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

if (!defined('MINDVAULT_ERROR_HANDLER_SET')) {
    define('MINDVAULT_ERROR_HANDLER_SET', true);

    set_error_handler(function (int $errno, string $errstr, string $errfile, int $errline): bool {
        if (!(error_reporting() & $errno)) {
            return false;
        }

        $levelName = match ($errno) {
            E_WARNING, E_USER_WARNING       => 'Warning',
            E_NOTICE, E_USER_NOTICE         => 'Notice',
            E_DEPRECATED, E_USER_DEPRECATED => 'Deprecated',
            default                         => "Error ($errno)",
        };

        error_log("MindVault API [$levelName]: $errstr in $errfile on line $errline");
        return true; // Prevents leaking into stdout/HTTP response body
    });

    register_shutdown_function(function () {
        $error = error_get_last();
        if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            error_log("MindVault API Fatal Error: {$error['message']} in {$error['file']} on line {$error['line']}");
            if (!headers_sent()) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(500);
            }
            if (ob_get_length()) {
                ob_clean();
            }
            echo json_encode([
                'success' => false,
                'message' => 'An internal server error occurred. Please check the server error log.',
                'code'    => 'INTERNAL_SERVER_ERROR'
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
    });
}

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
    if (ob_get_length()) {
        ob_clean();
    }
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(string $message, int $statusCode = 400, array $errors = []): void {
    setup_api_headers();
    http_response_code($statusCode);
    if (ob_get_length()) {
        ob_clean();
    }
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
