-- ============================================
-- GOLD PACKAGES CONFIG
-- Chạy thêm script này trong Supabase SQL Editor
-- ============================================

-- Thêm gold packages vào game_config
INSERT INTO game_config (key, value) VALUES
('gold_packages', '[
    {"id": "gold_1k", "gold": 1000, "price_ton": 0.1, "label": "1K Gold", "bonus": ""},
    {"id": "gold_10k", "gold": 10000, "price_ton": 0.95, "label": "10K Gold", "bonus": "5% OFF"},
    {"id": "gold_100k", "gold": 100000, "price_ton": 9, "label": "100K Gold", "bonus": "10% OFF"}
]'::jsonb),
('ton_receive_address', '"UQBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Bảng lưu lịch sử giao dịch TON
CREATE TABLE IF NOT EXISTS ton_transactions (
    id BIGSERIAL PRIMARY KEY,
    player_id TEXT REFERENCES players(id),
    package_id TEXT NOT NULL,
    gold_amount INT NOT NULL,
    ton_amount DECIMAL(10, 4) NOT NULL,
    boc TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ton_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ton_tx_read" ON ton_transactions FOR SELECT USING (true);
CREATE POLICY "ton_tx_insert" ON ton_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "ton_tx_update" ON ton_transactions FOR UPDATE USING (true);
