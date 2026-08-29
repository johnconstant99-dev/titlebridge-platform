-- TitleBridge Phase 1B: enforce RLS for ordinary application access.
-- Privileged/service connections (table owner / superuser) still bypass RLS and
-- are reserved for migrations, Better Auth, bootstrap, and first-login inserts.
-- Ordinary customer/staff queries SET LOCAL ROLE titlebridge_app, which is
-- NOSUPERUSER NOBYPASSRLS and therefore cannot bypass row security.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'titlebridge_app') then
    create role titlebridge_app nosuperuser nobypassrls nocreatedb nocreaterole nologin noinherit;
  end if;
end
$$;

do $$
begin
  execute format('grant titlebridge_app to %I', current_user);
exception
  when others then
    -- Membership may already exist, or the connecting role may already be the app role.
    null;
end
$$;

grant usage on schema public to titlebridge_app;

grant select, insert, update, delete on
  profiles,
  user_roles,
  organizations,
  organization_members,
  cases,
  case_notes,
  consent_records,
  audit_logs,
  notifications,
  integration_providers,
  state_configurations,
  vehicles,
  documents,
  identity_verification_records,
  risk_flags,
  compliance_events,
  platform_settings,
  vehicle_ownership,
  vehicle_liens,
  odometer_records,
  title_cases,
  title_case_reviews,
  document_blobs
to titlebridge_app;

grant usage, select on sequence case_number_seq to titlebridge_app;

revoke all on table _migrations from titlebridge_app;
revoke all on table "user" from titlebridge_app;
revoke all on table session from titlebridge_app;
revoke all on table account from titlebridge_app;
revoke all on table verification from titlebridge_app;

-- Catalog / staff tables that previously had no RLS.
alter table organizations enable row level security;
alter table platform_settings enable row level security;
alter table integration_providers enable row level security;
alter table state_configurations enable row level security;

drop policy if exists organizations_staff_read on organizations;
create policy organizations_staff_read on organizations
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists organizations_admin_write on organizations;
create policy organizations_admin_write on organizations
  using (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists organization_members_own on organization_members;
create policy organization_members_own on organization_members
  for select
  using (user_id = current_setting('app.user_id', true));

drop policy if exists organization_members_staff on organization_members;
create policy organization_members_staff on organization_members
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists organization_members_admin on organization_members;
create policy organization_members_admin on organization_members
  using (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists platform_settings_admin on platform_settings;
create policy platform_settings_admin on platform_settings
  using (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists integration_providers_admin on integration_providers;
create policy integration_providers_admin on integration_providers
  for select
  using (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists state_configurations_read on state_configurations;
create policy state_configurations_read on state_configurations
  for select
  using (current_setting('app.user_id', true) is not null and current_setting('app.user_id', true) <> '');

drop policy if exists state_configurations_admin on state_configurations;
create policy state_configurations_admin on state_configurations
  using (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'));

-- Consent: customers may append their own records during onboarding.
drop policy if exists consent_own_insert on consent_records;
create policy consent_own_insert on consent_records
  for insert
  with check (user_id = current_setting('app.user_id', true));

-- Staff may list assignable reviewers. ADMIN write still cannot mint SUPER_ADMIN.
drop policy if exists user_roles_admin_all on user_roles;
drop policy if exists user_roles_staff_read on user_roles;
create policy user_roles_staff_read on user_roles
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists user_roles_admin_insert on user_roles;
create policy user_roles_admin_insert on user_roles
  for insert
  with check (
    current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN')
    and role <> 'SUPER_ADMIN'
  );

drop policy if exists user_roles_admin_update on user_roles;
create policy user_roles_admin_update on user_roles
  for update
  using (
    current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN')
    and role <> 'SUPER_ADMIN'
  )
  with check (
    current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN')
    and role <> 'SUPER_ADMIN'
  );

drop policy if exists user_roles_admin_delete on user_roles;
create policy user_roles_admin_delete on user_roles
  for delete
  using (
    current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN')
    and role <> 'SUPER_ADMIN'
  );

-- Customers may see info-request / rejection review rows on their own cases.
drop policy if exists title_case_reviews_customer_read on title_case_reviews;
create policy title_case_reviews_customer_read on title_case_reviews
  for select
  using (
    exists (
      select 1 from title_cases t
      where t.id = title_case_reviews.title_case_id
        and t.customer_id = current_setting('app.user_id', true)
    )
  );

drop policy if exists case_notes_customer_insert on case_notes;
create policy case_notes_customer_insert on case_notes
  for insert
  with check (
    author_id = current_setting('app.user_id', true)
    and visibility = 'customer'
    and exists (
      select 1 from cases c
      where c.id = case_notes.case_id
        and c.customer_id = current_setting('app.user_id', true)
    )
  );

-- Authenticated actors may append audit events as themselves. Anonymous inserts are denied.
drop policy if exists audit_logs_append on audit_logs;
create policy audit_logs_append on audit_logs
  for insert
  with check (
    current_setting('app.user_id', true) is not null
    and current_setting('app.user_id', true) <> ''
    and (
      actor_user_id = current_setting('app.user_id', true)
      or current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN')
    )
  );

-- Split customer case access so DELETE of another customer's case is impossible,
-- and assignment is blocked by trigger even if a customer updates their own row.
drop policy if exists cases_customer_own on cases;
create policy cases_customer_select on cases
  for select
  using (customer_id = current_setting('app.user_id', true));

create policy cases_customer_insert on cases
  for insert
  with check (customer_id = current_setting('app.user_id', true));

create policy cases_customer_update on cases
  for update
  using (customer_id = current_setting('app.user_id', true))
  with check (customer_id = current_setting('app.user_id', true));

create or replace function prevent_customer_assignment()
returns trigger as $$
begin
  if current_setting('app.role', true) = 'CUSTOMER'
     and new.assigned_to is distinct from old.assigned_to then
    raise exception 'customers cannot assign cases';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cases_no_customer_assign on cases;
create trigger cases_no_customer_assign
  before update on cases
  for each row execute procedure prevent_customer_assignment();

create or replace function protect_lien_status()
returns trigger as $$
begin
  if new.status = 'verified' then
    raise exception 'lien verification requires a configured provider';
  end if;
  if current_setting('app.role', true) = 'CUSTOMER'
     and new.status not in ('unknown', 'customer_reports_no_lien', 'customer_reports_lien') then
    raise exception 'customers cannot set that lien status';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists vehicle_liens_protect_status on vehicle_liens;
create trigger vehicle_liens_protect_status
  before insert or update on vehicle_liens
  for each row execute procedure protect_lien_status();
