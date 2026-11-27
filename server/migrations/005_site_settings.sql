-- הגדרות האתר (קטגוריות מוסתרות ושאלות ההתנסות). מוסיף בלבד
CREATE TABLE site_settings (
  key        text PRIMARY KEY,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL
);
