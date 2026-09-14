CREATE TABLE IF NOT EXISTS ds_silencio_leads (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    client_record_id VARCHAR(64) NOT NULL,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    telefone VARCHAR(30) NOT NULL,
    codigo_postal VARCHAR(12) NOT NULL,
    confirmacao_dados TINYINT(1) NOT NULL DEFAULT 1,
    marcar_test_drive TINYINT(1) NOT NULL DEFAULT 0,
    submitted_at DATETIME NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ds_silencio_client_record_id (client_record_id),
    KEY idx_ds_silencio_received_at (received_at),
    KEY idx_ds_silencio_test_drive (marcar_test_drive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
