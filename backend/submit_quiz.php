<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function json_response(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function required_string(array $payload, string $key, int $maxLength): string
{
    $value = $payload[$key] ?? null;
    if (!is_string($value)) {
        throw new InvalidArgumentException('Dados inválidos.');
    }

    $value = trim($value);
    $length = function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
    if ($value === '' || $length > $maxLength) {
        throw new InvalidArgumentException('Dados inválidos.');
    }
    return $value;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    json_response(405, ['success' => false, 'message' => 'Método não permitido.']);
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 16384) {
    json_response(413, ['success' => false, 'message' => 'Pedido inválido.']);
}

try {
    $rawBody = file_get_contents('php://input');
    $payload = json_decode($rawBody ?: '', true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($payload)) {
        throw new InvalidArgumentException('Dados inválidos.');
    }

    $clientRecordId = required_string($payload, 'client_record_id', 64);
    $nome = required_string($payload, 'nome', 120);
    $email = strtolower(required_string($payload, 'email', 190));
    $telefone = required_string($payload, 'telefone', 30);
    $codigoPostal = strtoupper(required_string($payload, 'codigo_postal', 12));

    if (!preg_match('/^[A-Za-z0-9-]{20,64}$/', $clientRecordId)) {
        throw new InvalidArgumentException('Identificador inválido.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Email inválido.');
    }
    if (!preg_match('/^[+0-9() .-]{7,30}$/', $telefone) || preg_match_all('/\d/', $telefone) < 7) {
        throw new InvalidArgumentException('Telefone inválido.');
    }
    if (!preg_match('/^\d{4}-\d{3}$/', $codigoPostal)) {
        throw new InvalidArgumentException('Código postal inválido.');
    }
    if (($payload['confirmacao_dados'] ?? false) !== true) {
        throw new InvalidArgumentException('A confirmação de privacidade é obrigatória.');
    }

    $marcarTestDriveValue = $payload['marcar_test_drive'] ?? false;
    if (!is_bool($marcarTestDriveValue)) {
        throw new InvalidArgumentException('Intenção de test-drive inválida.');
    }
    $marcarTestDrive = $marcarTestDriveValue;

    $createdAt = required_string($payload, 'created_at', 40);
    try {
        $submittedAt = (new DateTimeImmutable($createdAt))->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Throwable) {
        throw new InvalidArgumentException('Data inválida.');
    }

    $pdo = database_connection();
    $statement = $pdo->prepare(
        'INSERT INTO ds_silencio_leads (
            client_record_id,
            nome,
            email,
            telefone,
            codigo_postal,
            confirmacao_dados,
            marcar_test_drive,
            submitted_at
        ) VALUES (
            :client_record_id,
            :nome,
            :email,
            :telefone,
            :codigo_postal,
            :confirmacao_dados,
            :marcar_test_drive,
            :submitted_at
        ) ON DUPLICATE KEY UPDATE client_record_id = VALUES(client_record_id)'
    );

    $statement->execute([
        ':client_record_id' => $clientRecordId,
        ':nome' => $nome,
        ':email' => $email,
        ':telefone' => $telefone,
        ':codigo_postal' => $codigoPostal,
        ':confirmacao_dados' => 1,
        ':marcar_test_drive' => $marcarTestDrive ? 1 : 0,
        ':submitted_at' => $submittedAt,
    ]);

    json_response(200, [
        'success' => true,
        'duplicate' => $statement->rowCount() === 0,
        'client_record_id' => $clientRecordId,
    ]);
} catch (InvalidArgumentException | JsonException $exception) {
    json_response(422, ['success' => false, 'message' => $exception->getMessage()]);
} catch (Throwable) {
    error_log('DS Modo Silêncio: falha interna na submissão.');
    json_response(500, ['success' => false, 'message' => 'Não foi possível processar o pedido.']);
}
