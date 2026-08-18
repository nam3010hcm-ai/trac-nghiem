# Hệ thống Thi Trắc Nghiệm & Luyện Tiếng Anh - Supabase

Cấu trúc:
- index.html
- student.html
- teacher.html
- css/style.css
- js/supabase.js
- js/common.js
- js/categories.js
- js/questions.js
- js/exams.js
- js/results.js
- js/student.js
- js/teacher.js

## Cấu hình Supabase
Project ID: `xuioxmjufpfdblecjvuv`
- Database: PostgreSQL (bảng `categories`, `questions`, `exams`, `cohorts`, `results`, `gallery`)
- Storage Buckets: `audio-bank`, `image-bank` (Public)
- Authentication: Quản trị viên đăng nhập bằng Email & Mật khẩu được tạo trên Supabase Auth Users Dashboard.

## Kích hoạt tài khoản (Admin)
Để thuận tiện cho việc tạo tài khoản giảng viên và bỏ qua yêu cầu xác nhận email, repository đã kèm một script nhỏ `admin-confirm-server.js` (chạy trên server/host tin cậy) giúp xác nhận (confirm) user trên Supabase Auth bằng `service_role` key.

Cách dùng (chạy trên máy chủ an toàn, KHÔNG đưa `service_role` lên client):

1. Đặt biến môi trường `SUPABASE_URL` (ví dụ `https://xuioxmjufpfdblecjvuv.supabase.co`) và `SUPABASE_SERVICE_ROLE_KEY` (lấy từ Supabase Project -> Settings -> API -> Service Role Key).
2. Chạy server:

   SUPABASE_URL=https://xuioxmjufpfdblecjvuv.supabase.co SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>" node admin-confirm-server.js

3. Khi server chạy, front-end admin (trang quản trị) sẽ tự gọi endpoint POST /api/admin/confirm-user sau khi tạo auth user mới. Endpoint nhận body JSON: { "userId": "<auth-user-id>" }.

Lưu ý bảo mật: Tuyệt đối giữ bí mật `SUPABASE_SERVICE_ROLE_KEY`. Triển khai script này chỉ trên backend/host đáng tin cậy (ví dụ VPS, serverless function với secrets).
