-- UnaMano - hardening RLS da eseguire DOPO supabase_schema.sql
-- Mantiene le operazioni utente limitate alle transizioni previste dall'app.

-- Rimuove le policy UPDATE più larghe del bootstrap, se presenti.
drop policy if exists "applications applicant update" on public.applications;
drop policy if exists "applications owner update" on public.applications;
drop policy if exists "applications_applicant_withdraw" on public.applications;
drop policy if exists "applications_owner_decide" on public.applications;

drop policy if exists "jobs owner update" on public.jobs;
drop policy if exists "jobs_owner_assign" on public.jobs;
drop policy if exists "jobs_owner_complete" on public.jobs;

-- Le candidature possono cambiare soltanto la colonna status.
revoke update on public.applications from authenticated;
grant update(status) on public.applications to authenticated;

create policy "applications_applicant_withdraw"
on public.applications for update
to authenticated
using ((select auth.uid()) = applicant_id and status = 'pending')
with check ((select auth.uid()) = applicant_id and status = 'withdrawn');

create policy "applications_owner_decide"
on public.applications for update
to authenticated
using (
  status = 'pending' and exists (
    select 1 from public.jobs j
    where j.id = applications.job_id
      and j.owner_id = (select auth.uid())
  )
)
with check (
  status in ('accepted','declined') and exists (
    select 1 from public.jobs j
    where j.id = applications.job_id
      and j.owner_id = (select auth.uid())
  )
);

create policy "jobs_owner_assign"
on public.jobs for update
to authenticated
using (
  owner_id = (select auth.uid())
  and status = 'open'
  and assigned_to is null
)
with check (
  owner_id = (select auth.uid())
  and status = 'assigned'
  and assigned_to is not null
  and exists (
    select 1 from public.applications a
    where a.job_id = jobs.id
      and a.applicant_id = jobs.assigned_to
      and a.status = 'accepted'
  )
);

create policy "jobs_owner_complete"
on public.jobs for update
to authenticated
using (
  owner_id = (select auth.uid())
  and status = 'assigned'
  and assigned_to is not null
)
with check (
  owner_id = (select auth.uid())
  and status = 'completed'
  and assigned_to is not null
  and exists (
    select 1 from public.applications a
    where a.job_id = jobs.id
      and a.applicant_id = jobs.assigned_to
      and a.status = 'accepted'
  )
);
