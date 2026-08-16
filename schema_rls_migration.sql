-- ============================================================================
-- EDUCORE ENTERPRISE LMS — DATABASE SCHEMA & RLS MIGRATION SCRIPT
-- Project: EduCore LMS (Supabase PostgreSQL)
-- ============================================================================

-- 1. SCHOOLS & ORGANIZATIONAL HIERARCHY
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ACADEMIC YEARS / COHORTS
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., '2025-2026'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLASSES
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  name TEXT NOT NULL, -- e.g., 'Lớp 10A1'
  grade_level INTEGER NOT NULL DEFAULT 10,
  invite_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLASS MEMBERS (TEACHERS & STUDENTS)
CREATE TABLE IF NOT EXISTS public.class_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'homeroom_teacher')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'archived')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- 5. ASSIGNMENTS (NHIỆM VỤ HỌC TẬP)
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
  duration_minutes INTEGER DEFAULT 0, -- 0 = no time limit
  max_attempts INTEGER DEFAULT 1,     -- 0 = unlimited
  is_shuffle_questions BOOLEAN DEFAULT FALSE,
  is_shuffle_options BOOLEAN DEFAULT FALSE,
  show_answers_mode TEXT DEFAULT 'immediate' CHECK (show_answers_mode IN ('immediate', 'after_due', 'never')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUBMISSIONS & GRADING (BÀI NỘP & CHẤM CHỮA)
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 1. Schools Policy: Public Read, Authenticated Write
CREATE POLICY "Schools public read" ON public.schools FOR SELECT USING (true);

-- 2. Classes Policy: Members & Public read via invite code
CREATE POLICY "Classes public read" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Classes teacher write" ON public.classes FOR ALL USING (auth.role() = 'authenticated');

-- 3. Class Members Policy
CREATE POLICY "Class members select" ON public.class_members FOR SELECT USING (true);
CREATE POLICY "Class members insert/update" ON public.class_members FOR ALL USING (auth.role() = 'authenticated');

-- 4. Assignments Policy
CREATE POLICY "Assignments select" ON public.assignments FOR SELECT USING (true);
CREATE POLICY "Assignments teacher manage" ON public.assignments FOR ALL USING (auth.role() = 'authenticated');

-- 5. Submissions Policy: Students see their own submissions; Teachers see all submissions for their classes
CREATE POLICY "Submissions student select own" ON public.submissions 
  FOR SELECT USING (
    (auth.uid() = student_id) OR 
    (auth.role() = 'authenticated')
  );

CREATE POLICY "Submissions student write own" ON public.submissions 
  FOR INSERT WITH CHECK (
    (auth.uid() = student_id) OR 
    (auth.role() = 'authenticated')
  );

CREATE POLICY "Submissions teacher update grade" ON public.submissions 
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classes_school ON public.classes(school_id);
CREATE INDEX IF NOT EXISTS idx_class_members_user ON public.class_members(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON public.assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
