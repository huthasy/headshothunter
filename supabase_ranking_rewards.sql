-- Thêm cấu hình phần thưởng cho Top Ranking vào game_config
INSERT INTO game_config (key, value) VALUES
('ranking_rewards', '[
  {"rank": 1, "gold": 10000, "label": "🥇 1st Place", "bonus": "Champion Crown"},
  {"rank": 2, "gold": 7000, "label": "🥈 2nd Place", "bonus": "Silver Shield"},
  {"rank": 3, "gold": 5000, "label": "🥉 3rd Place", "bonus": "Bronze Medal"},
  {"rank": 4, "gold": 3000, "label": "4th Place"},
  {"rank": 5, "gold": 2500, "label": "5th Place"},
  {"rank": 6, "gold": 2000, "label": "6th Place"},
  {"rank": 7, "gold": 1500, "label": "7th Place"},
  {"rank": 8, "gold": 1000, "label": "8th Place"},
  {"rank": 9, "gold": 800, "label": "9th Place"},
  {"rank": 10, "gold": 500, "label": "10th Place"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
