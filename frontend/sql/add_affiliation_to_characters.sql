-- Add affiliation column to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS affiliation text;
COMMENT ON COLUMN characters.affiliation IS '所属する国・組織など';
