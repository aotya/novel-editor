-- --------------------------------------------------------
-- User Registration SQL
-- ユーザー登録時の自動プロフィール作成
-- --------------------------------------------------------

-- 1. Profiles table (ユーザープロフィール)
-- auth.users と1対1で紐づく
create table public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  username text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. RLS (Row Level Security) の有効化
alter table profiles enable row level security;

-- 3. RLS Policies
-- 自分のプロフィールのみ閲覧・更新可能
create policy "Users can view own profile" 
  on profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on profiles for update 
  using (auth.uid() = id);

-- 4. 新規ユーザー登録時に自動でプロフィールを作成する関数
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 5. auth.users にINSERTされたら自動実行するトリガー
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
