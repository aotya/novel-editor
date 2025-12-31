-- Add new columns to characters table based on the CSV requirements
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS age text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS appearance text,
ADD COLUMN IF NOT EXISTS first_person text,
ADD COLUMN IF NOT EXISTS second_person text,
ADD COLUMN IF NOT EXISTS speech_style text,
ADD COLUMN IF NOT EXISTS personality text,
ADD COLUMN IF NOT EXISTS sample_dialogue text,
ADD COLUMN IF NOT EXISTS battle_type text,
ADD COLUMN IF NOT EXISTS magic text,
ADD COLUMN IF NOT EXISTS other_notes text,
ADD COLUMN IF NOT EXISTS is_main boolean default false,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());

