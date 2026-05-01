-- 1. Thêm cột theo dõi nạp TON và reset điểm theo ngày vào bảng players
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS total_ton_deposited DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_best_floor INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS daily_best_stage INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT CURRENT_DATE;

-- 2. Cập nhật cấu hình phần thưởng với điều kiện nạp TON (min_ton)
UPDATE game_config SET value = '[
  {"rank": 1, "gold": 10000, "min_ton": 1.0, "label": "🥇 1st Place"},
  {"rank": 2, "gold": 7000, "min_ton": 0.7, "label": "🥈 2nd Place"},
  {"rank": 3, "gold": 5000, "min_ton": 0.5, "label": "🥉 3rd Place"},
  {"rank": 4, "gold": 3000, "min_ton": 0.3, "label": "4th Place"},
  {"rank": 5, "gold": 2500, "min_ton": 0.2, "label": "5th Place"},
  {"rank": 6, "gold": 2000, "min_ton": 0.1, "label": "6th Place"},
  {"rank": 7, "gold": 1500, "min_ton": 0.1, "label": "7th Place"},
  {"rank": 8, "gold": 1000, "min_ton": 0.05, "label": "8th Place"},
  {"rank": 9, "gold": 800, "min_ton": 0.05, "label": "9th Place"},
  {"rank": 10, "gold": 500, "min_ton": 0.01, "label": "10th Place"}
]'::jsonb
WHERE key = 'ranking_rewards';
