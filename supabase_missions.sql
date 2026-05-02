-- =============================================
-- MISSION SYSTEM - Supabase Schema
-- =============================================

-- 1. Game Config: Mission settings
-- Chạy từng INSERT riêng trong SQL Editor

-- Daily check-in config
INSERT INTO game_config (key, value) VALUES ('daily_checkin', '{
  "rewards": [10, 20, 30, 50, 80, 120, 200],
  "reset_after_days": 7
}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Ranking rewards config
INSERT INTO game_config (key, value) VALUES ('ranking_rewards', '[
  {"rank": 1, "type": "ton", "amount": 10},
  {"rank": 2, "type": "ton", "amount": 5},
  {"rank": 3, "type": "ton", "amount": 3},
  {"rank": 4, "type": "hht", "amount": 5000},
  {"rank": 5, "type": "hht", "amount": 3000},
  {"rank": 6, "type": "hht", "amount": 2000},
  {"rank": 7, "type": "gold", "amount": 20000},
  {"rank": 8, "type": "gold", "amount": 15000},
  {"rank": 9, "type": "gold", "amount": 10000},
  {"rank": 10, "type": "gold", "amount": 5000}
]') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Daily missions config  
INSERT INTO game_config (key, value) VALUES ('daily_missions', '[
  {
    "id": "join_telegram",
    "name": "Join Telegram Group",
    "desc": "Join our community group",
    "reward": 50,
    "link": "https://t.me/headshot_hunter_global_chat",
    "telegram_chat_id": "@headshot_hunter_global_chat"
  }
]') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- One-time missions config
INSERT INTO game_config (key, value) VALUES ('onetime_missions', '[
  {
    "id": "play_hotshot",
    "name": "Play Hot Shot",
    "desc": "Try our soccer game",
    "reward": 100,
    "link": "https://t.me/HotShotSoccerBot/game",
    "telegram_chat_id": ""
  }
]') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Referral config
INSERT INTO game_config (key, value) VALUES ('referral_config', '{
  "f1_percent": 10,
  "f2_percent": 5,
  "f3_percent": 2,
  "milestones": [
    {"count": 1, "reward": 50, "required_ton": 1, "daily_withdraw_limit": 0.1},
    {"count": 3, "reward": 200, "required_ton": 3, "daily_withdraw_limit": 0.3},
    {"count": 5, "reward": 500, "required_ton": 5, "daily_withdraw_limit": 0.5},
    {"count": 10, "reward": 1500, "required_ton": 10, "daily_withdraw_limit": 1.0},
    {"count": 20, "reward": 4000, "required_ton": 20, "daily_withdraw_limit": 2.0},
    {"count": 50, "reward": 12000, "required_ton": 50, "daily_withdraw_limit": 5.0},
    {"count": 100, "reward": 30000, "required_ton": 100, "daily_withdraw_limit": 10.0},
    {"count": 200, "reward": 80000, "required_ton": 200, "daily_withdraw_limit": 20.0},
    {"count": 500, "reward": 250000, "required_ton": 500, "daily_withdraw_limit": 50.0},
    {"count": 1000, "reward": 600000, "required_ton": 1000, "daily_withdraw_limit": 100.0}
  ],
  "bot_link": "https://t.me/YOUR_BOT?start=ref_"
}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Exchange config
INSERT INTO game_config (key, value) VALUES ('exchange_config', '{
  "hht_to_ton_rate": 1000,
  "withdraw_fee_percent": 5,
  "deposit_options": [1, 5, 10]
}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Boss config
INSERT INTO game_config (key, value) VALUES ('boss_config', '{
  "spawn_interval": 10,
  "base_hht_reward": 50,
  "hht_reward_step": 10
}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Players table: Add mission, coin, and withdraw columns
ALTER TABLE players ADD COLUMN IF NOT EXISTS hht_coin INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS checkin_streak INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_checkin_date TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN IF NOT EXISTS completed_daily_missions JSONB DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS completed_onetime_missions JSONB DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS claimed_milestones JSONB DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS daily_ton_withdrawn NUMERIC DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_withdraw_date TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN IF NOT EXISTS weekly_best_stage INTEGER DEFAULT 1;
ALTER TABLE players ADD COLUMN IF NOT EXISTS weekly_best_floor INTEGER DEFAULT 1;

-- 3. Referral tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- =============================================
-- WEEKLY RANKING SYSTEM (CRON JOB)
-- =============================================
-- Warning: You must have pg_cron extension enabled in Supabase!
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION process_weekly_ranking()
RETURNS void AS $$
DECLARE
    reward record;
    player record;
    r_idx integer := 1;
BEGIN
    -- Lay ra danh sach top 10 player cua tuan
    FOR player IN
        SELECT id, total_ton_deposited FROM players
        ORDER BY weekly_best_stage DESC, weekly_best_floor DESC, id ASC
        LIMIT 10
    LOOP
        -- Check locked status (chua nap TON)
        IF player.total_ton_deposited > 0 THEN
            -- Lay phan thuong tuong ung voi rank r_idx
            SELECT * INTO reward FROM (
                SELECT (jsonb_array_elements(value::jsonb)->>'rank')::int as rank,
                       (jsonb_array_elements(value::jsonb)->>'type') as r_type,
                       (jsonb_array_elements(value::jsonb)->>'amount')::numeric as amount
                FROM game_config WHERE key = 'ranking_rewards'
            ) sub WHERE rank = r_idx LIMIT 1;
            
            -- Cong phan thuong neu co
            IF reward.r_type = 'ton' THEN
                UPDATE players SET total_ton_deposited = total_ton_deposited + reward.amount WHERE id = player.id;
            ELSIF reward.r_type = 'hht' THEN
                UPDATE players SET hht_coin = hht_coin + reward.amount WHERE id = player.id;
            ELSIF reward.r_type = 'gold' THEN
                UPDATE players SET gold = gold + reward.amount WHERE id = player.id;
            END IF;
        END IF;
        
        r_idx := r_idx + 1;
    END LOOP;

    -- Reset diem tuan
    UPDATE players SET weekly_best_stage = 1, weekly_best_floor = 1;
END;
$$ LANGUAGE plpgsql;

-- Dat lich chay vao 00:00 UTC thu 2 hang tuan
SELECT cron.schedule('weekly-ranking-reset', '0 0 * * 1', 'SELECT process_weekly_ranking()');
