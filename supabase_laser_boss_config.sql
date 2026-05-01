-- Thêm cấu hình hệ số tầm bắn của Laser khi gặp Boss
INSERT INTO game_config (key, value) VALUES
('laser_boss_multiplier', '3'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
