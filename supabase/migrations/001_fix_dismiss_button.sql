-- =============================================
-- MIGRATION 001: Fix Shared Courses Dismiss Button
-- =============================================
-- Run this if the dismiss button on the Shared Courses page is not working.
-- This ensures the user_dismissed_shared_assignments table exists with
-- proper RLS policies.  Safe to run multiple times (idempotent).

-- 1. Ensure the table exists
CREATE TABLE IF NOT EXISTS user_dismissed_shared_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shared_assignment_id UUID REFERENCES shared_assignments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    dismissed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shared_assignment_id, user_id)
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_dismissed_shared_assignments_user
    ON user_dismissed_shared_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dismissed_shared_assignments_shared
    ON user_dismissed_shared_assignments(shared_assignment_id);

-- 3. Enable Row Level Security
ALTER TABLE user_dismissed_shared_assignments ENABLE ROW LEVEL SECURITY;

-- 4. Policies (drop first so the script is idempotent)
DROP POLICY IF EXISTS "Users can view their dismissed assignments"
    ON user_dismissed_shared_assignments;
CREATE POLICY "Users can view their dismissed assignments"
    ON user_dismissed_shared_assignments
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can dismiss assignments"
    ON user_dismissed_shared_assignments;
CREATE POLICY "Users can dismiss assignments"
    ON user_dismissed_shared_assignments
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can undismiss their assignments"
    ON user_dismissed_shared_assignments;
CREATE POLICY "Users can undismiss their assignments"
    ON user_dismissed_shared_assignments
    FOR DELETE USING (user_id = auth.uid());
