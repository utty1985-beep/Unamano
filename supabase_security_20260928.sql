-- UnaMano security baseline — 2026-09-28
-- Idempotent recovery script for key privacy, chat, moderation and rate-limit protections.

create table if not exists public.user_suspensions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_suspensions_reason_len check (reason is null or char_length(reason) <= 1000)
);
alter table public.user_suspensions enable row level security;

create or replace function public.current_user_not_suspended()
returns boolean language sql stable security definer set search_path=public as $$
  select not exists (
    select 1 from public.user_suspensions s
    where s.user_id=(select auth.uid()) and s.active=true
  );
$$;
revoke all on function public.current_user_not_suspended() from public;
grant execute on function public.current_user_not_suspended() to authenticated;

create or replace function public.clear_legacy_profile_cv_columns()
returns trigger language plpgsql set search_path=public as $$
begin
  new.cv_summary:=null;
  new.cv_path:=null;
  new.cv_filename:=null;
  return new;
end;
$$;
drop trigger if exists trg_clear_legacy_profile_cv_columns on public.profiles;
create trigger trg_clear_legacy_profile_cv_columns before insert or update on public.profiles
for each row execute function public.clear_legacy_profile_cv_columns();

create or replace function public.enforce_unamano_insert_rate_limits()
returns trigger language plpgsql security definer set search_path=public as $$
declare actor uuid; recent_count integer; daily_count integer;
begin
  if tg_table_name='jobs' then
    actor:=new.owner_id;
    select count(*) into recent_count from public.jobs where owner_id=actor and created_at>now()-interval '1 hour';
    select count(*) into daily_count from public.jobs where owner_id=actor and created_at>now()-interval '24 hours';
    if recent_count>=10 or daily_count>=30 then raise exception 'rate_limit_jobs'; end if;
  elsif tg_table_name='applications' then
    actor:=new.applicant_id;
    select count(*) into recent_count from public.applications where applicant_id=actor and created_at>now()-interval '1 hour';
    select count(*) into daily_count from public.applications where applicant_id=actor and created_at>now()-interval '24 hours';
    if recent_count>=30 or daily_count>=100 then raise exception 'rate_limit_applications'; end if;
  elsif tg_table_name='messages' then
    actor:=new.sender_id;
    select count(*) into recent_count from public.messages where sender_id=actor and created_at>now()-interval '1 minute';
    if recent_count>=15 then raise exception 'rate_limit_messages_short'; end if;
    select count(*) into daily_count from public.messages where sender_id=actor and created_at>now()-interval '1 hour';
    if daily_count>=180 then raise exception 'rate_limit_messages_hour'; end if;
  elsif tg_table_name='reports' then
    actor:=new.reporter_id;
    select count(*) into recent_count from public.reports where reporter_id=actor and created_at>now()-interval '1 hour';
    if recent_count>=10 then raise exception 'rate_limit_reports'; end if;
  elsif tg_table_name='reviews' then
    actor:=new.author_id;
    select count(*) into recent_count from public.reviews where author_id=actor and created_at>now()-interval '1 hour';
    if recent_count>=20 then raise exception 'rate_limit_reviews'; end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_unamano_insert_rate_limits() from public;

drop trigger if exists jobs_rate_limit on public.jobs;
create trigger jobs_rate_limit before insert on public.jobs for each row execute function public.enforce_unamano_insert_rate_limits();
drop trigger if exists applications_rate_limit on public.applications;
create trigger applications_rate_limit before insert on public.applications for each row execute function public.enforce_unamano_insert_rate_limits();
drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages for each row execute function public.enforce_unamano_insert_rate_limits();
drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports for each row execute function public.enforce_unamano_insert_rate_limits();
drop trigger if exists reviews_rate_limit on public.reviews;
create trigger reviews_rate_limit before insert on public.reviews for each row execute function public.enforce_unamano_insert_rate_limits();

create index if not exists jobs_owner_created_rate_idx on public.jobs(owner_id,created_at desc);
create index if not exists applications_applicant_created_rate_idx on public.applications(applicant_id,created_at desc);
create index if not exists messages_sender_created_rate_idx on public.messages(sender_id,created_at desc);
create index if not exists reports_reporter_created_rate_idx on public.reports(reporter_id,created_at desc);
create index if not exists reviews_author_created_rate_idx on public.reviews(author_id,created_at desc);
create index if not exists user_suspensions_active_idx on public.user_suspensions(active) where active=true;

-- Content creation policies with suspension checks.
drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs for insert to authenticated
with check ((select auth.uid())=owner_id and status='open' and assigned_to is null and public.current_user_not_suspended());

drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert to authenticated
with check ((select auth.uid())=applicant_id and status='pending' and public.current_user_not_suspended()
  and exists(select 1 from public.jobs j where j.id=applications.job_id and j.owner_id<>(select auth.uid()) and j.status='open'));

-- Chat only between the owner and the accepted worker for the related job.
drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages for insert to authenticated
with check (
  public.current_user_not_suspended()
  and (select auth.uid())=sender_id and sender_id<>recipient_id and job_id is not null
  and exists(select 1 from public.jobs j where j.id=messages.job_id and j.status in ('assigned','completed') and j.assigned_to is not null
    and ((j.owner_id=messages.sender_id and j.assigned_to=messages.recipient_id)
      or (j.assigned_to=messages.sender_id and j.owner_id=messages.recipient_id)))
);

drop policy if exists messages_select_participants on public.messages;
create policy messages_select_participants on public.messages for select to authenticated
using (
  ((select auth.uid())=sender_id or (select auth.uid())=recipient_id)
  and job_id is not null
  and exists(select 1 from public.jobs j where j.id=messages.job_id and j.status in ('assigned','completed') and j.assigned_to is not null
    and ((j.owner_id=messages.sender_id and j.assigned_to=messages.recipient_id)
      or (j.assigned_to=messages.sender_id and j.owner_id=messages.recipient_id)))
);

drop policy if exists messages_update_recipient on public.messages;
create policy messages_update_recipient on public.messages for update to authenticated
using ((select auth.uid())=recipient_id and job_id is not null and exists(select 1 from public.jobs j where j.id=messages.job_id and j.status in ('assigned','completed') and ((j.owner_id=messages.sender_id and j.assigned_to=messages.recipient_id) or (j.assigned_to=messages.sender_id and j.owner_id=messages.recipient_id))))
with check ((select auth.uid())=recipient_id and job_id is not null and exists(select 1 from public.jobs j where j.id=messages.job_id and j.status in ('assigned','completed') and ((j.owner_id=messages.sender_id and j.assigned_to=messages.recipient_id) or (j.assigned_to=messages.sender_id and j.owner_id=messages.recipient_id))));

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
with check (
  public.current_user_not_suspended()
  and (select auth.uid())=author_id
  and exists(select 1 from public.jobs j where j.id=reviews.job_id and j.status='completed'
    and ((j.owner_id=reviews.author_id and j.assigned_to=reviews.subject_id)
      or (j.assigned_to=reviews.author_id and j.owner_id=reviews.subject_id)))
);
