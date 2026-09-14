import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      message: "Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY não estão configuradas na Vercel."
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const { count, error } = await supabase
      .from("ds_silencio_leads")
      .select("id", { count: "exact" })
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Ligação ao Supabase ativa, mas a tabela 'ds_silencio_leads' reportou erro.",
        details: error.message,
        hint: "Certifique-se de que executou o ficheiro supabase/schema.sql no SQL Editor do Supabase."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ligação ao Supabase e tabela 'ds_silencio_leads' operacionais!",
      total_leads: count ?? 0,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Falha ao conectar com o Supabase.",
      details: err.message
    });
  }
}
