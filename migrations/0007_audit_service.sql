-- Audit events are authoritative. Customers (and the application role in
-- general) cannot INSERT/UPDATE/DELETE audit_logs. Trusted server-side
-- handlers write them on the privileged connection.

drop policy if exists audit_logs_append on audit_logs;

revoke insert, update, delete on audit_logs from titlebridge_app;
grant select on audit_logs to titlebridge_app;
