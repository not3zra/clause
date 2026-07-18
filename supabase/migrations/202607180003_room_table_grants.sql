grant select, insert, update, delete on public.rooms to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;

grant all on public.rooms to service_role;
grant all on public.assignments to service_role;
