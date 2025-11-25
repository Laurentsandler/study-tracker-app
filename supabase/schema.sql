-- =============================================
-- STUDY TRACKER APP - SUPABASE DATABASE SCHEMA
-- =============================================
-- Copy and paste this entire SQL file into your Supabase SQL Editor
-- Go to: Supabase Dashboard > SQL Editor > New Query > Paste > Run

-- =============================================
-- 1. ENABLE REQUIRED EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. CREATE CUSTOM TYPES (ENUMS)
-- =============================================
CREATE TYPE assignment_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE assignment_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE study_material_type AS ENUM ('notes', 'study_guide', 'practice_test', 'flashcards');

-- =============================================
-- 3. CREATE TABLES
-- =============================================

-- User Profiles (extends Supabase Auth)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    settings JSONB DEFAULT '{
        "notifications": true,
        "theme": "light",
        "defaultView": "list"
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    instructor TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority assignment_priority DEFAULT 'medium',
    status assignment_status DEFAULT 'pending',
    estimated_duration INTEGER DEFAULT 60, -- in minutes
    raw_input_text TEXT, -- Original text from AI parsing or transcription
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignment Images
CREATE TABLE assignment_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    image_url TEXT NOT NULL,
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    extracted_text TEXT, -- OCR text from the image
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study Materials (AI-generated content)
CREATE TABLE study_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type study_material_type NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL, -- Flexible JSON structure for different material types
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Schedule (Weekly availability)
CREATE TABLE user_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    available_start TIME NOT NULL,
    available_end TIME NOT NULL,
    label TEXT, -- e.g., "Free time", "Study block"
    is_recurring BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (available_start < available_end)
);

-- Planned Tasks (Scheduled study sessions)
CREATE TABLE planned_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_start TIME NOT NULL,
    scheduled_end TIME NOT NULL,
    completed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transcriptions (Voice input)
CREATE TABLE transcriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    audio_url TEXT,
    storage_path TEXT,
    transcribed_text TEXT NOT NULL,
    processed BOOLEAN DEFAULT false, -- Whether it's been parsed into an assignment
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_assignments_user_id ON assignments(user_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_course_id ON assignments(course_id);
CREATE INDEX idx_assignment_images_assignment_id ON assignment_images(assignment_id);
CREATE INDEX idx_study_materials_assignment_id ON study_materials(assignment_id);
CREATE INDEX idx_study_materials_type ON study_materials(type);
CREATE INDEX idx_user_schedule_user_id ON user_schedule(user_id);
CREATE INDEX idx_user_schedule_day ON user_schedule(day_of_week);
CREATE INDEX idx_planned_tasks_user_id ON planned_tasks(user_id);
CREATE INDEX idx_planned_tasks_date ON planned_tasks(scheduled_date);
CREATE INDEX idx_transcriptions_user_id ON transcriptions(user_id);

-- =============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
    
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Courses policies
CREATE POLICY "Users can view own courses" ON courses
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own courses" ON courses
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own courses" ON courses
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own courses" ON courses
    FOR DELETE USING (auth.uid() = user_id);

-- Assignments policies
CREATE POLICY "Users can view own assignments" ON assignments
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own assignments" ON assignments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own assignments" ON assignments
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own assignments" ON assignments
    FOR DELETE USING (auth.uid() = user_id);

-- Assignment images policies
CREATE POLICY "Users can view own assignment images" ON assignment_images
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own assignment images" ON assignment_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own assignment images" ON assignment_images
    FOR DELETE USING (auth.uid() = user_id);

-- Study materials policies
CREATE POLICY "Users can view own study materials" ON study_materials
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own study materials" ON study_materials
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own study materials" ON study_materials
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own study materials" ON study_materials
    FOR DELETE USING (auth.uid() = user_id);

-- User schedule policies
CREATE POLICY "Users can view own schedule" ON user_schedule
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own schedule" ON user_schedule
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own schedule" ON user_schedule
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own schedule" ON user_schedule
    FOR DELETE USING (auth.uid() = user_id);

-- Planned tasks policies
CREATE POLICY "Users can view own planned tasks" ON planned_tasks
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own planned tasks" ON planned_tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own planned tasks" ON planned_tasks
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own planned tasks" ON planned_tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Transcriptions policies
CREATE POLICY "Users can view own transcriptions" ON transcriptions
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Users can create own transcriptions" ON transcriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can update own transcriptions" ON transcriptions
    FOR UPDATE USING (auth.uid() = user_id);
    
CREATE POLICY "Users can delete own transcriptions" ON transcriptions
    FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- 6. FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_materials_updated_at
    BEFORE UPDATE ON study_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_schedule_updated_at
    BEFORE UPDATE ON user_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planned_tasks_updated_at
    BEFORE UPDATE ON planned_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 7. STORAGE BUCKETS SETUP
-- =============================================
-- Run these in Supabase Dashboard > Storage > Create Bucket

-- NOTE: You need to create these buckets manually in the Supabase Dashboard:
-- 1. Create bucket: "assignment-images" (Public: false)
-- 2. Create bucket: "audio-recordings" (Public: false)

-- Then add these storage policies via SQL:

-- Storage policies for assignment-images bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assignment-images', 'assignment-images', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-recordings', 'audio-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to their own folder
CREATE POLICY "Users can upload assignment images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'assignment-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own images
CREATE POLICY "Users can view own assignment images"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'assignment-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete own assignment images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'assignment-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can upload audio recordings
CREATE POLICY "Users can upload audio recordings"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'audio-recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own recordings
CREATE POLICY "Users can view own audio recordings"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'audio-recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own recordings
CREATE POLICY "Users can delete own audio recordings"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'audio-recordings' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- After running this SQL:
-- 1. Enable Email Auth in Authentication > Providers
-- 2. Set up your site URL in Authentication > URL Configuration
-- 3. Copy your project URL and anon key to .env.local
