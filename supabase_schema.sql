-- UnaMano V4 - schema autonomo. Eseguire SOLO nel nuovo progetto Supabase UnaMano.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Nuovo utente',
  city text, bio text, skills text[] not null default '{}', avatar_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 120),
  category text not null, city text not null, when_text text,
  description text not null check (char_length(description) <= 2000),
  economic_note text,
  status text not null default 'open' check(status in ('open','assigned','completed','closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  message text check (char_length(message) <= 500),
  status text not null default 'pending' check(status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(), unique(job_id, applicant_id)
);
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.profiles(id) on delete cascade,
  stars int not null check(stars between 1 and 5),
  body text check(char_length(body) <= 1000), created_at timestamptz not null default now(),
  unique(job_id, author_id, subject_id), check(author_id <> subject_id)
);
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason text not null check(char_length(reason) between 3 and 500),
  status text not null default 'open', created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
create policy "profiles public read" on public.profiles for select using (true);
create policy "profile owner insert" on public.profiles for insert with check (auth.uid()=id);
create policy "profile owner update" on public.profiles for update using (auth.uid()=id) with check (auth.uid()=id);
create policy "jobs public read" on public.jobs for select using (true);
create policy "jobs owner insert" on public.jobs for insert with check (auth.uid()=owner_id);
create policy "jobs owner update" on public.jobs for update using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "jobs owner delete" on public.jobs for delete using (auth.uid()=owner_id);
create policy "applications visible to parties" on public.applications for select using (
  auth.uid()=applicant_id or exists(select 1 from public.jobs j where j.id=job_id and j.owner_id=auth.uid())
);
create policy "applications applicant insert" on public.applications for insert with check (
  auth.uid()=applicant_id and exists(select 1 from public.jobs j where j.id=job_id and j.owner_id<>auth.uid() and j.status='open')
);
create policy "applications applicant update" on public.applications for update using (auth.uid()=applicant_id) with check(auth.uid()=applicant_id);
create policy "applications owner update" on public.applications for update using (
  exists(select 1 from public.jobs j where j.id=job_id and j.owner_id=auth.uid())
);
create policy "reviews public read" on public.reviews for select using(true);
create policy "reviews participant insert" on public.reviews for insert with check (
  auth.uid()=author_id and exists(
    select 1 from public.jobs j where j.id=job_id and j.status='completed'
      and ((j.owner_id=author_id and j.assigned_to=subject_id) or (j.assigned_to=author_id and j.owner_id=subject_id))
  )
);
create policy "reports own insert" on public.reports for insert with check(auth.uid()=reporter_id);
create policy "reports own read" on public.reports for select using(auth.uid()=reporter_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,display_name) values(new.id, coalesce(new.raw_user_meta_data->>'display_name','Nuovo utente'))
  on conflict(id) do nothing; return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.jobs, public.reviews to anon;
grant select,insert,update,delete on public.profiles,public.jobs,public.applications,public.reviews,public.reports to authenticated;
