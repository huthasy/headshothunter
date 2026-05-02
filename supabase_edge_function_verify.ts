// Supabase Edge Function: verify-telegram-join/index.ts

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"

const BOT_TOKEN = "ĐIỀN_TOKEN_BOT_CỦA_BẠN";

serve(async (req) => {
  // 1. CORS Headers - Cho phep tat ca
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // 2. Tra ve OK ngay lap tuc cho Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const { userId, chatId } = await req.json();
    console.log(`Checking membership: User ${userId} in Chat ${chatId}`);

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
    const response = await fetch(url);
    const result = await response.json();

    let isMember = false;
    if (result.ok) {
      const status = result.result.status;
      isMember = ['creator', 'administrator', 'member'].includes(status);
    }

    return new Response(JSON.stringify({ isMember, debug: result }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
      status: 200, // Van tra ve 200 kem loi de tránh CORS block khi debug
    });
  }
})
