-- SQL schema init for campus_notifications DB
-- Run via: psql -U postgres -d campus_notifications -f schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Notification type enum
DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM ('Event', 'Result', 'Placement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Students table
CREATE TABLE IF NOT EXISTS students (
  student_id   VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE NOT NULL,
  roll_number  VARCHAR(50)  UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Master notifications (one record per notification event)
CREATE TABLE IF NOT EXISTS notifications (
  notification_id  VARCHAR(36)           PRIMARY KEY DEFAULT gen_random_uuid(),
  type             notification_category NOT NULL,
  message          TEXT                  NOT NULL,
  created_by       VARCHAR(36),
  created_at       TIMESTAMPTZ           DEFAULT NOW()
);

-- Per-student delivery records
CREATE TABLE IF NOT EXISTS notification_recipients (
  recipient_id     BIGSERIAL    PRIMARY KEY,
  notification_id  VARCHAR(36)  NOT NULL REFERENCES notifications(notification_id) ON DELETE CASCADE,
  student_id       VARCHAR(36)  NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  is_read          BOOLEAN      DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (notification_id, student_id)
);

-- Indexes for fast unread feed lookups
CREATE INDEX IF NOT EXISTS idx_nr_student_unread
  ON notification_recipients (student_id, is_read, delivered_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_type_created
  ON notifications (type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nr_covering
  ON notification_recipients (student_id, is_read)
  INCLUDE (notification_id, delivered_at);

-- Partial index: only unread rows (used for unread count query)
CREATE INDEX IF NOT EXISTS idx_nr_unread_partial
  ON notification_recipients (student_id, delivered_at DESC)
  WHERE is_read = FALSE;

-- Seed a default student for demo purposes
INSERT INTO students (student_id, name, email, roll_number)
VALUES ('stu-demo-0001', 'Dhanush Adi', 'da0308@semist.edu.in', 'RA2311003020344')
ON CONFLICT DO NOTHING;
