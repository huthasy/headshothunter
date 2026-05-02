// Supabase Edge Function: verify-telegram-join/index.ts
// Chạy lệnh: supabase functions new verify-telegram-join

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const BOT_TOKEN = "ĐIỀN_TOKEN_BOT_CỦA_BẠN_Ở_ĐÂY"; // Hoặc dùng Deno.env.get("TELEGRAM_BOT_TOKEN")

serve(async (req) => {
  try {
    const { userId, chatId } = await req.json()

    // Goi Telegram API: getChatMember
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${chatId}&user_id=${userId}`;
    const response = await fetch(url);
    const result = await response.json();

    if (!result.ok) {
      return new Response(JSON.stringify({ isMember: false, error: result.description }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Cac status hop le: 'creator', 'administrator', 'member'
    const status = result.result.status;
    const isMember = ['creator', 'administrator', 'member'].includes(status);

    return new Response(JSON.stringify({ isMember }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})
