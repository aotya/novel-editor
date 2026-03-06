-- Add graph position columns to characters table
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS graph_x numeric,
ADD COLUMN IF NOT EXISTS graph_y numeric;

-- Create Relationships table
create table if not exists relationships (
  id uuid default uuid_generate_v4() primary key,
  novel_id uuid references novels on delete cascade not null,
  source_character_id uuid references characters on delete cascade not null,
  target_character_id uuid references characters on delete cascade not null,
  label text,
  arrow_type text default 'forward', -- 'forward', 'reverse', 'bidirectional', 'none'
  
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for relationships
alter table relationships enable row level security;

-- Create Policies for relationships
create policy "Users can view relationships of own novels" on relationships for select using (
  exists (select 1 from novels where novels.id = relationships.novel_id and novels.user_id = auth.uid())
);
create policy "Users can insert relationships to own novels" on relationships for insert with check (
  exists (select 1 from novels where novels.id = relationships.novel_id and novels.user_id = auth.uid())
);
create policy "Users can update relationships of own novels" on relationships for update using (
  exists (select 1 from novels where novels.id = relationships.novel_id and novels.user_id = auth.uid())
);
create policy "Users can delete relationships of own novels" on relationships for delete using (
  exists (select 1 from novels where novels.id = relationships.novel_id and novels.user_id = auth.uid())
);

