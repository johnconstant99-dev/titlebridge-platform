-- Promote IDV status model and store structured Plaid check outcomes.
alter table identity_verification_records
  add column if not exists check_outcomes jsonb;

-- Expand allowed statuses: rename manual_review -> needs_review, add retry_required.
alter table identity_verification_records
  drop constraint if exists identity_verification_records_status_check;

update identity_verification_records
set status = 'needs_review'
where status = 'manual_review';

alter table identity_verification_records
  add constraint identity_verification_records_status_check
  check (status in (
    'not_started',
    'pending',
    'verified',
    'needs_review',
    'retry_required',
    'failed',
    'expired'
  ));
