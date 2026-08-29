-- Phase 1B RLS follow-up: staff may update lien statements during internal review.
-- Application-level authorization remains primary. Table owner still bypasses RLS
-- unless a future restricted role is used with FORCE ROW LEVEL SECURITY.

drop policy if exists vehicle_liens_staff_update on vehicle_liens;
create policy vehicle_liens_staff_update on vehicle_liens
  for update
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists cases_staff_assign on cases;
create policy cases_staff_assign on cases
  for update
  using (current_setting('app.role', true) in ('OPERATIONS', 'ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('OPERATIONS', 'ADMIN', 'SUPER_ADMIN'));
