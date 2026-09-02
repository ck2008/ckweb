create or replace function public.attach_worker_reply_to_conversation() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.role='assistant' and new.conversation_id is null and new.task_id is not null then
    select conversation_id into new.conversation_id from public.messages where task_id=new.task_id and role='user' order by created_at limit 1;
  end if;
  return new;
end; $$;
create trigger attach_worker_reply_to_conversation before insert on public.messages for each row execute procedure public.attach_worker_reply_to_conversation();
