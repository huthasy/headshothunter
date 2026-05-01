import { createClient } from '@supabase/supabase-js';

// ============================================
// THAY THẾ CÁC GIÁ TRỊ NÀY BẰNG THÔNG TIN SUPABASE CỦA BẠN
// ============================================
const SUPABASE_URL = 'https://aqcgoctfquctfokewnlo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxY2dvY3RmcXVjdGZva2V3bmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NTc0MDYsImV4cCI6MjA5MzEzMzQwNn0.iQRtx1ArBqOlnpFWDowPb-oak2b7Hdy6w0rLy1luzmc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Lấy Player ID từ Telegram WebApp hoặc tạo random UUID
export function getPlayerId() {
    // Ưu tiên dùng Telegram user ID
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.id) {
        return String(window.Telegram.WebApp.initDataUnsafe.user.id);
    }
    // Fallback: dùng localStorage UUID
    let id = localStorage.getItem('headshot_player_id');
    if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2);
        localStorage.setItem('headshot_player_id', id);
    }
    return id;
}
