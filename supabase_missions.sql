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

-- Daily missions config  
INSERT INTO game_config (key, value) VALUES ('daily_missions', '[
  {
    "id": "join_telegram",
    "name": "Join Telegram Group",
    "desc": "Join our community group",
    "reward": 50,
    "link": "https://t.me/YOUR_GROUP_LINK"
  }
]') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- One-time missions config
INSERT INTO game_config (key, value) VALUES ('onetime_missions', '[
  {
    "id": "play_hotshot",
    "name": "Play Hot Shot",
    "desc": "Try our soccer game",
    "reward": 100,
    "link": "https://t.me/YOUR_BOT/hotshot"
  }
]') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Referral config
INSERT INTO game_config (key, value) VALUES ('referral_config', '{
  "f1_percent": 10,
  "f2_percent": 5,
  "f3_percent": 2,
  "milestones": [
    {"count": 1, "reward": 50},
    {"count": 3, "reward": 200},
    {"count": 5, "reward": 500},
    {"count": 10, "reward": 1500},
    {"count": 20, "reward": 4000},
    {"count": 50, "reward": 12000},
    {"count": 100, "reward": 30000},
    {"count": 200, "reward": 80000},
    {"count": 500, "reward": 250000},
    {"count": 1000, "reward": 600000}
  ],
  "bot_link": "https://t.me/YOUR_BOT?start=ref_"
}') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. Players table: Add mission columns
ALTER TABLE players ADD COLUMN IF NOT EXISTS checkin_streak INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_checkin_date TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN IF NOT EXISTS completed_daily_missions JSONB DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS completed_onetime_missions JSONB DEFAULT '[]';
ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_code TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN IF NOT EXISTS referred_by TEXT DEFAULT '';
ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS claimed_milestones JSONB DEFAULT '[]';

-- 3. Referral tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);
