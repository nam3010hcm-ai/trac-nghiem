---
name: learn-speaking-listening-media
description: Hướng dẫn kỹ thuật phân hệ Nghe & Nói (Listening & Speaking Media Studio): Kịch bản Video/Audio Roleplay đa nhân vật, Luyện phát âm Web Speech AI, Hero Audio Player với nút loa 64px Pulse Green, xử lý Dictation & Fallback âm thanh chống lỗi 404, nguyên tắc an toàn Null-Safe khi render và Typography chuẩn VnExpress.
---

# PHÂN HỆ LUYỆN KỸ NĂNG NGHE & NÓI (LISTENING & SPEAKING MEDIA STUDIO)

## 📌 Tổng quan
Phân hệ Đa phương tiện Nghe - Nói (`Listening` & `Speaking`) kết hợp công nghệ Web Speech API (Voice Synthesis & Recognition), trình phát âm thanh Hero Audio Player đồ họa cao, kịch bản đóng vai tương tác Video/Audio Roleplay đa nhân vật, hệ thống nhận diện lỗi âm thanh thông minh và quy chuẩn Typography cỡ lớn chống mỏi mắt.

---

## 🛠️ Các Chức Năng & Giải Thuật Cốt Lõi

### 1. Phân Hệ Luyện Nói Speaking & Video / Audio Roleplay Đa Nhân Vật
- **Tệp nguồn:** [`js/units/designer-speaking.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-speaking.js), [`js/learn/learn-speaking-engine.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-speaking-engine.js), [`js/learn/learn-speaking-roleplay.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-speaking-roleplay.js)
- **Kiến trúc Roleplay:**
  - Thiết lập nhân vật: Tên nhân vật, vai trò (Role Title), avatar emoji, màu sắc nhận diện, link video/audio. Hỗ trợ hội thoại 2, 3, hoặc 4 người (A, B, C, D).
  - Soạn kịch bản lời thoại từng lượt (`dialogue`): Người nói, câu thoại tiếng Anh (`text`), phiên âm IPA (`ipa`), dịch nghĩa tiếng Việt (`meaning`), mẹo phát âm & ngữ điệu (`tip`), link video/audio riêng cho câu thoại (`videoUrl`).
  - Hỗ trợ công cụ **`⚡ Dán nhanh kịch bản (Quick Paste Dialogue)`** tự động bóc tách từ văn bản thô.
- **Luyện phát âm câu trọng tâm (Pronunciation Phrases):**
  - Hiển thị thẻ câu luyện nói cỡ lớn 20px kèm phiên âm IPA 16px và mẹo nối âm / trọng âm.
  - Tích hợp nhận diện giọng nói học viên qua `webkitSpeechRecognition` và chấm điểm mức độ phát âm chính xác tức thì.

---

### 2. Hero Audio Player & Nút Loa Lớn Tương Tác (Listening Studio)
- **Tệp nguồn:** [`js/learn/learn-listening.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-listening.js), [`css/learn/learn-listening.css`](file:///Users/namtp/Downloads/trac-nghiem/css/learn/learn-listening.css)
- **Nút Loa Kích Thước Lớn (`.lis-big-speaker-btn`):**
  - Kích thước $64\text{px} \times 64\text{px}$, biểu tượng loa `🔊` cỡ $30\text{px}$ siêu nổi bật với gradient xanh dương đổ bóng 3D (`#2563eb` $\to$ `#1d4ed8`).
  - **Hiệu ứng sóng âm phát sóng (Pulse Green):** Khi bấm nghe, nút loa chuyển sang màu xanh lục phát sáng động kèm vòng tròn xung nhịp (`@keyframes pulse-green`), hiển thị trạng thái *"ĐANG PHÁT ÂM THANH... (BẤM ĐỂ DỪNG)"*.
- **Điều khiển Tốc độ Phát (`speed-pill`):**
  - Hỗ trợ đổi tốc độ linh hoạt: `0.75x` (Chậm), `1.0x` (Chuẩn), `1.25x` (Nhanh) cho cả File Audio thực tế và Web Speech Native Voice.
- **Tương tác 1 chạm trực quan:** Học viên có thể click vào nút Loa hoặc click trực tiếp vào tiêu đề *"BẤM VÀO LOA ĐỂ PHÁT ÂM THANH"* để kích hoạt phát âm.

---

### 3. Xử Lý An Toàn Phát Âm Dictation & Chống Lỗi 404 Âm Thanh
- **Tệp nguồn:** [`js/learn/learn-listening.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-listening.js), [`js/learn/learn-listening-eval.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-listening-eval.js), [`js/data/unit10-listening.js`](file:///Users/namtp/Downloads/trac-nghiem/js/data/unit10-listening.js)
- **Quy tắc Multi-Schema Dictation:**
  ```javascript
  const rawSent = ex.targetSentence || ex.sentence || ex.text || ex.correct || ex.sampleAnswer || '';
  ```
- **Fallback sang `audioText` bài học:** Nếu câu Dictation thiếu trường văn bản, hàm phát âm `speakDictation(sentence, idx)` tự động lấy `audioText` hoặc `transcript` của bài nghe để phát âm, không để câm tiếng.
- **Tránh lỗi mạng 404 URL bên thứ ba:**
  - Nếu không có URL CDN cố định hoặc Supabase Storage chính thức, hãy đặt `audioUrl: ""` để hệ thống tự động kích hoạt **Web Speech Native Voice (Giọng đọc AI bản xứ)** mượt mà 100%, không sinh lỗi đỏ `404 Not Found` trên trình duyệt.

---

### 4. Nguyên Tắc An Toàn Null-Safe Khi Render Bài Tập 5 Kỹ Năng
- **Tệp nguồn:** [`js/learn/learn-listening.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-listening.js), [`js/learn/learn-listening-eval.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-listening-eval.js), [`js/learn/learn-speaking-engine.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-speaking-engine.js)
- **Quy tắc sống còn:** Tuyệt đối không gọi `.replace()` trực tiếp trên thuộc tính dữ liệu khi chưa kiểm tra null/undefined:
  - ❌ **Sai:** `ex.sentence.replace(/'/g, "\\'")` (Gây crash luồng `switchSkillTab()` nếu `sentence` bị thiếu).
  - ✅ **Đúng:** `String(ex.sentence || ex.text || ex.correct || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')`.
- Luôn bọc chuỗi qua `esc(...)` hoặc thay thế dấu nháy đơn/kép an toàn khi chèn vào thuộc tính `onclick="window.speakPronunciation('...')"` trong HTML inline.

---

### 5. Quản Lý Favicon & Hệ Thống Typography Chuẩn VnExpress
- **Tệp nguồn:** `favicon.ico`, `favicon.svg`, [`css/learn/learn-base.css`](file:///Users/namtp/Downloads/trac-nghiem/css/learn/learn-base.css)
- **Chuẩn hóa Typography báo điện tử:**
  - **Base Body (`body.learn-body`):** Nâng lên **`17.5px`**, `line-height: 1.8`, chữ `#1e293b`.
  - **Đoạn văn Đọc hiểu & Transcript (`.reading-passage`, `.transcript-box`):** **`19px`**, `line-height: 1.95 - 2.0`, khoảng cách đoạn 16px.
  - **Tiêu đề Bài học (`Lesson Title`):** **`26px`** (`font-weight: 800`, `line-height: 1.35`).
  - **Tiêu đề Câu hỏi & Bài tập (`Questions`):** **`18.5px`** (`font-weight: 800`, `line-height: 1.55`).
  - **Nút Lựa chọn Trắc nghiệm A/B/C/D:** **`17.5px`**, badge to $36\text{px} \times 36\text{px}$.
  - **Ô Gõ Dictation & Điền từ:** **`18.5px`** (chiều cao 95px).
  - **Luyện phát âm Speaking Phrases:** Câu luyện nói to **`20px`**, IPA to **`16px`**.
  - **Thanh Điều hướng 5 Kỹ năng:** **`16.5px`** (`font-weight: 700`).

---

## 📊 Kết quả kiểm thử & Nghiệm thu
- **Hero Audio Player:** Nút loa 64px, hiệu ứng sóng xung nhịp và bộ chỉnh tốc độ hoạt động ổn định 100%.
- **Web Speech AI:** Phát âm chuẩn bản xứ, không sinh lỗi mạng 404.
- **Xử lý Null-Safe:** Triệt tiêu hoàn toàn lỗi crash `TypeError: Cannot read properties of undefined (reading 'replace')`.
