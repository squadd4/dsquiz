<?php

declare(strict_types=1);

function env_value(string $key, string $fallback = ''): string
{
    $value = getenv($key);
    return $value === false ? $fallback : $value;
}

function database_connection(): PDO
{
    $host = env_value('DS_DB_HOST', 'localhost');
    $port = env_value('DS_DB_PORT', '3306');
    $name = env_value('DS_DB_NAME', 'ds_silencio');
    $user = env_value('DS_DB_USER', 'ds_user');
    $password = env_value('DS_DB_PASSWORD');

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $host,
        $port,
        $name
    );

    return new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
