CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE CHECK(email=lower(trim(email))),
 password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('buyer','seller')),
 name text NOT NULL DEFAULT '', allergen_filters text[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), family_id uuid NOT NULL,
 refresh_hash text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz, consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON sessions(family_id);
CREATE TABLE merchant_profiles (
 user_id uuid PRIMARY KEY REFERENCES users(id), shop_name text NOT NULL DEFAULT '', address text NOT NULL DEFAULT '',
 latitude double precision CHECK(latitude BETWEEN -90 AND 90), longitude double precision CHECK(longitude BETWEEN -180 AND 180),
 photo_id uuid, bank_masked text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seller_id uuid NOT NULL REFERENCES users(id),
 category text NOT NULL CHECK(category IN ('makanan_berat','roti_kudapan','buah_sayur','campuran')),
 allergens text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),
 quota_total integer NOT NULL CHECK(quota_total BETWEEN 1 AND 500), quota_available integer NOT NULL CHECK(quota_available>=0),
 quota_held integer NOT NULL DEFAULT 0 CHECK(quota_held>=0), quota_sold integer NOT NULL DEFAULT 0 CHECK(quota_sold>=0),
 normal_price integer NOT NULL CHECK(normal_price>0), discount_price integer NOT NULL CHECK(discount_price>0),
 pickup_start timestamptz NOT NULL, pickup_end timestamptz NOT NULL, safe_eat_until timestamptz NOT NULL,
 fitness_confirmed boolean NOT NULL CHECK(fitness_confirmed), created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(quota_total=quota_available+quota_held+quota_sold),
 CHECK(discount_price::bigint*100 BETWEEN normal_price::bigint*30 AND normal_price::bigint*50),
 CHECK(pickup_end>pickup_start AND safe_eat_until>=pickup_end)
);
CREATE INDEX ON offers(pickup_end,created_at DESC,id DESC) WHERE status='active' AND quota_available>0;
CREATE INDEX ON offers(seller_id,created_at DESC,id DESC);
CREATE TABLE orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, invoice text UNIQUE NOT NULL,
 offer_id uuid NOT NULL REFERENCES offers(id), buyer_id uuid NOT NULL REFERENCES users(id), seller_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL CHECK(status IN ('pending_payment','paid','cancelled','completed','dispute','refunded','no_show')),
 price integer NOT NULL CHECK(price>0), fee integer NOT NULL CHECK(fee>=0 AND fee<=price), fee_bps integer NOT NULL CHECK(fee_bps BETWEEN 0 AND 10000),
 snapshot jsonb NOT NULL, payment_deadline timestamptz NOT NULL, pickup_start timestamptz NOT NULL, pickup_end timestamptz NOT NULL,
 safe_eat_until timestamptz NOT NULL, paid_at timestamptz, completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON orders(buyer_id,created_at DESC,id DESC);
CREATE INDEX ON orders(seller_id,created_at DESC,id DESC);
CREATE INDEX ON orders(offer_id);
CREATE TABLE payment_intents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid UNIQUE NOT NULL REFERENCES orders(id),
 amount integer NOT NULL CHECK(amount>0), currency text NOT NULL CHECK(currency='IDR'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','succeeded','failed','expired')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payment_events (
 id text PRIMARY KEY, intent_id uuid NOT NULL REFERENCES payment_intents(id), payload_hash text NOT NULL, outcome text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE checkout_reservations (
 order_id uuid PRIMARY KEY REFERENCES orders(id), status text NOT NULL CHECK(status IN ('held','sold','released')), expires_at timestamptz NOT NULL
);
CREATE TABLE pickup_credentials (
 order_id uuid PRIMARY KEY REFERENCES orders(id), token_hash text NOT NULL, encrypted_data text NOT NULL,
 used_at timestamptz, disabled_at timestamptz, attempts integer NOT NULL DEFAULT 0, attempt_window timestamptz
);
CREATE TABLE media_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL CHECK(kind IN ('shop','evidence')),
 path text UNIQUE NOT NULL, mime text NOT NULL, sha256 text NOT NULL, bytes integer NOT NULL CHECK(bytes>0),
 state text NOT NULL CHECK(state IN ('staged','attached')), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE merchant_profiles ADD FOREIGN KEY(photo_id) REFERENCES media_assets(id);
CREATE TABLE complaints (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid UNIQUE NOT NULL REFERENCES orders(id), buyer_id uuid NOT NULL REFERENCES users(id),
 reason text NOT NULL CHECK(reason IN ('unfit','unavailable','allergen','store_closed')), description text NOT NULL,
 status text NOT NULL CHECK(status IN ('open','approved','rejected','auto_refunded')), response text, response_due timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz
);
CREATE TABLE complaint_media (
 complaint_id uuid NOT NULL REFERENCES complaints(id), media_id uuid UNIQUE NOT NULL REFERENCES media_assets(id), PRIMARY KEY(complaint_id,media_id)
);
CREATE TABLE refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid UNIQUE NOT NULL REFERENCES orders(id), amount integer NOT NULL CHECK(amount>0),
 reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE payout_entitlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid UNIQUE NOT NULL REFERENCES orders(id), seller_id uuid NOT NULL REFERENCES users(id),
 gross integer NOT NULL CHECK(gross>0), fee integer NOT NULL CHECK(fee>=0 AND fee<=gross), net integer NOT NULL CHECK(net=gross-fee),
 status text NOT NULL CHECK(status IN ('pending','held','settled','cancelled')), due_at timestamptz NOT NULL,
 reason text NOT NULL, settled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON payout_entitlements(seller_id,created_at DESC,id DESC);
CREATE TABLE payout_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entitlement_id uuid NOT NULL REFERENCES payout_entitlements(id),
 kind text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(entitlement_id,kind)
);
CREATE TABLE ledger_entries (
 id bigserial PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id), kind text NOT NULL CHECK(kind IN ('funds_held','refund','fee','payout_scheduled','payout_settled')),
 amount integer NOT NULL CHECK(amount>=0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,kind)
);
CREATE TABLE reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid UNIQUE NOT NULL REFERENCES orders(id), buyer_id uuid NOT NULL REFERENCES users(id),
 seller_id uuid NOT NULL REFERENCES users(id), rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), comment text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON reviews(seller_id,created_at DESC,id DESC);
CREATE TABLE notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sequence bigserial UNIQUE NOT NULL, user_id uuid NOT NULL REFERENCES users(id),
 type text NOT NULL, resource_id uuid NOT NULL, summary text NOT NULL, read_at timestamptz, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON notifications(user_id,sequence);
CREATE TABLE outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notification_id uuid UNIQUE NOT NULL REFERENCES notifications(id),
 published_at timestamptz, attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, resource_id uuid NOT NULL,
 due_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','done','failed')),
 attempts integer NOT NULL DEFAULT 0, lease_until timestamptz, lease_token uuid, last_error text,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,resource_id)
);
CREATE INDEX ON jobs(due_at) WHERE status IN ('pending','running');
CREATE TABLE idempotency_keys (
 actor_id uuid NOT NULL REFERENCES users(id), operation text NOT NULL, key text NOT NULL,
 payload_hash text NOT NULL, response jsonb, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(actor_id,operation,key)
);
CREATE TABLE audit_logs (
 id bigserial PRIMARY KEY, actor_id uuid REFERENCES users(id), resource_id uuid NOT NULL, action text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON audit_logs(resource_id,id);
CREATE TABLE rate_buckets (
 key text NOT NULL, window_start timestamptz NOT NULL, attempts integer NOT NULL, PRIMARY KEY(key,window_start)
);
CREATE TABLE ws_tickets (
 hash text PRIMARY KEY, session_id uuid NOT NULL REFERENCES sessions(id), expires_at timestamptz NOT NULL, used_at timestamptz
);
