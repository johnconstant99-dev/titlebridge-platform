alter table identity_verification_records
  add column if not exists provider_session_id text,
  add column if not exists shareable_url text,
  add column if not exists decision_source text;

create unique index if not exists idv_provider_session_idx
  on identity_verification_records (provider_session_id)
  where provider_session_id is not null;

drop policy if exists idv_own_write on identity_verification_records;
create policy idv_own_write on identity_verification_records
  for insert
  with check (user_id = current_setting('app.user_id', true));

drop policy if exists idv_own_update on identity_verification_records;
create policy idv_own_update on identity_verification_records
  for update
  using (user_id = current_setting('app.user_id', true))
  with check (user_id = current_setting('app.user_id', true));
