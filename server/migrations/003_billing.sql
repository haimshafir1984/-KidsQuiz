-- תשתית תשלומים שאינה תלויה בחברת סליקה: מסלולי מנוי ורשומות תשלום. מוסיף בלבד, לא משנה נתונים קיימים

CREATE TABLE plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  price_agorot  integer NOT NULL CHECK (price_agorot > 0),
  duration_days integer NOT NULL CHECK (duration_days BETWEEN 1 AND 3660),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- רשומת תשלום נשמרת גם אחרי מחיקת החשבון (user_id מתאפס), לצורכי הנהלת חשבונות
CREATE TABLE payments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid REFERENCES users(id) ON DELETE SET NULL,
  payer_name               text NOT NULL DEFAULT '',
  plan_id                  uuid REFERENCES plans(id) ON DELETE SET NULL,
  plan_name                text NOT NULL DEFAULT '',
  amount_agorot            integer NOT NULL CHECK (amount_agorot > 0),
  currency                 text NOT NULL DEFAULT 'ILS',
  duration_days            integer NOT NULL CHECK (duration_days BETWEEN 1 AND 3660),
  status                   text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  method                   text NOT NULL CHECK (method IN ('online', 'bank_transfer', 'cash', 'check', 'other')),
  provider                 text NOT NULL,
  provider_transaction_id  text,
  note                     text NOT NULL DEFAULT '',
  subscription_until_after timestamptz,
  created_by               uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  paid_at                  timestamptz,
  cancelled_at             timestamptz
);
CREATE INDEX payments_user_idx ON payments (user_id, created_at DESC);
-- אותה עסקה של ספק לא יכולה להאריך מנוי פעמיים
CREATE UNIQUE INDEX payments_provider_txn_key ON payments (provider, provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
