-- The service_role key remains local to the Windows worker. Browser users keep RLS-only access.
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.profiles, public.projects, public.prompts, public.tasks, public.files to authenticated;
grant select on public.task_runs, public.task_outputs, public.workers to authenticated;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.claim_next_task(uuid) to service_role;
