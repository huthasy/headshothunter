// Supabase Edge Function: verify-telegram-join/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const BOT_TOKEN = "ĐIỀN_TOKEN_BOT_CỦA_BẠN";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Xu ly yeu cau OPTIONS (Preflight) cho CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, chatId } = await req.json()

    // 2. Goi Telegram API: getChatMember
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
    const response = await fetch(url);
    const result = await response.json();

    if (!result.ok) {
      return new Response(JSON.stringify({ isMember: false, error: result.description }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const status = result.result.status;
    const isMember = ['creator', 'administrator', 'member'].includes(status);

    return new Response(JSON.stringify({ isMember }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})
