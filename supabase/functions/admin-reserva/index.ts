import { createClient } from "npm:@supabase/supabase-js@2";

type AdminAction =
  | "mark_paid"
  | "cancel"
  | "complete"
  | "no_show";

type AdminReservaPayload = {
  appointment_id: string;
  action: AdminAction;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function validatePayload(
  body: unknown,
): { ok: true; data: AdminReservaPayload } | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Payload inválido." };
  }

  const payload = body as AdminReservaPayload;

  if (!payload.appointment_id || typeof payload.appointment_id !== "string") {
    return { ok: false, message: "appointment_id é obrigatório." };
  }

  const validActions: AdminAction[] = ["mark_paid", "cancel", "complete", "no_show"];

  if (!validActions.includes(payload.action)) {
    return { ok: false, message: "Ação inválida." };
  }

  return { ok: true, data: payload };
}

function getUpdateForAction(action: AdminAction) {
  if (action === "mark_paid") {
    return {
      payment_status: "approved",
    };
  }

  if (action === "cancel") {
    return {
      booking_status: "cancelled",
    };
  }

  if (action === "complete") {
    return {
      booking_status: "completed",
      payment_status: "approved",
    };
  }

  if (action === "no_show") {
    return {
      booking_status: "no_show",
    };
  }

  return {};
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: "Variáveis de ambiente ausentes." }, 500);
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return jsonResponse({ error: "Usuário não autenticado." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      return jsonResponse({ error: "Sessão inválida." }, 401);
    }

    const userId = userData.user.id;

    const { data: adminData, error: adminError } = await serviceClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminError) {
      return jsonResponse({ error: adminError.message || "Erro ao verificar admin." }, 500);
    }

    if (!adminData?.user_id) {
      return jsonResponse({ error: "Usuário sem permissão de admin." }, 403);
    }

    const body = await req.json().catch(() => null);
    const validation = validatePayload(body);

    if (!validation.ok) {
      return jsonResponse({ error: validation.message }, 400);
    }

    const { appointment_id, action } = validation.data;
    const updatePayload = getUpdateForAction(action);

    const { data: appointment, error: updateError } = await serviceClient
      .from("appointments")
      .update({
        ...updatePayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment_id)
      .select(`
        id,
        client_name,
        selected_services,
        total_price,
        appointment_start,
        appointment_end,
        payment_method,
        payment_status,
        booking_status,
        expires_at,
        created_at,
        updated_at
      `)
      .single();

    if (updateError) {
      return jsonResponse({ error: updateError.message || "Erro ao atualizar reserva." }, 500);
    }

    return jsonResponse({
      ok: true,
      appointment,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return jsonResponse({ error: message }, 500);
  }
});