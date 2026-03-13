-- =============================================
-- MIGRATION 002: EDX Course Progress Tracking
-- =============================================
-- Adds tables for tracking user progress through edX courses.
-- Safe to run multiple times (idempotent).

-- =============================================
-- Add EDX status enum (idempotent)
-- =============================================
DO $$ BEGIN
    CREATE TYPE edx_course_status AS ENUM ('not_started', 'in_progress', 'completed', 'dropped');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- edx_courses table
-- =============================================
CREATE TABLE IF NOT EXISTS edx_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    provider TEXT NOT NULL DEFAULT 'edX',
    category TEXT,
    start_date DATE,
    target_end_date DATE,
    total_estimated_hours NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    status edx_course_status NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- edx_progress_logs table
-- =============================================
CREATE TABLE IF NOT EXISTS edx_progress_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edx_course_id UUID REFERENCES edx_courses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    section TEXT,
    notes TEXT,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_edx_courses_user_id ON edx_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_edx_courses_status ON edx_courses(status);
CREATE INDEX IF NOT EXISTS idx_edx_progress_logs_course_id ON edx_progress_logs(edx_course_id);
CREATE INDEX IF NOT EXISTS idx_edx_progress_logs_user_id ON edx_progress_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_edx_progress_logs_logged_at ON edx_progress_logs(logged_at);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE edx_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE edx_progress_logs ENABLE ROW LEVEL SECURITY;

-- edx_courses policies
DROP POLICY IF EXISTS "Users can manage their own edx courses" ON edx_courses;
CREATE POLICY "Users can manage their own edx courses" ON edx_courses
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- edx_progress_logs policies
DROP POLICY IF EXISTS "Users can manage their own edx progress logs" ON edx_progress_logs;
CREATE POLICY "Users can manage their own edx progress logs" ON edx_progress_logs
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- =============================================
-- updated_at trigger for edx_courses
-- =============================================
DROP TRIGGER IF EXISTS update_edx_courses_updated_at ON edx_courses;
CREATE TRIGGER update_edx_courses_updated_at
    BEFORE UPDATE ON edx_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
