-- Create world_elements table
create table if not exists world_elements (
  id uuid default uuid_generate_v4() primary key,
  novel_id uuid references novels on delete cascade not null,
  name text not null,
  category text not null default '国家',
  description text,
  image_url text,

  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for world_elements
alter table world_elements enable row level security;

-- Create Policies for world_elements
create policy "Users can view world_elements of own novels" on world_elements for select using (
  exists (select 1 from novels where novels.id = world_elements.novel_id and novels.user_id = auth.uid())
);
create policy "Users can insert world_elements to own novels" on world_elements for insert with check (
  exists (select 1 from novels where novels.id = world_elements.novel_id and novels.user_id = auth.uid())
);
create policy "Users can update world_elements of own novels" on world_elements for update using (
  exists (select 1 from novels where novels.id = world_elements.novel_id and novels.user_id = auth.uid())
);
create policy "Users can delete world_elements of own novels" on world_elements for delete using (
  exists (select 1 from novels where novels.id = world_elements.novel_id and novels.user_id = auth.uid())
);
