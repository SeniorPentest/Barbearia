import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    const { items, method, total } = payload
    const token = Deno.env.get('MP_ACCESS_TOKEN')

    if (!token) throw new Error("Token do MP ausente no Supabase")

    // ==========================================
    // FLUXO PIX (Pagamento Direto)
    // ==========================================
    if (method === 'pix') {
      const mpPayload = {
        transaction_amount: Number(total),
        description: "Agendamento Barbearia",
        payment_method_id: "pix",
        payer: {
          email: "cliente.teste@gmail.com", // MP exige e-mails com formatos válidos/comuns
          first_name: "Cliente",
          last_name: "Premium"
        }
      };

      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `pix_${Date.now()}` // Evita pagamentos duplicados
        },
        body: JSON.stringify(mpPayload)
      });

      const data = await response.json();

      // TELEMETRIA: Se o MP der erro 400, pegamos o motivo exato
      if (!response.ok) {
          const mpErrorMsg = data.message || data.cause?.[0]?.description || JSON.stringify(data);
          throw new Error(`Recusa do MP: ${mpErrorMsg}`);
      }

      return new Response(JSON.stringify({
        qr_code: data.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } 
    
    // ==========================================
    // FLUXO CARTÃO (Checkout Pro)
    // ==========================================
    else {
      const prefPayload = {
        items: items.map((i: any) => ({
            title: i.title || i.name, 
            quantity: 1,
            unit_price: Number(i.price || i.unit_price),
            currency_id: "BRL"
        })),
        payment_methods: {
            excluded_payment_methods: [{ id: "pix" }],
            excluded_payment_types: [{ id: "ticket" }]
        },
        back_urls: {
            success: "https://seniorpentest.github.io",
            failure: "https://seniorpentest.github.io",
            pending: "https://seniorpentest.github.io"
        },
        auto_return: "approved"
      };

      const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(prefPayload)
      });

      const pref = await res.json();
      
      if (!res.ok) {
          const prefError = pref.message || JSON.stringify(pref);
          throw new Error(`Erro Pref MP: ${prefError}`);
      }

      return new Response(JSON.stringify({ init_point: pref.init_point }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error) {
    // Retorna o erro exato para o Frontend
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
  }
})