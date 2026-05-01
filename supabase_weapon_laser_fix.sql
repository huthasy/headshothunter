-- Cập nhật thông số laser_boss_multiplier trực tiếp vào súng Laser
UPDATE weapons 
SET config = config || '{"laser_boss_multiplier": 3}'::jsonb
WHERE id = 'laser';

-- (Tùy chọn) Xóa key cũ trong game_config nếu không cần thiết
DELETE FROM game_config WHERE key = 'laser_boss_multiplier';
