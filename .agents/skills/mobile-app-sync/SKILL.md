---
name: mobile-app-sync
description: Hướng dẫn kỹ thuật và kiến trúc giao tiếp liên thông hai chiều giữa Nền tảng Web LMS EduCore và App điện thoại Android (BookVocabApp): Cổng tải APK 31MB, Xuất gói từ vựng Unit, Cấp mã QR ghép nối SSO 1-chạm, Tiếp nhận từ vựng quét từ sách, Xác thực Supabase sinh viên thật và đồng bộ điểm XP hai chiều thời gian thực.
---

# GIAO TIẾP LIÊN THÔNG HAI CHIỀU VỚI APP DI ĐỘNG BOOKVOCAB (MOBILE ECOSYSTEM)

## 📌 Tổng quan
Phân hệ liên thông ứng dụng di động thiết lập cầu nối 2 chiều thời gian thực giữa **Nền tảng Web LMS EduCore (`trac-nghiem`)** và **Ứng dụng điện thoại Android Book Vocab Scanner (`BookVocabApp` trong thư mục `Download`)**, cho phép học viên học từ vựng linh hoạt mọi lúc mọi nơi (online & offline), đồng bộ điểm số và tự động hóa quy trình số hóa từ vựng từ sách ngoại văn lên hệ thống trường học.

---

## 🛠️ Các Chức Năng & Giải Thuật Cốt Lõi

### 1. Phân Phối Cài Đặt Ứng Dụng (APK Distribution Engine)
- **Tệp nguồn:** [`downloads/BookVocabApp.apk`](file:///Users/namtp/Downloads/trac-nghiem/downloads/BookVocabApp.apk), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html), [`learn.html`](file:///Users/namtp/Downloads/trac-nghiem/learn.html)
- **Cơ chế:**
  - Bản build hoàn chỉnh `app-debug.apk` (31 MB) từ dự án `BookVocabApp` được đặt tại thư mục `downloads/BookVocabApp.apk`.
  - Trên Web tích hợp nút tải trực tiếp kèm **Mã QR Tải Nhanh** (tạo bằng dynamic QR server API) cho phép học viên dùng camera điện thoại quét để tải file APK về máy.
  - Hướng dẫn cài đặt 3 bước chuẩn cho Android: Tải APK ➔ Cho phép cài đặt nguồn ngoài ➔ Đăng nhập bằng mã SV hoặc quét QR ghép nối.

---

### 2. Xác Thực Danh Tính Thật & Đăng Nhập 1-Chạm (Fast Pairing SSO)
- **Tệp nguồn:** [`js/mobile-app.js`](file:///Users/namtp/Downloads/trac-nghiem/js/mobile-app.js), [`learn.html`](file:///Users/namtp/Downloads/trac-nghiem/learn.html), [`EduCoreSyncRepository.kt`](file:///Users/namtp/Downloads/BookVocabApp/app/src/main/java/com/example/bookvocab/remote/EduCoreSyncRepository.kt), [`MainActivity.kt`](file:///Users/namtp/Downloads/BookVocabApp/app/src/main/java/com/example/bookvocab/MainActivity.kt)
- **Giải thuật:**
  1. **Trên Web (`learn.html` & `teacher.html`)**:
     - Nút `📱 App BookVocab` mở Modal sinh mã QR ghép nối cá nhân hóa.
     - Payload Token chứa: `{ action: "EDUCORE_STUDENT_SSO_PAIR", studentId, fullName, className, email, totalXp, timestamp, supabase }`.
     - Kèm mã PIN xác thực 6 chữ số ngẫu nhiên.
  2. **Trên App Android (`BookVocabApp`)**:
     - Trong Dialog đăng nhập, khi học sinh dán Token QR hoặc quét mã: `EduCoreSyncRepository.loginStudent()` tự động nhận diện JSON, bóc tách `studentId`, `fullName`, `className`, `totalXp` và hoàn tất đăng nhập tức thì.
     - Nếu học viên nhập Mã SV + Mật khẩu: Repository gửi truy vấn trực tiếp bảng Supabase `public.students` (`GET /rest/v1/students?or=(id.ilike.${user},email.ilike.${user})&password=eq.${pass}`) để đăng nhập bằng tài khoản thật 100%, đối soát cả bảng `public.teachers` nếu là Giảng viên.

---

### 3. Xuất Gói Bài Học Từ Vựng Đa Kỹ Năng (Vocab Pack Exporter)
- **Tệp nguồn:** [`js/mobile-app.js`](file:///Users/namtp/Downloads/trac-nghiem/js/mobile-app.js), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html), [`data/learning_units.json`](file:///Users/namtp/Downloads/trac-nghiem/data/learning_units.json)
- **Cơ chế bóc tách:**
  - Hàm `exportSelectedUnitVocab()` trích xuất toàn bộ từ vựng thuộc Unit bài học từ nhiều nguồn dữ liệu:
    - `language_focus.flashcards`: Từ vựng, phiên âm IPA, từ loại, nghĩa tiếng Việt, câu ví dụ.
    - `language_focus.matchPairs`: Cặp từ đồng nghĩa / ghép cụm.
    - `language_focus.pastFormVerbs`: Động từ bất quy tắc (nguyên mẫu V1, quá khứ V2, nghĩa).
    - `language_focus.backwardSpelling`: Đoán chữ, gợi ý và câu đố.
    - `reading.vocabulary`: Từ vựng trong bài đọc hiểu.
  - Khử trùng lặp theo `word.toLowerCase()`.
  - Xuất thành file `BookVocab_{UnitTitle}.json` và cho phép sao chép JSON trực tiếp vào bộ nhớ tạm.

---

### 4. Đồng Bộ Điểm Kinh Nghiệm (XP) Hai Chiều Thời Gian Thực
- **Tệp nguồn:** [`EduCoreSyncRepository.kt`](file:///Users/namtp/Downloads/BookVocabApp/app/src/main/java/com/example/bookvocab/remote/EduCoreSyncRepository.kt), [`BookScanViewModel.kt`](file:///Users/namtp/Downloads/BookVocabApp/app/src/main/java/com/example/bookvocab/BookScanViewModel.kt), [`learn.html`](file:///Users/namtp/Downloads/trac-nghiem/learn.html)
- **Cơ chế hoạt động:**
  - Khi học viên ôn tập Flashcard 3D hoặc trả lời đúng câu hỏi Quiz trên App điện thoại: hàm `updateWordMastery` kích hoạt `syncEarnedXp(10)`.
  - Khi quét sách và lưu từ mới: kích hoạt `syncEarnedXp(count * 5)`.
  - Repository gửi HTTP `PATCH /rest/v1/students?id=eq.${studentId}` với payload `{"total_xp": newTotalXp}` cập nhật thẳng lên Supabase.
  - Điểm XP trên Web LMS (Header, Bảng xếp hạng tuần, Quản trị học viên) tự động nhảy số theo thời gian thực.

---

### 5. Tiếp Nhận & Phê Duyệt Từ Vựng Quét Từ Sách Giáo Khoa (Book Scanner Ingest)
- **Tệp nguồn:** [`js/mobile-app.js`](file:///Users/namtp/Downloads/trac-nghiem/js/mobile-app.js), [`teacher.html#mobileapp`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html)
- **Quy trình:**
  1. Học viên dùng CameraX trên điện thoại chụp trang sách A4, OCR ML Kit trích xuất từ khó và tra từ điển.
  2. Tại Tab Kho từ trên App, học viên bấm **"☁️ Đẩy lên Web LMS"** (`uploadScannedWordsToWeb`).
  3. Giảng viên mở `teacher.html#mobileapp` để kiểm tra danh sách: từ vựng, IPA, cấp độ CEFR (A2, B1, B2, C1), nghĩa tiếng Việt, nguồn sách và học sinh quét.
  4. Giảng viên bấm **"✔ Duyệt"** hoặc **"➕ Chèn Unit"** để đưa trực tiếp từ vựng vào Unit Designer (`teacher.html#unit`).

---

## 📊 Bảng Đối Soát Tệp Nguồn Liên Quan

| Phân hệ | Tệp nguồn Web LMS (`trac-nghiem`) | Tệp nguồn App Android (`BookVocabApp`) |
|---|---|---|
| **Cài đặt APK** | `downloads/BookVocabApp.apk` | `app/build/outputs/apk/debug/app-debug.apk` |
| **Xác thực SSO** | `js/mobile-app.js` (`generateStudentPairingCode`) | `EduCoreSyncRepository.kt` (`loginStudent`) |
| **Xuất bài học** | `js/mobile-app.js` (`exportSelectedUnitVocab`) | `EduCoreSyncRepository.kt` (`syncEnglishLessonsFromWeb`) |
| **Đồng bộ XP** | `learn.html`, `js/learn/learn-auth.js` | `BookScanViewModel.kt` (`syncEarnedXp`) |
| **Từ vựng quét** | `teacher.html#mobileapp` (`renderScannedVocabTable`) | `MainActivity.kt` (`uploadScannedWordsToWeb`) |
