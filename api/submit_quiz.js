import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Credenciais do Supabase não configuradas no ambiente (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Dados inválidos.");
  }

  const clientRecordId = String(payload.client_record_id ?? "").trim();
  const nome = String(payload.nome ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const telefone = String(payload.telefone ?? "").trim();
  const codigoPostal = String(payload.codigo_postal ?? "").trim().toUpperCase();

  if (!clientRecordId || !/^[A-Za-z0-9-]{20,64}$/.test(clientRecordId)) {
    throw new Error("Identificador inválido.");
  }

  if (!nome || nome.length > 120) {
    throw new Error("Nome inválido.");
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!email || email.length > 190 || !emailRegex.test(email)) {
    throw new Error("Email inválido.");
  }

  const phoneDigits = (telefone.match(/\d/g) || []).length;
  if (!telefone || !/^[+0-9() .-]{7,30}$/.test(telefone) || phoneDigits < 7) {
    throw new Error("Telefone inválido.");
  }

  if (!codigoPostal || !/^\d{4}-\d{3}$/.test(codigoPostal)) {
    throw new Error("Código postal inválido.");
  }

  if (payload.confirmacao_dados !== true) {
    throw new Error("A confirmação de privacidade é obrigatória.");
  }

  if (typeof payload.marcar_test_drive !== "boolean") {
    throw new Error("Intenção de test-drive inválida.");
  }

  const createdAt = String(payload.created_at ?? "").trim();
  const parsedDate = new Date(createdAt);
  if (!createdAt || Number.isNaN(parsedDate.getTime())) {
    throw new Error("Data inválida.");
  }

  return {
    clientRecordId,
    nome,
    email,
    telefone,
    codigoPostal,
    confirmacaoDados: true,
    marcarTestDrive: payload.marcar_test_drive,
    submittedAt: parsedDate.toISOString()
  };
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Método não permitido." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(422).json({ success: false, message: "JSON inválido." });
    }
  }

  let validated;
  try {
    validated = validatePayload(body);
  } catch (error) {
    return res.status(422).json({ success: false, message: error.message });
  }

  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("ds_silencio_leads")
      .insert({
        client_record_id: validated.clientRecordId,
        nome: validated.nome,
        email: validated.email,
        telefone: validated.telefone,
        codigo_postal: validated.codigoPostal,
        confirmacao_dados: validated.confirmacaoDados,
        marcar_test_drive: validated.marcarTestDrive,
        submitted_at: validated.submittedAt
      });

    let duplicate = false;
    if (error) {
      if (error.code === "23505" || error.message?.includes("duplicate key") || error.message?.includes("uq_ds_silencio_client_record_id")) {
        duplicate = true;
      } else {
        console.error("Erro no Supabase:", error);
        return res.status(500).json({
          success: false,
          message: "Não foi possível processar o registo no Supabase: " + (error.message || "Erro interno")
        });
      }
    }

    return res.status(200).json({
      success: true,
      duplicate,
      client_record_id: validated.clientRecordId
    });
  } catch (err) {
    console.error("Falha no handler submit_quiz:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Não foi possível processar o pedido."
    });
  }
}
