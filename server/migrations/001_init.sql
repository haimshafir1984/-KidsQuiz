-- סכמה ראשונית: משתמשים, התחברויות, שאלות, תוצאות, התקדמות ויומן פעולות מנהל

CREATE TABLE users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username           text NOT NULL,
  email              text,
  password_hash      text NOT NULL,
  role               text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  first_name         text NOT NULL DEFAULT '',
  last_name          text NOT NULL DEFAULT '',
  city               text NOT NULL DEFAULT '',
  phone              text NOT NULL DEFAULT '',
  birth_date         text NOT NULL DEFAULT '',
  -- מנוי: נקודת חיבור לתשלום עתידי. trial = תקופת ניסיון, active = שולם, expired = פג
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired')),
  subscription_date  timestamptz NOT NULL DEFAULT now(),
  subscription_until timestamptz,
  email_verified     boolean NOT NULL DEFAULT false,
  disabled           boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_login_at      timestamptz
);
CREATE UNIQUE INDEX users_username_key ON users (lower(username));
CREATE UNIQUE INDEX users_email_key ON users (lower(email)) WHERE email IS NOT NULL AND email <> '';

-- אסימון ההתחברות נשמר מגובב (hash) בלבד, כך שדליפת בסיס הנתונים אינה חושפת התחברויות פעילות
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  user_agent text
);
CREATE INDEX sessions_user_idx ON sessions (user_id);
CREATE INDEX sessions_expires_idx ON sessions (expires_at);

-- השאלה עצמה נשמרת כ-JSON באותה סכמה שבקוד (ר' CLAUDE.md), ושדות הסינון מופרדים לאינדקס
CREATE TABLE questions (
  id            text PRIMARY KEY,
  grade         text NOT NULL,
  subject       text NOT NULL,
  level         text,
  activity_type text NOT NULL DEFAULT 'practice',
  position      integer,
  data          jsonb NOT NULL,
  deleted       boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX questions_group_idx ON questions (grade, subject, level, activity_type) WHERE NOT deleted;

CREATE TABLE results (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject    text,
  grade      text,
  level      text,
  activity_type text,
  score      integer,
  total      integer,
  percent    integer,
  data       jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX results_user_idx ON results (user_id, created_at DESC);

-- התקדמות שמורה בחידון, לפי משתמש ומסלול (המפתח נבנה בצד הלקוח)
CREATE TABLE progress (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key        text NOT NULL,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- יומן פעולות מנהל: מי שינה מה ומתי (מאפשר לשחזר טעות)
CREATE TABLE audit_log (
  id         bigserial PRIMARY KEY,
  actor_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  action     text NOT NULL,
  entity     text NOT NULL,
  entity_id  text,
  before     jsonb,
  after      jsonb,
  at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_idx ON audit_log (entity, entity_id, at DESC);
