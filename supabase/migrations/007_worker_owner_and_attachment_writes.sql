-- Two holes this closes.
--
-- 1. claim_next_task ignored ownership, so any account that signed up could
--    queue a task and have it executed by the local Codex CLI, which runs with
--    `approval: never` and `sandbox: workspace-write` over WORKSPACE_ROOT.
--    Each worker is now bound to one owner and only ever claims that owner's
--    tasks. An unbound worker claims nothing (fail closed) rather than
--    everything, so a fresh deployment is safe before it is configured.
--
-- 2. message_attachments and task_files had INSERT granted but no RLS policy
--    for it, so the browser's inserts were rejected silently. task_files
--    stayed empty and the worker's --image path never ran, which meant image
--    attachments were quietly dropped.

alter table public.workers add column owner_id uuid references auth.users(id) on delete cascade;

-- Single-tenant deployment: the account that registered first owns the worker.
-- Re-point it with: update public.workers set owner_id='<uuid>' where id='<worker uuid>';
update public.workers set owner_id=(select id from auth.users order by created_at limit 1) where owner_id is null;

-- owner_id is part of the row, so the old "any signed-in user" policy would
-- expose which account a worker belongs to.
drop policy "worker status visible" on public.workers;
create policy "own workers" on public.workers for select using (owner_id=auth.uid());

drop function public.claim_next_task(uuid);
create function public.claim_next_task(p_worker_id uuid) returns table(task_id uuid, run_id uuid, title text, instructions text, owner_id uuid, project_id uuid) language plpgsql security definer set search_path=public as $$
declare t public.tasks; r uuid; o uuid;
begin
  select w.owner_id into o from public.workers w where w.id=p_worker_id;
  if o is null then return; end if;
  select * into t from public.tasks tk where tk.status='queued' and tk.owner_id=o order by tk.created_at for update skip locked limit 1;
  if not found then return; end if;
  update public.tasks set status='running',claimed_by=p_worker_id,claimed_at=now() where id=t.id;
  insert into public.task_runs(task_id,worker_id) values(t.id,p_worker_id) returning id into r;
  return query select t.id,r,t.title,t.instructions,t.owner_id,t.project_id;
end; $$;
grant execute on function public.claim_next_task(uuid) to service_role;

-- Supports the ownership-filtered claim above.
create index tasks_claim_idx on public.tasks (status, owner_id, created_at);

create policy "insert own message attachments" on public.message_attachments for insert with check (exists(select 1 from public.messages m where m.id=message_id and m.owner_id=auth.uid()));
create policy "insert own task files" on public.task_files for insert with check (exists(select 1 from public.tasks t where t.id=task_id and t.owner_id=auth.uid()));
