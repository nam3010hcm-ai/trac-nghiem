---
name: identity-and-auth-audit
description: Hướng dẫn kỹ thuật và kiến trúc quản lý danh tính (Họ và Tên chuẩn hệ thống), Audit Logs lưu vết toàn bộ thao tác CRUD của Giảng viên, hệ thống xác thực tài khoản học viên (SSO, Enter key, đối soát Email/Mã học viên) và cơ chế toggle ẩn/hiện mật khẩu toàn diện.
---

# QUẢN LÝ DANH TÍNH, XÁC THỰC SSO & AUDIT LOGS LƯU VẾT CRUD

## 📌 Tổng quan
Phân hệ định danh và bảo mật quản lý tập trung thông tin Họ và Tên chuẩn xác của người dùng (Giảng viên, Quản trị viên, Học viên), duy trì phiên đăng nhập liên thông (SSO), lưu vết chi tiết toàn bộ hoạt động CRUD vào cơ sở dữ liệu Supabase và bộ nhớ đệm, đồng thời chuẩn hóa trải nghiệm đăng nhập & bảo mật mật khẩu.

---

## 🛠️ Các Chức Năng & Giải Thuật Cốt Lõi

### 1. Quản Lý Danh Tính (Họ và Tên) Chuẩn Xác Toàn Hệ Thống
- **Tệp nguồn:** [`js/common.js`](file:///Users/namtp/Downloads/trac-nghiem/js/common.js), [`js/teacher.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teacher.js), [`js/student.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student.js), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html), [`student.html`](file:///Users/namtp/Downloads/trac-nghiem/student.html), [`learn.html`](file:///Users/namtp/Downloads/trac-nghiem/learn.html)
- **Cơ sở dữ liệu Supabase:**
  - Bảng `public.teachers`: `id`, `email`, `teacher_name` (NOT NULL), `department`, `role`, `is_active`, `last_login_at`, `last_logout_at`, `user_id`, `teacher_code`, `password`.
  - Bảng `public.students`: `id`, `full_name` (NOT NULL), `class_name`, `academic_year`, `email`, `password`, `is_active`, `created_by`, `last_login_at`, `last_logout_at`, `total_xp`, `user_id`, `student_code`, `role`.
- **Nguyên tắc hiển thị danh tính:**
  - **Giảng viên / Quản trị:** Khi đăng nhập, hệ thống tự động đối soát bảng `teachers` để lấy trường `teacher_name` (ví dụ: `Thầy Nam (Root Admin)`, `Dr. Chen`, `Lê Văn Nam`). Header Profile Badge và Sidebar Profile hiển thị rõ Họ và Tên kèm vai trò và bộ môn.
  - **Học viên:** Khi đăng nhập qua Cổng Thi hoặc Cổng Học Tập, hệ thống lấy trường `full_name` trong bảng `students` để hiển thị trên Header, Lời chào Portal (`Xin chào, Nguyễn Văn An 👋`), phòng thi và bảng kết quả.
  - Thay thế toàn bộ hiển thị chung chung (`email.split('@')[0]`, `Admin / Teacher`, `Học viên`) bằng Họ và Tên thực tế của người dùng.
  - Hiển thị tác giả tạo trong các bảng quản lý (`exams.js`, `questions.js`, `units.js`, `students-mgr.js`) thông qua hàm `getAuthorDisplayName(item.created_by)`.

---

### 2. Hệ Thống Audit Logs Lưu Vết Hoạt Động CRUD Của Giảng Viên (`logTeacherActivity`)
- **Tệp nguồn:** [`js/auth-logs.js`](file:///Users/namtp/Downloads/trac-nghiem/js/auth-logs.js), [`js/exams.js`](file:///Users/namtp/Downloads/trac-nghiem/js/exams.js), [`js/questions.js`](file:///Users/namtp/Downloads/trac-nghiem/js/questions.js), [`js/students-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/students-mgr.js), [`js/teachers-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teachers-mgr.js), [`js/assignments-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/assignments-mgr.js), [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js)
- **Cơ chế hoạt động:**
  - Mọi hành động Tạo mới (CREATE), Chỉnh sửa (UPDATE), Xóa (DELETE), Khóa/Mở khóa (TOGGLE), Giao bài tập (ASSIGN), Import tài liệu (IMPORT) đều được tự động lưu vết với:
    - **Người thực hiện:** Họ và Tên Giảng viên (`actor_name`), Email (`actor_email`), Vai trò (`actor_role`).
    - **Hành động & Phân hệ:** Tạo mới / Sửa / Xóa Đề thi, Câu hỏi, Học viên, Giảng viên, Bài học Unit, Nhiệm vụ học tập.
    - **Đối tượng & Chi tiết:** Tên đề thi, nội dung câu hỏi, thông tin học viên, lớp học...
    - **Thời gian thực hiện:** ISO timestamp thời gian thực.
  - Dữ liệu lưu vết được ghi đồng thời vào Supabase (`user_auth_logs`) và bộ nhớ đệm `localStorage` (`educore_teacher_activity_logs`).
- **Giao diện Giám sát:** Tích hợp sub-tab chuyên dụng trong Tab `authlogs` trên `teacher.html` cho phép Root Admin và Giảng viên theo dõi toàn bộ lịch sử thay đổi kèm bộ lọc theo từ khóa, vai trò và mốc thời gian (Hôm nay, 7 ngày, 30 ngày).

---

### 3. Xác Thực Học Viên & Đăng Nhập Một Lần (SSO)
- **Tệp nguồn:** [`learn.html`](file:///Users/namtp/Downloads/trac-nghiem/learn.html), [`student.html`](file:///Users/namtp/Downloads/trac-nghiem/student.html), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html), [`js/learn/learn-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-auth.js), [`js/student/student-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student/student-auth.js), [`js/teacher/teacher-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teacher/teacher-auth.js)
- **Tính năng & Kiến trúc:**
  1. **Định danh kép (Email hoặc Mã Học Viên):** Nhập Email hoặc Mã Học Viên (ID) đều được truy vấn tự động không phân biệt hoa thường (`ilike`).
  2. **Trải nghiệm phím Enter:** Hỗ trợ nhấn phím **Enter** trên cả ô Email và Mật khẩu để kích hoạt đăng nhập tức thì.
  3. **Liên thông phiên đăng nhập (SSO):** Tự động duy trì phiên đăng nhập giữa Cổng thi (`student.html`) và Cổng học tập (`learn.html`) thông qua `localStorage.getItem('st_user')`. Khi đăng nhập tại một trang, trang còn lại tự động nhận diện danh tính học viên mà không bắt đăng nhập lại.

---

### 4. Cơ Chế Toggle Ẩn / Hiện Mật Khẩu (`👁️` ↔ `🙈`) Toàn Hệ Thống
- **Vị trí tích hợp:**
  - Form Đăng nhập học tập (`#learn-auth-pass`)
  - Form Đăng nhập phòng thi (`#st-login-pass`)
  - Form Đăng nhập giảng viên (`#t-pass`)
  - Modal thêm giảng viên mới (`#t-mod-pass`)
  - Khóa Gemini API Key (`#pdf-gemini-api-key`)
- **Nguyên lý chuyển đổi:**
  - Nhấn icon hoán đổi kiểu input giữa `type="password"` và `type="text"`.
  - Icon tự động chuyển đổi tương ứng: `👁️` (đang hiển thị mật khẩu) $\leftrightarrow$ `🙈` (đang che mật khẩu).

---

## 📊 Kết quả kiểm thử & Nghiệm thu
- **Hiển thị danh tính Họ và Tên:** Đồng bộ 100% trên Header, Profile, Portal greeting và danh sách quản trị.
- **Audit Logs:** Ghi nhận đầy đủ 100% các hành động CRUD của giảng viên kèm thông tin chi tiết.
- **SSO & Ẩn/Hiện Mật Khẩu:** Hoạt động ổn định trên mọi thiết bị và trình duyệt.
