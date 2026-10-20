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

    // This file is in api/config/, alongside config.php.
    $configFile = __DIR__ . '/config.php';

    if (!is_file($configFile)) {
        error_log('MindVault configuration file is missing.');
        throw new RuntimeException(
            'MindVault configuration is not available.'
        );
    }

    $loadedConfig = require $configFile;

    if (!is_array($loadedConfig) || !isset($loadedConfig['db'])) {
        error_log('MindVault configuration structure is invalid.');
        throw new RuntimeException(
            'MindVault configuration is invalid.'
        );
    }

    $config = $loadedConfig;

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
        $dbConfig['port'] ?? 3307,
        $dbConfig['dbname'],
        $dbConfig['charset'] ?? 'utf8mb4'
    );

    // In PHP 8.5+, driver-specific attributes moved to Pdo\Mysql::*
    // Use Pdo\Mysql::ATTR_INIT_COMMAND if defined, or integer 1002 (PDO::MYSQL_ATTR_INIT_COMMAND value)
    $initCommandAttr = defined('Pdo\Mysql::ATTR_INIT_COMMAND')
        ? \Pdo\Mysql::ATTR_INIT_COMMAND
        : 1002;

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        $initCommandAttr             => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
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
