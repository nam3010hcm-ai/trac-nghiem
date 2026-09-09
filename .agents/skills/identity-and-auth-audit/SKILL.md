---
name: identity-and-auth-audit
description: Hướng dẫn kỹ thuật và kiến trúc quản lý danh tính (Họ và Tên chuẩn hệ thống), phân quyền 4 cấp độ (Root, Khảo thí, Quản lý học viên, Giảng viên), chống Session Hijacking khi tạo tài khoản, Kênh trao đổi chuyên môn 2 chiều, nhật ký giám sát đào tạo và Audit Logs lưu vết toàn bộ thao tác CRUD.
---

# QUẢN LÝ DANH TÍNH, PHÂN QUYỀN 4 CẤP ĐỘ, XÁC THỰC SSO & AUDIT LOGS

## 📌 Tổng quan
Phân hệ định danh và bảo mật quản lý tập trung thông tin Họ và Tên chuẩn xác của người dùng (Giảng viên, Cán bộ Khảo thí, Cán bộ Quản lý học viên, Quản trị viên, Học viên), duy trì phiên đăng nhập liên thông (SSO), thiết lập ma trận phân quyền 4 cấp độ, kênh trao đổi chỉ đạo chuyên môn 2 chiều, chống cướp phiên làm việc (Session Hijacking) khi tạo tài khoản mới, và lưu vết chi tiết toàn bộ hoạt động CRUD vào cơ sở dữ liệu Supabase.

---

## 🛠️ Các Chức Năng & Giải Thuật Cốt Lõi

### 1. Hệ Thống Phân Quyền 4 Cấp Độ Chuẩn LMS (`applyUserRolePermissions`)
- **Tệp nguồn:** [`js/common.js`](file:///Users/namtp/Downloads/trac-nghiem/js/common.js), [`js/teacher.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teacher.js), [`js/teacher/teacher-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teacher/teacher-auth.js), [`js/teachers-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teachers-mgr.js), [`js/manager-messages.js`](file:///Users/namtp/Downloads/trac-nghiem/js/manager-messages.js), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html)
- **Ma trận 4 cấp độ vai trò:**

| Cấp Độ (Role) | Chức Danh | Huy Hiệu | Quyền Hạn Chi Tiết |
| :--- | :--- | :--- | :--- |
| `root` / `admin` | **Root Admin** | 👑 `Root Admin` | Toàn quyền tối cao 100%: Quản trị tài khoản Giảng viên & Cán bộ, Audit Logs, Học viên, Đề thi, Unit, Kênh chỉ đạo, Cài đặt hệ thống. |
| `examination_officer` | **Cán bộ Khảo thí & ĐBCL** | ⚖️ `Cán bộ Khảo thí` | Toàn quyền giám sát & thanh tra đào tạo: Xem tiến độ học tập, hồ sơ học sinh, kết quả thi, phổ điểm, hàng đợi chấm bài, nội dung bài học/đề thi, gửi chỉ đạo chuyên môn. |
| `student_manager` | **Cán bộ Quản lý Học viên** | 👥 `Quản lý Học viên` | Quản lý học vụ & theo dõi học tập: Xem tiến độ học tập 5 kỹ năng, hồ sơ chi tiết học sinh, kết quả thi, phổ điểm, LMS Analytics, gửi thông điệp học vụ (tự động ẩn các tab biên soạn đề thi/Unit). |
| `teacher` | **Giảng viên Bộ môn** | 👨‍🏫 `Giảng viên` | Biên soạn nội dung & giảng dạy: Soạn ngân hàng câu hỏi, đề thi, soạn bài Unit 5 kỹ năng, giao bài tập, chấm bài tự luận/audio, phản hồi chỉ đạo chuyên môn. |

- **Tài khoản mẫu mặc định (Mật khẩu: `123`):**
  - `nam3010hcm@gmail.com` -> `Thầy Nam (Root Admin)` (`root`)
  - `khaothi@k7.edu.vn` -> `Thầy Hoàng (Cán Bộ Khảo Thí)` (`examination_officer`)
  - `quanlyhocvien@k7.edu.vn` -> `Cô Mai (Quản Lý Học Viên)` (`student_manager`)
  - `chen.lms@k7.edu.vn` -> `Dr. Chen` (`teacher`)
  - `nam84hcm@gmail.com` -> `Lê Văn Nam` (`teacher`)

---

### 2. Chống Session Hijacking Khi Tạo Tài Khoản Mới (`createEphemeralAuthUser`)
- **Vấn đề kỹ thuật:** Khi Root Admin gọi hàm `supabase.auth.signUp()`, mặc định Supabase JS SDK sẽ tự động đăng nhập vào tài khoản vừa tạo và ghi đè token vào `localStorage`, khiến Admin bị cướp quyền hoặc văng phiên làm việc.
- **Giải pháp xử lý (`js/supabase.js`):**
  Khởi tạo một Supabase Auth Client độc lập (Ephemeral Auth Instance) với cấu hình `persistSession: false` và bộ lưu trữ tách biệt để tạo tài khoản mới mà không ảnh hưởng tới phiên làm việc hiện tại của Admin:
```javascript
export async function createEphemeralAuthUser(email, password, metadata = {}) {
  const ephemeralClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'educore_ephemeral_auth_' + Date.now()
    }
  });
  return await ephemeralClient.auth.signUp({
    email: email.trim(),
    password: password,
    options: { data: metadata }
  });
}
```

---

### 3. Kênh Trao Đổi & Chỉ Đạo Chuyên Môn 2 Chiều (`manager-messages.js`)
- **Vị trí tích hợp:** Tab `📢 Kênh Chỉ Đạo / Trao Đổi` (`#tc-messages`) trong `teacher.html`.
- **Cơ chế hoạt động:**
  - Hỗ trợ Cán bộ Khảo thí & Quản lý phát thông điệp chỉ đạo (Toàn thể giảng viên hoặc cá nhân).
  - Phân loại chủ đề: `⚖️ Khảo Thí & Đề Thi`, `👥 Quản Lý Học Viên`, `✍️ Nhắc Chấm Bài`, `💬 Chỉ Đạo Đào Tạo`, `⚡ Hệ Thống`.
  - Thiết lập mức độ ưu tiên: `🔴 Khẩn Cấp`, `🟡 Quan Trọng`, `🟢 Bình Thường`.
  - Luồng phản hồi trực tiếp (Threaded Discussion) giữa Giáo viên và Cán bộ Quản lý.
  - Đồng bộ đa nguồn: Supabase `manager_messages` kết hợp bộ nhớ đệm `localStorage` tức thì.

---

### 4. Cấu Trúc Cơ Sở Dữ Liệu Supabase (Schema DDL)

#### A. Bảng `public.manager_messages` (Kênh Trao Đổi & Chỉ Đạo)
```sql
CREATE TABLE IF NOT EXISTS public.manager_messages (
    id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'examination_officer',
    receiver_type TEXT NOT NULL DEFAULT 'all',
    receiver_name TEXT NOT NULL DEFAULT 'Tất Cả Giảng Viên & Bộ Môn',
    receiver_email TEXT NOT NULL DEFAULT 'all',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'khao_thi',
    priority TEXT NOT NULL DEFAULT 'normal',
    is_read BOOLEAN DEFAULT true,
    replies JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT manager_messages_pkey PRIMARY KEY (id)
);
```

#### B. Bảng `public.academic_supervisions` (Sổ Nhật Ký Thanh Tra & Giám Sát Đào Tạo)
```sql
CREATE TABLE IF NOT EXISTS public.academic_supervisions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    officer_email TEXT NOT NULL,
    officer_name TEXT NOT NULL,
    officer_role TEXT NOT NULL DEFAULT 'examination_officer',
    target_type TEXT NOT NULL,                               -- 'exam', 'cohort', 'student', 'submission', 'unit'
    target_id TEXT NOT NULL,
    target_title TEXT DEFAULT '',
    inspection_type TEXT NOT NULL,                           -- 'matrix_review', 'grading_audit', 'attendance_check'
    status TEXT NOT NULL DEFAULT 'passed',                   -- 'passed', 'needs_revision', 'flagged', 'resolved'
    score_recorded NUMERIC DEFAULT NULL,
    notes TEXT NOT NULL DEFAULT '',
    action_required TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT academic_supervisions_pkey PRIMARY KEY (id)
);
```

---

### 5. Hệ Thống Audit Logs Lưu Vết Hoạt Động CRUD Của Giảng Viên (`logTeacherActivity`)
- **Tệp nguồn:** [`js/auth-logs.js`](file:///Users/namtp/Downloads/trac-nghiem/js/auth-logs.js), [`js/exams.js`](file:///Users/namtp/Downloads/trac-nghiem/js/exams.js), [`js/questions.js`](file:///Users/namtp/Downloads/trac-nghiem/js/questions.js), [`js/students-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/students-mgr.js), [`js/teachers-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teachers-mgr.js), [`js/assignments-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/assignments-mgr.js), [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js)
- **Cơ chế hoạt động:**
  - Mọi hành động Tạo mới (CREATE), Chỉnh sửa (UPDATE), Xóa (DELETE), Khóa/Mở khóa (TOGGLE), Giao bài tập (ASSIGN), Import tài liệu (IMPORT) đều được tự động lưu vết với Họ và Tên Giảng viên, Email, Vai trò và thời gian thực.
  - Dữ liệu lưu vết được ghi đồng thời vào Supabase (`user_auth_logs`) và bộ nhớ đệm `localStorage` (`educore_teacher_activity_logs`).

---

### 6. Xác Thực Học Viên & Đăng Nhập Một Lần (SSO)
- **Tệp nguồn:** [`learn.html`](file:///Users/namtp/Downloads/trac-nghiem/learn.html), [`student.html`](file:///Users/namtp/Downloads/trac-nghiem/student.html), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html), [`js/learn/learn-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-auth.js), [`js/student/student-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student/student-auth.js), [`js/teacher/teacher-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teacher/teacher-auth.js)
- **Tính năng & Kiến trúc:**
  1. **Định danh kép (Email hoặc Mã Học Viên):** Nhập Email hoặc Mã Học Viên (ID) đều được truy vấn tự động không phân biệt hoa thường (`ilike`).
  2. **Trải nghiệm phím Enter:** Hỗ trợ nhấn phím **Enter** trên cả ô Email và Mật khẩu để kích hoạt đăng nhập tức thì.
  3. **Liên thông phiên đăng nhập (SSO):** Tự động duy trì phiên đăng nhập giữa Cổng thi (`student.html`) và Cổng học tập (`learn.html`) thông qua `localStorage.getItem('st_user')`.

---

### 7. Cơ Chế Toggle Ẩn / Hiện Mật Khẩu (`👁️` ↔ `🙈`) Toàn Hệ Thống
- **Vị trí tích hợp:**
  - Form Đăng nhập học tập (`#learn-auth-pass`)
  - Form Đăng nhập phòng thi (`#st-login-pass`)
  - Form Đăng nhập giảng viên (`#t-pass`)
  - Modal thêm giảng viên & cán bộ (`#t-mod-pass`)
  - Khóa Gemini API Key (`#pdf-gemini-api-key`)
- **Nguyên lý chuyển đổi:**
  - Nhấn icon hoán đổi kiểu input giữa `type="password"` và `type="text"`.
  - Icon tự động chuyển đổi tương ứng: `👁️` $\leftrightarrow$ `🙈`.

---

## 📊 Kết Quả Kiểm Thử & Nghiệm Thu
- **Phân quyền 4 Cấp độ:** Áp dụng chính xác 100% cho Root Admin, Cán bộ Khảo thí, Quản lý Học viên và Giảng viên.
- **Kênh Trao Đổi Chuyên Môn:** Gửi chỉ đạo, lọc theo mức độ ưu tiên và phản hồi thời gian thực hoạt động mượt mà.
- **Bảo toàn phiên đăng nhập Admin:** `createEphemeralAuthUser` ngăn chặn triệt để tình trạng Admin bị đăng nhập nhầm vào tài khoản vừa tạo.
- **Hiển thị danh tính Họ và Tên:** Đồng bộ 100% trên Header, Profile, Portal greeting và danh sách quản trị.
- **Audit Logs:** Ghi nhận đầy đủ 100% các hành động CRUD của giảng viên kèm thông tin chi tiết.
- **SSO & Ẩn/Hiện Mật Khẩu:** Hoạt động ổn định trên mọi thiết bị và trình duyệt.
