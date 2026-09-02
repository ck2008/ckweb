alter table public.projects add column parent_id uuid references public.projects(id) on delete cascade;
alter table public.tasks drop constraint tasks_project_id_fkey;
alter table public.tasks add constraint tasks_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade;
alter table public.files drop constraint files_project_id_fkey;
alter table public.files add constraint files_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade;
alter table public.prompts drop constraint prompts_project_id_fkey;
alter table public.prompts add constraint prompts_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade;
