<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

try {
    $pdo = database_connection();
    $pdo->query('SELECT 1');
    echo json_encode(['success' => true], JSON_UNESCAPED_UNICODE);
} catch (Throwable) {
    error_log('DS Modo Silêncio: base de dados indisponível.');
    http_response_code(503);
    echo json_encode(['success' => false], JSON_UNESCAPED_UNICODE);
}
