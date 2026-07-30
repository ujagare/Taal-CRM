-- Date Group Preferences (shared across all users/devices)
-- Stores which maintenance-log date groups are expanded/minimised

create table if not exists date_group_preferences (
  id bigint primary key generated always as identity,
  date_key text not null unique,
  is_expanded boolean not null default false,
  updated_at timestamptz default now()
);

create index if not exists idx_date_group_preferences_key on date_group_preferences(date_key);

-- Disable RLS (auth not enabled yet)
alter table date_group_preferences disable row level security;

-- Auto-update timestamp on change
create or replace function update_date_group_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_date_group_preferences_updated_at on date_group_preferences;
create trigger trg_date_group_preferences_updated_at
  before update on date_group_preferences
  for each row
  execute function update_date_group_preferences_updated_at();
