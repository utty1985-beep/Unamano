-- UnaMano - funzioni RPC applicative
-- Queste funzioni usano SECURITY INVOKER: RLS resta attiva e i permessi seguono l'utente autenticato.

create or replace function public.accept_application(p_application uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  a public.applications;
  j public.jobs;
begin
  select * into a from public.applications where id = p_application for update;
  if not found then raise exception 'Candidatura non trovata'; end if;

  select * into j from public.jobs where id = a.job_id for update;
  if j.owner_id <> (select auth.uid()) then raise exception 'Non autorizzato'; end if;
  if j.status <> 'open' or a.status <> 'pending' then raise exception 'Annuncio o candidatura non disponibile'; end if;

  update public.applications
     set status = case when id = p_application then 'accepted' else 'declined' end
   where job_id = a.job_id and status = 'pending';

  update public.jobs
     set status = 'assigned', assigned_to = a.applicant_id
   where id = a.job_id;
end;
$$;

create or replace function public.complete_job(p_job uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.jobs
     set status = 'completed'
   where id = p_job
     and owner_id = (select auth.uid())
     and status = 'assigned'
     and assigned_to is not null;

  if not found then raise exception 'Lavoro non trovato o non autorizzato'; end if;
end;
$$;

create or replace function public.withdraw_application(p_application uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.applications
     set status = 'withdrawn'
   where id = p_application
     and applicant_id = (select auth.uid())
     and status = 'pending';

  if not found then raise exception 'Candidatura non trovata o non ritirabile'; end if;
end;
$$;

revoke all on function public.accept_application(uuid) from public, anon;
revoke all on function public.complete_job(uuid) from public, anon;
revoke all on function public.withdraw_application(uuid) from public, anon;

grant execute on function public.accept_application(uuid) to authenticated;
grant execute on function public.complete_job(uuid) to authenticated;
grant execute on function public.withdraw_application(uuid) to authenticated;
