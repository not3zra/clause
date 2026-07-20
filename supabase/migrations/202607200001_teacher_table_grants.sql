-- Policies alone are not sufficient: Postgres also requires table privileges
-- before RLS can evaluate the authenticated teacher's access.
grant select, update on public.teacher_profiles to authenticated;
grant select, insert, update, delete on public.classes to authenticated;

grant all on public.teacher_profiles, public.classes to service_role;
