create table public.pfc_backups (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 device_id text not null check (length(device_id) between 1 and 80),
 checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
 label text not null default 'Backup automatico' check (length(label)<=100),
 data jsonb not null check (jsonb_typeof(data)='object' and jsonb_typeof(data->'data')='object' and jsonb_typeof(data->'data'->'points')='array' and jsonb_typeof(data->'data'->'outings')='array' and jsonb_typeof(data->'data'->'diary')='array' and octet_length(data::text)<=8000000),
 created_at timestamptz not null default now(),
 unique(user_id,device_id,checksum)
);
create index pfc_backups_user_created on public.pfc_backups(user_id,created_at desc);
alter table public.pfc_backups enable row level security;
revoke all on public.pfc_backups from anon,authenticated;
grant select,insert,delete on public.pfc_backups to authenticated;
create policy pfc_backup_read on public.pfc_backups for select to authenticated using ((select auth.uid())=user_id);
create policy pfc_backup_create on public.pfc_backups for insert to authenticated with check ((select auth.uid())=user_id);
create policy pfc_backup_delete on public.pfc_backups for delete to authenticated using ((select auth.uid())=user_id);
comment on table public.pfc_backups is 'Private versioned backups for Passione Funghi e Caccia. No sharing with Squadra Live.';
