CREATE INDEX media_staged_cleanup ON media_assets(created_at) WHERE state='staged';
CREATE INDEX job_lease_recovery ON jobs(lease_until) WHERE status='running';
CREATE INDEX outbox_due_delivery ON outbox(next_attempt,id) WHERE published_at IS NULL AND attempts<10;
CREATE INDEX rate_bucket_retention ON rate_buckets(window_start);
CREATE INDEX ws_ticket_retention ON ws_tickets(expires_at);
