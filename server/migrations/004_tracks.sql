-- הגדרות נושאים שנוצרו בניהול (תתי-נושאים בסדר שנקבע, מצב מבחן, תיאור). מוסיף בלבד.
-- עד כה נשמרו רק בדפדפן של המנהל
CREATE TABLE tracks (
  grade      text NOT NULL,
  subject    text NOT NULL,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (grade, subject)
);
