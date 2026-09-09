---
name: identity-and-auth-audit
description: Hướng dẫn kỹ thuật và kiến trúc quản lý danh tính (Họ và Tên chuẩn hệ thống), Audit Logs lưu vết toàn bộ thao tác CRUD của Giảng viên, hệ thống xác thực tài khoản học viên (SSO, Enter key, đối soát Email/Mã học viên) và cơ chế toggle ẩn/hiện mật khẩu toàn diện.
---

# QUẢN LÝ DANH TÍNH, XÁC THỰC SSO & AUDIT LOGS LƯU VẾT CRUD

## 📌 Tổng quan
Phân hệ định danh và bảo mật quản lý tập trung thông tin Họ và Tên chuẩn xác của người dùng (Giảng viên, Quản trị viên, Học viên), duy trì phiên đăng nhập liên thông (SSO), lưu vết chi tiết toàn bộ hoạt động CRUD vào cơ sở dữ liệu Supabase và bộ nhớ đệm, đồng thời chuẩn hóa trải nghiệm đăng nhập & bảo mật mật khẩu.

---

## 🛠️ Các Chức Năng & Giải Thuật Cốt Lõi

### 1. Quản Lý Danh Tính (Họ và Tên) & Phân Quyền 4 Cấp Độ Chuẩn Xác
- **Tệp nguồn:** [`js/common.js`](file:///Users/namtp/Downloads/trac-nghiem/js/common.js), [`js/teacher.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teacher.js), [`js/teacher/teacher-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teacher/teacher-auth.js), [`js/teachers-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teachers-mgr.js), [`js/manager-messages.js`](file:///Users/namtp/Downloads/trac-nghiem/js/manager-messages.js), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html)
- **Hệ thống Phân Quyền 4 Cấp Độ (`applyUserRolePermissions`):**
  1. `root` / `admin`: **Root Admin** (`👑`) - Toàn quyền tối cao 100% (Thêm/xóa Giảng viên, Cán bộ, Học viên, Nhật ký Audit Logs).
  2. `examination_officer`: **Cán bộ Khảo thí & Thanh tra** (`⚖️`) - Toàn quyền giám sát & thanh tra đào tạo (Xem tiến độ học tập, hồ sơ học sinh, kết quả thi, phổ điểm, hàng đợi chấm bài, nội dung bài học/đề thi, gửi chỉ đạo chuyên môn).
  3. `student_manager`: **Cán bộ Quản lý Học viên** (`👥`) - Theo dõi tiến độ học tập 5 kỹ năng, hồ sơ chi tiết học sinh, kết quả thi, phổ điểm, LMS Analytics, gửi tin nhắn trao đổi tình hình học sinh với giáo viên.
  4. `teacher`: **Giảng viên / Người dạy** (`👨‍🏫`) - Quyền giảng dạy và biên soạn nội dung (Soạn đề, soạn Unit, giao bài, chấm bài, nhận và phản hồi tin nhắn chỉ đạo).
- **Tài khoản mẫu mặc định (Mật khẩu: `123`):**
  - `nam3010hcm@gmail.com` -> `Thầy Nam (Root Admin)` (`root`)
  - `khaothi@k7.edu.vn` -> `Thầy Hoàng (Cán Bộ Khảo Thí)` (`examination_officer`)
  - `quanlyhocvien@k7.edu.vn` -> `Cô Mai (Quản Lý Học Viên)` (`student_manager`)
  - `chen.lms@k7.edu.vn` -> `Dr. Chen` (`teacher`)
  - `nam84hcm@gmail.com` -> `Lê Văn Nam` (`teacher`)

---

### 2. Kênh Trao Đổi & Chỉ Đạo Chuyên Môn 2 Chiều (`manager-messages.js`)
- **Cơ chế hoạt động:**
  - Hỗ trợ Cán bộ Khảo thí & Quản lý phát thông điệp chỉ đạo (Toàn thể giảng viên hoặc cá nhân).
  - Phân loại chủ đề: `⚖️ Khảo Thí & Đề Thi`, `👥 Quản Lý Học Viên`, `✍️ Nhắc Chấm Bài`, `💬 Chỉ Đạo Đào Tạo`, `⚡ Hệ Thống`.
  - Thiết lập mức độ ưu tiên: `🔴 Khẩn Cấp`, `🟡 Quan Trọng`, `🟢 Bình Thường`.
  - Luồng phản hồi trực tiếp (Threaded Discussion) giữa Giáo viên và Cán bộ Quản lý.
  - Đồng bộ đa nguồn: Supabase `manager_messages` kết hợp bộ nhớ đệm `localStorage` tức thì.

---

### 3. Hệ Thống Audit Logs Lưu Vết Hoạt Động CRUD Của Giảng Viên (`logTeacherActivity`)
- **Tệp nguồn:** [`js/auth-logs.js`](file:///Users/namtp/Downloads/trac-nghiem/js/auth-logs.js), [`js/exams.js`](file:///Users/namtp/Downloads/trac-nghiem/js/exams.js), [`js/questions.js`](file:///Users/namtp/Downloads/trac-nghiem/js/questions.js), [`js/students-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/students-mgr.js), [`js/teachers-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teachers-mgr.js), [`js/assignments-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/assignments-mgr.js), [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js)
- **Cơ chế hoạt động:**
  - Mọi hành động Tạo mới (CREATE), Chỉnh sửa (UPDATE), Xóa (DELETE), Khóa/Mở khóa (TOGGLE), Giao bài tập (ASSIGN), Import tài liệu (IMPORT) đều được tự động lưu vết với Họ và Tên Giảng viên, Email, Vai trò và thời gian thực.
  - Dữ liệu lưu vết được ghi đồng thời vào Supabase (`user_auth_logs`) và bộ nhớ đệm `localStorage` (`educore_teacher_activity_logs`).

---

### 4. Xác Thực Học Viên & Đăng Nhập Một Lần (SSO)
- **Tệp nguồn:** [`learn.html`](file:///Users/namtp/Downloads/trac-nghiem/learn.html), [`student.html`](file:///Users/namtp/Downloads/trac-nghiem/student.html), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html), [`js/learn/learn-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-auth.js), [`js/student/student-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student/student-auth.js), [`js/teacher/teacher-auth.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teacher/teacher-auth.js)
- **Tính năng & Kiến trúc:**
  1. **Định danh kép (Email hoặc Mã Học Viên):** Nhập Email hoặc Mã Học Viên (ID) đều được truy vấn tự động không phân biệt hoa thường (`ilike`).
  2. **Trải nghiệm phím Enter:** Hỗ trợ nhấn phím **Enter** trên cả ô Email và Mật khẩu để kích hoạt đăng nhập tức thì.
  3. **Liên thông phiên đăng nhập (SSO):** Tự động duy trì phiên đăng nhập giữa Cổng thi (`student.html`) và Cổng học tập (`learn.html`) thông qua `localStorage.getItem('st_user')`.

---

### 5. Cơ Chế Toggle Ẩn / Hiện Mật Khẩu (`👁️` ↔ `🙈`) Toàn Hệ Thống
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

## 📊 Kết quả kiểm thử & Nghiệm thu
- **Phân quyền 4 Cấp độ:** Áp dụng chính xác 100% cho Root Admin, Cán bộ Khảo thí, Quản lý Học viên và Giảng viên.
- **Kênh Trao Đổi Chuyên Môn:** Gửi chỉ đạo, lọc theo mức độ ưu tiên và phản hồi thời gian thực hoạt động mượt mà.
- **Hiển thị danh tính Họ và Tên:** Đồng bộ 100% trên Header, Profile, Portal greeting và danh sách quản trị.
- **Audit Logs:** Ghi nhận đầy đủ 100% các hành động CRUD của giảng viên kèm thông tin chi tiết.
- **SSO & Ẩn/Hiện Mật Khẩu:** Hoạt động ổn định trên mọi thiết bị và trình duyệt.
