-- ============================================================================
-- EDUCORE ENTERPRISE LMS — COMPLETE SUPABASE DATABASE SETUP & SEED SCRIPT
-- Project ID: xuioxmjufpfdblecjvuv
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/org/upsclcxjdcjmgkojdjxn
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SCHOOLD ORGANIZATIONAL HIERARCHY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. ACADEMIC YEARS / COHORTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., '2025-2026'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. CLASSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  name TEXT NOT NULL, -- e.g., 'Lớp 10A1 - Anh Văn Chuyên'
  grade_level INTEGER NOT NULL DEFAULT 10,
  invite_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. CLASS MEMBERS (TEACHERS & STUDENTS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'homeroom_teacher')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'archived')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 5. ASSIGNMENTS (NHIỆM VỤ HỌC TẬP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  content_type TEXT NOT NULL CHECK (content_type IN ('exam', 'unit', 'practice', 'essay', 'video_roleplay')),
  content_id TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'group', 'individual')),
  target_student_ids JSONB DEFAULT '[]'::jsonb,
  start_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 0, -- 0 = no limit
  max_attempts INTEGER DEFAULT 1,     -- 0 = unlimited
  is_shuffle_questions BOOLEAN DEFAULT FALSE,
  is_shuffle_options BOOLEAN DEFAULT FALSE,
  show_answers_mode TEXT DEFAULT 'immediate' CHECK (show_answers_mode IN ('immediate', 'after_due', 'never')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. SUBMISSIONS & GRADING (BÀI NỘP & CHẤM CHỮA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER DEFAULT 0,
  answers JSONB DEFAULT '{}'::jsonb,
  audio_recordings JSONB DEFAULT '[]'::jsonb,
  score NUMERIC(5,2),
  max_score NUMERIC(5,2) DEFAULT 10.0,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('in_progress', 'submitted', 'graded', 'resubmit_required')),
  feedback TEXT DEFAULT '',
  graded_by UUID,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. CLASS POSTS & STREAM (BẢNG TIN THẢO LUẬN LỚP HỌC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT DEFAULT 'Giáo viên',
  author_avatar TEXT DEFAULT '👤',
  content TEXT NOT NULL,
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. LEARNING UNITS (BÀI HỌC 5 KỸ NĂNG & MEDIA BANK)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_units (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL DEFAULT '🇬🇧 Tiếng Anh',
  module TEXT NOT NULL DEFAULT 'English B1 - General & Academic Skills',
  title TEXT NOT NULL,
  topic TEXT DEFAULT '',
  level TEXT DEFAULT 'A2 - B1',
  icon TEXT DEFAULT '📖',
  description TEXT DEFAULT '',
  is_hidden BOOLEAN DEFAULT FALSE,
  listening JSONB DEFAULT '[]'::jsonb,
  reading JSONB DEFAULT '[]'::jsonb,
  speaking JSONB DEFAULT '[]'::jsonb,
  writing JSONB DEFAULT '[]'::jsonb,
  language_focus JSONB DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at BIGINT
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schools public read write" ON public.schools FOR ALL USING (true);
CREATE POLICY "Academic years public read write" ON public.academic_years FOR ALL USING (true);
CREATE POLICY "Classes public read write" ON public.classes FOR ALL USING (true);
CREATE POLICY "Class members public read write" ON public.class_members FOR ALL USING (true);
CREATE POLICY "Assignments public read write" ON public.assignments FOR ALL USING (true);
CREATE POLICY "Submissions public read write" ON public.submissions FOR ALL USING (true);
CREATE POLICY "Class posts public read write" ON public.class_posts FOR ALL USING (true);
CREATE POLICY "Learning units public read write" ON public.learning_units FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user ON public.class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);

-- ============================================================================
-- INITIAL SEED DATA FOR DEMO & PRODUCTION USE
-- ============================================================================

-- Insert Demo School
INSERT INTO public.schools (id, name, code, address, phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'Trường THPT Chuyên EduCore', 'EDUCORE_HS01', 'Thành phố Hồ Chí Minh', '028.3800.8888')
ON CONFLICT (code) DO NOTHING;

-- Insert Demo Academic Year
INSERT INTO public.academic_years (id, school_id, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '2025-2026', true)
ON CONFLICT DO NOTHING;

-- Insert Demo Classes
INSERT INTO public.classes (id, school_id, academic_year_id, name, grade_level, invite_code)
VALUES 
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Lớp 10A1 - Anh Văn Chuyên', 10, 'ENG10A'),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Lớp 11B2 - Luyện Thi IELTS & B2', 11, 'IELTS11'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Lớp 12C3 - Ôn Thi Tốt Nghiệp THPT', 12, 'THPT12')
ON CONFLICT (invite_code) DO NOTHING;

-- Insert Demo Assignments
INSERT INTO public.assignments (id, class_id, title, description, content_type, content_id, duration_minutes, max_attempts, due_at)
VALUES 
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', '📝 Kiểm tra Giữa Kỳ 1 — Anh Văn 10 (Ma trận 40 câu)', 'Bài thi trắc nghiệm ma trận kiến thức 4 mức độ tư duy', 'exam', 'ex_giau_ky_1', 45, 1, NOW() + INTERVAL '10 days'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011', '🎬 Video Roleplay: Hotel Check-in & Inquiry (A & B)', 'Thực hành hội thoại tương tác phát âm 2 nhân vật A & B', 'video_roleplay', 'spk_video_1', 0, 0, NOW() + INTERVAL '14 days')
ON CONFLICT DO NOTHING;

-- Insert Demo Class Posts
INSERT INTO public.class_posts (class_id, author_name, author_role, author_avatar, content)
VALUES 
  ('00000000-0000-0000-0000-000000000010', 'Cô Emma (Giáo Viên Tiếng Anh)', 'Giáo viên', '👩‍🏫', '📢 Thông báo: Đã phát hành bài tập Video Roleplay 2 Nhân Vật A & B cho Lớp 10A1. Các em vào mục "Bài học & Unit" hoặc "Cổng Học Viên" để luyện tập nhé!')
ON CONFLICT DO NOTHING;
