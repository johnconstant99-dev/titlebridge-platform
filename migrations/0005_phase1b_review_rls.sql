-- Phase 1B RLS follow-up: staff internal review, assignment side-effects, and
-- private document access. Application-level authorization remains primary.
-- Table owner still bypasses RLS unless a future restricted role uses
-- FORCE ROW LEVEL SECURITY.

drop policy if exists title_cases_staff_update on title_cases;
create policy title_cases_staff_update on title_cases
  for update
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists cases_staff_review_update on cases;
create policy cases_staff_review_update on cases
  for update
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists notifications_staff_insert on notifications;
create policy notifications_staff_insert on notifications
  for insert
  with check (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists audit_logs_append on audit_logs;
create policy audit_logs_append on audit_logs
  for insert
  with check (true);

drop policy if exists risk_flags_staff_write on risk_flags;
create policy risk_flags_staff_write on risk_flags
  for insert
  with check (current_setting('app.role', true) in ('COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists compliance_events_staff_write on compliance_events;
create policy compliance_events_staff_write on compliance_events
  for insert
  with check (current_setting('app.role', true) in ('COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));
