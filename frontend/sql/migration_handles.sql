-- Add handle columns to relationships table to store connection points
alter table relationships 
  add column if not exists source_handle text,
  add column if not exists target_handle text;

