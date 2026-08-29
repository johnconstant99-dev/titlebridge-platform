-- TitleBridge Phase 1B: vehicles, ownership, documents, title cases, liens, odometer.
-- Independent technology platform — not a government, DMV, AAMVA, or NMVTIS system.
-- Application-level authorization remains primary. RLS is defense-in-depth.

alter table vehicles add column if not exists vin text;
alter table vehicles add column if not exists vin_normalized text;
alter table vehicles add column if not exists year integer;
alter table vehicles add column if not exists make text;
alter table vehicles add column if not exists model text;
alter table vehicles add column if not exists trim text;
alter table vehicles add column if not exists color text;
alter table vehicles add column if not exists plate_number text;
alter table vehicles add column if not exists plate_state text;
alter table vehicles add column if not exists vin_format_valid boolean not null default false;
alter table vehicles add column if not exists vin_checksum_valid boolean not null default false;
alter table vehicles add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('unverified', 'format_validated', 'provider_verified'));
alter table vehicles add column if not exists provider_message text;

alter table vehicles drop constraint if exists vehicles_status_check;
alter table vehicles add constraint vehicles_status_check
  check (status in ('placeholder', 'draft', 'active', 'archived'));

create unique index if not exists vehicles_owner_vin_idx
  on vehicles (owner_user_id, vin_normalized)
  where vin_normalized is not null;

create table if not exists vehicle_ownership (
  id text primary key,
  vehicle_id text not null references vehicles (id) on delete cascade,
  owner_user_id text not null,
  ownership_type text not null
    check (ownership_type in ('sole', 'joint', 'business', 'financed', 'leased', 'other')),
  owner_name text not null,
  acquisition_date date,
  purchase_price numeric,
  seller_name text,
  verification_status text not null default 'self_reported'
    check (verification_status in (
      'self_reported', 'under_review', 'info_requested', 'rejected', 'verified'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vehicle_ownership_vehicle_idx on vehicle_ownership (vehicle_id);
create index if not exists vehicle_ownership_owner_idx on vehicle_ownership (owner_user_id);

create table if not exists vehicle_liens (
  id text primary key,
  vehicle_id text not null references vehicles (id) on delete cascade,
  owner_user_id text not null,
  title_case_id text,
  status text not null default 'unknown'
    check (status in (
      'unknown',
      'customer_reports_no_lien',
      'customer_reports_lien',
      'document_uploaded',
      'under_review',
      'released',
      'verified'
    )),
  lienholder_name text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vehicle_liens_vehicle_idx on vehicle_liens (vehicle_id);
create index if not exists vehicle_liens_owner_idx on vehicle_liens (owner_user_id);

create table if not exists odometer_records (
  id text primary key,
  vehicle_id text not null references vehicles (id) on delete cascade,
  owner_user_id text not null,
  reading integer not null,
  unit text not null default 'miles' check (unit in ('miles', 'kilometers')),
  source text not null default 'customer_reported',
  recorded_at date,
  created_at timestamptz not null default now()
);
create index if not exists odometer_vehicle_idx on odometer_records (vehicle_id);
create index if not exists odometer_owner_idx on odometer_records (owner_user_id);

alter table cases drop constraint if exists cases_case_type_check;
alter table cases add constraint cases_case_type_check
  check (case_type in (
    'title', 'registration', 'title_transfer', 'lien_release',
    'duplicate_title', 'vehicle_sale', 'correction', 'ownership_change',
    'private_party_sale', 'dealer_sale', 'other'
  ));

create table if not exists title_cases (
  id text primary key,
  case_id text not null unique references cases (id) on delete cascade,
  vehicle_id text not null references vehicles (id) on delete restrict,
  customer_id text not null,
  transaction_type text not null
    check (transaction_type in (
      'title_transfer', 'duplicate_title', 'correction', 'lien_release',
      'ownership_change', 'private_party_sale', 'dealer_sale', 'other'
    )),
  current_step text not null default 'vehicle'
    check (current_step in (
      'vehicle', 'ownership', 'title', 'lien', 'documents', 'review', 'submitted'
    )),
  title_state text,
  title_number_last4 text,
  title_issue_date date,
  title_notes text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists title_cases_customer_idx on title_cases (customer_id);
create index if not exists title_cases_vehicle_idx on title_cases (vehicle_id);

create table if not exists title_case_reviews (
  id text primary key,
  title_case_id text not null references title_cases (id) on delete cascade,
  section text not null
    check (section in ('ownership', 'title', 'lien', 'documents', 'case')),
  action text not null
    check (action in (
      'approved', 'info_requested', 'flagged', 'rejected', 'assigned', 'reassigned'
    )),
  note text,
  actor_user_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists title_case_reviews_case_idx on title_case_reviews (title_case_id);

alter table documents add column if not exists vehicle_id text references vehicles (id) on delete set null;
alter table documents add column if not exists title_case_id text references title_cases (id) on delete set null;
alter table documents add column if not exists content_type text;
alter table documents add column if not exists byte_size integer;
alter table documents add column if not exists original_name text;
alter table documents add column if not exists vault text not null default 'application_private';

alter table documents drop constraint if exists documents_status_check;
alter table documents add constraint documents_status_check
  check (status in ('placeholder', 'pending', 'available', 'quarantined', 'rejected'));

alter table documents drop constraint if exists documents_document_type_check;
alter table documents add constraint documents_document_type_check
  check (document_type in (
    'title', 'registration', 'bill_of_sale', 'lien_release',
    'purchase_agreement', 'odometer_disclosure', 'insurance_document',
    'supporting_document', 'other'
  ));

create index if not exists documents_vehicle_idx on documents (vehicle_id);
create index if not exists documents_title_case_idx on documents (title_case_id);

create table if not exists document_blobs (
  id text primary key,
  document_id text not null unique references documents (id) on delete cascade,
  content bytea not null,
  created_at timestamptz not null default now()
);

alter table vehicle_ownership enable row level security;
alter table vehicle_liens enable row level security;
alter table odometer_records enable row level security;
alter table title_cases enable row level security;
alter table title_case_reviews enable row level security;
alter table document_blobs enable row level security;

drop policy if exists vehicle_ownership_own on vehicle_ownership;
create policy vehicle_ownership_own on vehicle_ownership
  using (owner_user_id = current_setting('app.user_id', true))
  with check (owner_user_id = current_setting('app.user_id', true));

drop policy if exists vehicle_ownership_staff on vehicle_ownership;
create policy vehicle_ownership_staff on vehicle_ownership
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists vehicle_liens_own on vehicle_liens;
create policy vehicle_liens_own on vehicle_liens
  using (owner_user_id = current_setting('app.user_id', true))
  with check (owner_user_id = current_setting('app.user_id', true));

drop policy if exists vehicle_liens_staff on vehicle_liens;
create policy vehicle_liens_staff on vehicle_liens
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists odometer_own on odometer_records;
create policy odometer_own on odometer_records
  using (owner_user_id = current_setting('app.user_id', true))
  with check (owner_user_id = current_setting('app.user_id', true));

drop policy if exists odometer_staff on odometer_records;
create policy odometer_staff on odometer_records
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists title_cases_own on title_cases;
create policy title_cases_own on title_cases
  using (customer_id = current_setting('app.user_id', true))
  with check (customer_id = current_setting('app.user_id', true));

drop policy if exists title_cases_staff on title_cases;
create policy title_cases_staff on title_cases
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists title_case_reviews_staff on title_case_reviews;
create policy title_case_reviews_staff on title_case_reviews
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'))
  with check (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists vehicles_staff_read on vehicles;
create policy vehicles_staff_read on vehicles
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists documents_staff_read on documents;
create policy documents_staff_read on documents
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));

drop policy if exists document_blobs_own on document_blobs;
create policy document_blobs_own on document_blobs
  using (
    exists (
      select 1 from documents d
      where d.id = document_blobs.document_id
        and d.owner_user_id = current_setting('app.user_id', true)
    )
  );

drop policy if exists document_blobs_staff on document_blobs;
create policy document_blobs_staff on document_blobs
  for select
  using (current_setting('app.role', true) in ('OPERATIONS', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN'));
