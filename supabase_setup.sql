-- ============================================
-- HEADSHOT HUNTER - SUPABASE SETUP
-- Chạy script này trong Supabase SQL Editor
-- ============================================

-- 1. BẢNG GAME_CONFIG (Admin chỉnh sửa thông số game)
CREATE TABLE IF NOT EXISTS game_config (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG PLAYERS (Dữ liệu người chơi)
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    gold INT DEFAULT 0,
    best_stage INT DEFAULT 1,
    best_floor INT DEFAULT 1,
    helmet_level SMALLINT DEFAULT 0,
    armor_level SMALLINT DEFAULT 0,
    owned_weapons TEXT[] DEFAULT ARRAY['pistol'],
    equipped_weapon TEXT DEFAULT 'pistol',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROW LEVEL SECURITY
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- game_config: AI CŨNG ĐỌC ĐƯỢC (public read)
CREATE POLICY "game_config_read" ON game_config
    FOR SELECT USING (true);

-- players: AI CŨNG ĐỌC/GHI ĐƯỢC (vì dùng anon key, chưa có auth)
-- Trong production nên dùng Telegram auth để restrict
CREATE POLICY "players_read" ON players
    FOR SELECT USING (true);

CREATE POLICY "players_insert" ON players
    FOR INSERT WITH CHECK (true);

CREATE POLICY "players_update" ON players
    FOR UPDATE USING (true);

-- 4. SEED DATA - GAME CONFIG
-- Weapon configs
INSERT INTO game_config (key, value) VALUES
('weapons', '{
    "pistol": {"name": "Pistol", "desc": "Súng cơ bản", "rangeMultiplier": 1, "speedMultiplier": 1, "bulletCount": 1, "spread": 0, "type": "pistol", "price": 0},
    "sweep2x": {"name": "Sweep x2", "desc": "Tầm ngắm x2", "rangeMultiplier": 2, "speedMultiplier": 1, "bulletCount": 1, "spread": 0, "type": "sweep", "price": 0},
    "sweep3x": {"name": "Sweep x3", "desc": "Tầm ngắm x3", "rangeMultiplier": 3, "speedMultiplier": 1, "bulletCount": 1, "spread": 0, "type": "sweep", "price": 0},
    "sweep4x": {"name": "Sweep x4", "desc": "Tầm ngắm x4", "rangeMultiplier": 4, "speedMultiplier": 1, "bulletCount": 1, "spread": 0, "type": "sweep", "price": 0},
    "shotgun": {"name": "Shotgun", "desc": "Bắn 2 viên rải", "rangeMultiplier": 1, "speedMultiplier": 1, "bulletCount": 2, "spread": 3, "type": "shotgun", "price": 0},
    "laser": {"name": "Laser Gun", "desc": "Chấm đỏ laser", "rangeMultiplier": 1, "speedMultiplier": 0.25, "bulletCount": 1, "spread": 0, "type": "laser", "price": 0}
}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Prices
INSERT INTO game_config (key, value) VALUES
('helmet_price', '0'::jsonb),
('armor_price', '0'::jsonb),
('upgrade_price', '0'::jsonb),
('base_gun_speed', '3'::jsonb),
('sweep_angle', '60'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- 5. AUTO-UPDATE updated_at TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trigger_config_updated_at
    BEFORE UPDATE ON game_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
