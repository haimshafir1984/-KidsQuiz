-- הסכמה לתנאי השימוש ולמדיניות הפרטיות בהרשמה (תיעוד מתי ובאיזו גרסה)
ALTER TABLE users ADD COLUMN terms_accepted_at timestamptz;
ALTER TABLE users ADD COLUMN terms_version text;
