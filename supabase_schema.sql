-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles table (Linked to auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Novels table
create table novels (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  synopsis text,
  image_url text,
  status text default 'draft',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Acts table
create table acts (
  id uuid default uuid_generate_v4() primary key,
  novel_id uuid references novels on delete cascade not null,
  title text not null,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Chapters table
create table chapters (
  id uuid default uuid_generate_v4() primary key,
  act_id uuid references acts on delete cascade not null,
  novel_id uuid references novels on delete cascade not null, -- denormalized for easier querying
  title text not null,
  content jsonb, -- Tiptap JSON content
  words_count integer default 0,
  status text default 'draft',
  order_index integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Characters table
create table characters (
  id uuid default uuid_generate_v4() primary key,
  novel_id uuid references novels on delete cascade not null,
  name text not null,
  
  -- CSV items
  age text,
  gender text,
  appearance text,
  first_person text,
  second_person text,
  speech_style text,
  personality text,
  sample_dialogue text,
  battle_type text,
  magic text,
  other_notes text,
  
  -- System/UI items
  role text,
  bio text, -- Short description/title
  image_url text,
  is_main boolean default false,
  
  -- Diagram positions
  graph_x numeric,
  graph_y numeric,
  
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Relationships table
create table relationships (
  id uuid default uuid_generate_v4() primary key,
  novel_id uuid references novels on delete cascade not null,
  source_character_id uuid references characters on delete cascade not null,
  target_character_id uuid references characters on delete cascade not null,
  label text,
  arrow_type text default 'forward', -- 'forward', 'reverse', 'bidirectional', 'none'
  
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS (Row Level Security)
alter table profiles enable row level security;
alter table novels enable row level security;
alter table acts enable row level security;
alter table chapters enable row level security;
alter table characters enable row level security;
alter table relationships enable row level security;

-- Create Policies
-- Profiles: Users can see/edit their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Novels: Users can only see/edit their own novels
create policy "Users can view own novels" on novels for select using (auth.uid() = user_id);
create policy "Users can insert own novels" on novels for insert with check (auth.uid() = user_id);
create policy "Users can update own novels" on novels for update using (auth.uid() = user_id);
create policy "Users can delete own novels" on novels for delete using (auth.uid() = user_id);

-- Acts: Users can access acts of their novels
create policy "Users can view acts of own novels" on acts for select using (
  exists (select 1 from novels where novels.id = acts.novel_id and novels.user_id = auth.uid())
);
create policy "Users can insert acts to own novels" on acts for insert with check (
  exists (select 1 from novels where novels.id = acts.novel_id and novels.user_id = auth.uid())
);
create policy "Users can update acts of own novels" on acts for update using (
  exists (select 1 from novels where novels.id = acts.novel_id and novels.user_id = auth.uid())
);
create policy "Users can delete acts of own novels" on acts for delete using (
  exists (select 1 from novels where novels.id = acts.novel_id and novels.user_id = auth.uid())
);

-- Chapters: Users can access chapters of their novels
create policy "Users can view chapters of own novels" on chapters for select using (
  exists (select 1 from novels where novels.id = chapters.novel_id and novels.user_id = auth.uid())
);
create policy "Users can insert chapters to own novels" on chapters for insert with check (
  exists (select 1 from novels where novels.id = chapters.novel_id and novels.user_id = auth.uid())
);
create policy "Users can update chapters of own novels" on chapters for update using (
  exists (select 1 from novels where novels.id = chapters.novel_id and novels.user_id = auth.uid())
);
create policy "Users can delete chapters of own novels" on chapters for delete using (
  exists (select 1 from novels where novels.id = chapters.novel_id and novels.user_id = auth.uid())
);

-- Characters: Users can access characters of their novels
create policy "Users can view characters of own novels" on characters for select using (
  exists (select 1 from novels where novels.id = characters.novel_id and novels.user_id = auth.uid())
);
create policy "Users can insert characters to own novels" on characters for insert with check (
  exists (select 1 from novels where novels.id = characters.novel_id and novels.user_id = auth.uid())
);
create policy "Users can update characters of own novels" on characters for update using (
  exists (select 1 from novels where novels.id = characters.novel_id and novels.user_id = auth.uid())
);
create policy "Users can delete characters of own novels" on characters for delete using (
  exists (select 1 from novels where novels.id = characters.novel_id and novels.user_id = auth.uid())
);

-- Relationships: Users can access relationships of their novels
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

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
