-- Add world_setting column to novels table
ALTER TABLE novels ADD COLUMN IF NOT EXISTS world_setting text;
COMMENT ON COLUMN novels.world_setting IS '世界観の概要（時代背景、魔法体系、技術レベルなど）';
