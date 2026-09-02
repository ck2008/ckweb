create table public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
create policy "own messages" on public.messages for all using (owner_id=auth.uid()) with check (owner_id=auth.uid());
grant select, insert, update, delete on public.messages to authenticated;
grant all privileges on public.messages to service_role;
drop function public.claim_next_task(uuid);
create function public.claim_next_task(p_worker_id uuid) returns table(task_id uuid, run_id uuid, title text, instructions text, owner_id uuid, project_id uuid) language plpgsql security definer set search_path=public as $$
declare t public.tasks; r uuid;
begin
  select * into t from public.tasks where status='queued' order by created_at for update skip locked limit 1;
  if not found then return; end if;
  update public.tasks set status='running',claimed_by=p_worker_id,claimed_at=now() where id=t.id;
  insert into public.task_runs(task_id,worker_id) values(t.id,p_worker_id) returning id into r;
  return query select t.id,r,t.title,t.instructions,t.owner_id,t.project_id;
end; $$;
grant execute on function public.claim_next_task(uuid) to service_role;
