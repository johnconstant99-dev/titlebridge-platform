-- TitleBridge application schema (Phase 1B Private Beta foundation).
-- Independent technology platform — not a government, DMV, AAMVA, or NMVTIS system.
-- user_id columns are TEXT (Better Auth ids / preview 'dev-user').
-- Application-level authorization is the primary control. RLS policies are
-- defense-in-depth for a future restricted database role (table owner currently
-- bypasses RLS unless FORCE ROW LEVEL SECURITY is enabled with session GUCs).

create sequence if not exists case_number_seq start with 1 increment by 1;

create table if not exists profiles (
  id text primary key,
  user_id text not null unique,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  state text,
  notification_preference text not null default 'email'
    check (notification_preference in ('email', 'sms', 'none')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_user_id_idx on profiles (user_id);
create index if not exists profiles_state_idx on profiles (state);

create table if not exists user_roles (
  id text primary key,
  user_id text not null,
  role text not null
    check (role in ('CUSTOMER', 'OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN')),
  assigned_by text,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists user_roles_user_id_idx on user_roles (user_id);
create index if not exists user_roles_role_idx on user_roles (role);

create table if not exists organizations (
  id text primary key,
  organization_name text not null,
  organization_type text not null
    check (organization_type in (
      'dealership', 'lender', 'fleet', 'title_service',
      'auction', 'insurance', 'enterprise', 'internal'
    )),
  status text not null default 'active'
    check (status in ('active', 'inactive', 'pending', 'suspended')),
  is_development_data boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists organizations_type_idx on organizations (organization_type);

create table if not exists organization_members (
  id text primary key,
  organization_id text not null references organizations (id) on delete cascade,
  user_id text not null,
  organization_role text not null default 'member'
    check (organization_role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended', 'removed')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index if not exists organization_members_user_id_idx on organization_members (user_id);
create index if not exists organization_members_org_id_idx on organization_members (organization_id);

create table if not exists cases (
  id text primary key,
  case_number text not null unique,
  customer_id text not null,
  organization_id text references organizations (id) on delete set null,
  case_type text not null
    check (case_type in (
      'title', 'registration', 'title_transfer',
      'lien_release', 'duplicate_title', 'vehicle_sale'
    )),
  status text not null default 'draft'
    check (status in (
      'draft', 'awaiting_customer', 'under_review', 'verification_required',
      'documents_required', 'ready_for_submission', 'submitted',
      'processing', 'completed', 'rejected', 'cancelled'
    )),
  jurisdiction text,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cases_customer_id_idx on cases (customer_id);
create index if not exists cases_status_idx on cases (status);
create index if not exists cases_assigned_to_idx on cases (assigned_to);
create index if not exists cases_org_id_idx on cases (organization_id);

create table if not exists case_notes (
  id text primary key,
  case_id text not null references cases (id) on delete cascade,
  author_id text not null,
  note text not null,
  visibility text not null default 'internal'
    check (visibility in ('internal', 'customer')),
  created_at timestamptz not null default now()
);
create index if not exists case_notes_case_id_idx on case_notes (case_id);

create table if not exists consent_records (
  id text primary key,
  user_id text not null,
  consent_type text not null,
  consent_version text not null,
  accepted boolean not null,
  accepted_at timestamptz,
  ip_metadata text,
  user_agent_metadata text,
  created_at timestamptz not null default now()
);
create index if not exists consent_records_user_id_idx on consent_records (user_id);
create index if not exists consent_records_type_idx on consent_records (consent_type);

create table if not exists audit_logs (
  id text primary key,
  actor_user_id text,
  actor_role text,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  timestamp timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on audit_logs (actor_user_id);
create index if not exists audit_logs_action_idx on audit_logs (action);
create index if not exists audit_logs_resource_idx on audit_logs (resource_type, resource_id);
create index if not exists audit_logs_timestamp_idx on audit_logs (timestamp desc);

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_id_idx on notifications (user_id);
create index if not exists notifications_unread_idx on notifications (user_id, read_at);

create table if not exists integration_providers (
  id text primary key,
  provider_type text not null
    check (provider_type in (
      'identity', 'vin', 'vehicle_history', 'nmvtis', 'elt', 'evr',
      'ert', 'state_dmv', 'payments', 'esignature', 'storage'
    )),
  provider_name text not null,
  environment text not null default 'sandbox'
    check (environment in ('sandbox', 'staging', 'production')),
  status text not null default 'not_configured'
    check (status in ('not_configured', 'configured', 'disabled', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists integration_providers_type_env_idx
  on integration_providers (provider_type, environment);

-- Secrets must never be stored in integration_providers.

create table if not exists state_configurations (
  id text primary key,
  state_code text not null unique,
  state_name text not null,
  digital_title_supported text not null default 'unverified'
    check (digital_title_supported in ('unverified', 'yes', 'no')),
  electronic_registration_supported text not null default 'unverified'
    check (electronic_registration_supported in ('unverified', 'yes', 'no')),
  elt_supported text not null default 'unverified'
    check (elt_supported in ('unverified', 'yes', 'no')),
  provider_required boolean not null default true,
  configuration_status text not null default 'configuration_required'
    check (configuration_status in (
      'configuration_required', 'unverified', 'sandbox', 'live'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Foundational placeholders for later phases. No live vehicle/title data in 1A.
create table if not exists vehicles (
  id text primary key,
  owner_user_id text not null,
  display_name text,
  status text not null default 'placeholder'
    check (status in ('placeholder', 'draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vehicles_owner_idx on vehicles (owner_user_id);

create table if not exists documents (
  id text primary key,
  owner_user_id text not null,
  case_id text references cases (id) on delete set null,
  document_type text not null default 'other',
  file_name text not null,
  storage_key text,
  status text not null default 'placeholder'
    check (status in ('placeholder', 'pending', 'available', 'quarantined')),
  created_at timestamptz not null default now()
);
create index if not exists documents_owner_idx on documents (owner_user_id);
create index if not exists documents_case_idx on documents (case_id);

create table if not exists identity_verification_records (
  id text primary key,
  user_id text not null,
  provider text not null default 'unconfigured',
  status text not null default 'not_started'
    check (status in (
      'not_started', 'pending', 'verified', 'failed', 'expired', 'manual_review'
    )),
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idv_user_idx on identity_verification_records (user_id);

create table if not exists risk_flags (
  id text primary key,
  user_id text,
  case_id text references cases (id) on delete set null,
  flag_type text not null,
  severity text not null default 'info'
    check (severity in ('info', 'low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'cleared')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists risk_flags_user_idx on risk_flags (user_id);

create table if not exists compliance_events (
  id text primary key,
  user_id text,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists compliance_events_user_idx on compliance_events (user_id);

create table if not exists platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Append-only audit history. Application code never issues UPDATE/DELETE.
create or replace function prevent_audit_mutation()
returns trigger as $$
begin
  raise exception 'audit_logs are append-only';
end;
$$ language plpgsql;

drop trigger if exists audit_logs_no_update on audit_logs;
create trigger audit_logs_no_update
  before update or delete on audit_logs
  for each row execute procedure prevent_audit_mutation();

create or replace function prevent_consent_mutation()
returns trigger as $$
begin
  raise exception 'consent_records are append-only';
end;
$$ language plpgsql;

drop trigger if exists consent_records_no_update on consent_records;
create trigger consent_records_no_update
  before update or delete on consent_records
  for each row execute procedure prevent_consent_mutation();

-- Row Level Security (defense in depth). Queries are still scoped in application
-- code. These policies describe the intended model for a future restricted role.
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table organization_members enable row level security;
alter table cases enable row level security;
alter table case_notes enable row level security;
alter table consent_records enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;
alter table vehicles enable row level security;
alter table documents enable row level security;
alter table identity_verification_records enable row level security;
alter table risk_flags enable row level security;
alter table compliance_events enable row level security;

drop policy if exists profiles_owner_all on profiles;
create policy profiles_owner_all on profiles
  using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

drop policy if exists profiles_staff_read on profiles;
create policy profiles_staff_read on profiles
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists user_roles_own_read on user_roles;
create policy user_roles_own_read on user_roles
  for select
  using (user_id = current_setting('app.user_id', true));

drop policy if exists user_roles_admin_all on user_roles;
create policy user_roles_admin_all on user_roles
  using (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('ADMIN', 'SUPER_ADMIN'));

drop policy if exists cases_customer_own on cases;
create policy cases_customer_own on cases
  using (customer_id = current_setting('app.user_id', true))
  with check (customer_id = current_setting('app.user_id', true));

drop policy if exists cases_staff_read on cases;
create policy cases_staff_read on cases
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists cases_ops_write on cases;
create policy cases_ops_write on cases
  for update
  using (current_setting('app.role', true) in ('OPERATIONS', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists case_notes_customer_visible on case_notes;
create policy case_notes_customer_visible on case_notes
  for select
  using (
    visibility = 'customer'
    and exists (
      select 1 from cases c
      where c.id = case_notes.case_id
        and c.customer_id = current_setting('app.user_id', true)
    )
  );

drop policy if exists case_notes_staff on case_notes;
create policy case_notes_staff on case_notes
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists consent_own on consent_records;
create policy consent_own on consent_records
  for select
  using (user_id = current_setting('app.user_id', true));

drop policy if exists consent_compliance on consent_records;
create policy consent_compliance on consent_records
  for select
  using (current_setting('app.role', true) in ('COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists notifications_own on notifications;
create policy notifications_own on notifications
  using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));

drop policy if exists vehicles_own on vehicles;
create policy vehicles_own on vehicles
  using (owner_user_id = current_setting('app.user_id', true))
  with check (owner_user_id = current_setting('app.user_id', true));

drop policy if exists documents_own on documents;
create policy documents_own on documents
  using (owner_user_id = current_setting('app.user_id', true))
  with check (owner_user_id = current_setting('app.user_id', true));

drop policy if exists audit_staff_read on audit_logs;
create policy audit_staff_read on audit_logs
  for select
  using (current_setting('app.role', true) in ('COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists idv_own_read on identity_verification_records;
create policy idv_own_read on identity_verification_records
  for select
  using (user_id = current_setting('app.user_id', true));

drop policy if exists idv_compliance on identity_verification_records;
create policy idv_compliance on identity_verification_records
  for select
  using (current_setting('app.role', true) in ('COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists risk_compliance on risk_flags;
create policy risk_compliance on risk_flags
  for select
  using (current_setting('app.role', true) in ('COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists compliance_events_staff on compliance_events;
create policy compliance_events_staff on compliance_events
  for select
  using (current_setting('app.role', true) in ('COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));
