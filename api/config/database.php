<?php
/**
 * MindVault Database Connector
 * Uses PHP Data Objects (PDO) with strict error handling, UTF-8 encoding,
 * and prepared statements to ensure total protection against SQL injection.
 */

function get_config(): array {
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $configFile = __DIR__ . '/config.php';
    $exampleFile = __DIR__ . '/config.example.php';

    if (file_exists($configFile)) {
        $config = require $configFile;
    } elseif (file_exists($exampleFile)) {
        $config = require $exampleFile;
    } else {
        $config = [
            'db' => [
                'host'     => getenv('DB_HOST') ?: '127.0.0.1',
                'port'     => (int)(getenv('DB_PORT') ?: 3306),
                'dbname'   => getenv('DB_NAME') ?: 'mindvault',
                'username' => getenv('DB_USER') ?: 'root',
                'password' => getenv('DB_PASS') ?: '',
                'charset'  => 'utf8mb4'
            ]
        ];
    }

    return $config;
}

function get_db_connection(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $config = get_config();
    $dbConfig = $config['db'];

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $dbConfig['host'],
        $dbConfig['port'] ?? 3306,
        $dbConfig['dbname'],
        $dbConfig['charset'] ?? 'utf8mb4'
    );

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
    ];

    try {
        $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], $options);
        return $pdo;
    } catch (PDOException $e) {
        // Never expose database credentials or stack traces in error messages
        error_log('Database connection failed: ' . $e->getMessage());
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Unable to connect to MySQL database. Please verify your database configuration and ensure MySQL is running.',
            'code'    => 'DB_CONNECTION_ERROR'
        ]);
        exit;
    }
}
