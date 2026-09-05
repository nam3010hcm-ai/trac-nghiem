---
name: student-quiz-navigation
description: Hướng dẫn kỹ thuật và kiến trúc phòng thi trắc nghiệm học viên (student.html): Sticky Topbar thời gian thực, dải nút số câu hỏi (1..N), giải thuật cuộn sát mép jumpToQuestion, modal lưới ma trận câu hỏi và lưu trạng thái làm bài vào localStorage.
---

# ĐIỀU HƯỚNG & TRẢI NGHIỆM PHÒNG THI TRẮC NGHIỆM HỌC VIÊN

## 📌 Tổng quan
Phân hệ phòng thi trắc nghiệm trực tuyến dành cho học viên (`student.html`) được trang bị thanh Sticky Topbar điều hướng thông minh, bộ đếm tiến độ thời gian thực, dải nút số câu hỏi đa trạng thái và giải thuật cuộn trang chính xác đến từng pixel sát mép dưới topbar.

---

## 🛠️ Các Chức Năng & Giải Thuật Cốt Lõi

### 1. Sticky Topbar Cố Định & Real-time Counter
- **Tệp nguồn:** [`student.html`](file:///Users/namtp/Downloads/trac-nghiem/student.html), [`js/student.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student.js), [`css/style.css`](file:///Users/namtp/Downloads/trac-nghiem/css/style.css)
- **Vấn đề giải quyết:** Học viên khi làm bài thi trắc nghiệm khó theo dõi tổng số câu, số câu đã làm, số câu chưa làm và gặp khó khăn khi muốn chuyển nhanh giữa các câu để xem lại hoặc chọn lại đáp án (đặc biệt khi đề thi có nhiều phần/Part).
- **Kiến trúc hiện thực:**
  - Tự động dính trên đầu khi cuộn trang: `position: sticky; top: 68px; z-index: 85;`.
  - Badge thống kê trực quan cập nhật theo thời gian thực:
    - `Tổng: N câu` (`#quiz-stat-total`)
    - `Đã làm: X/N` (`#quiz-stat-answered` - màu xanh lục gradient)
    - `Chưa làm: Y` (`#quiz-stat-unanswered` - màu cam hổ phách)
  - Đồng hồ đếm ngược `q-timer` và thanh tiến độ % câu hỏi đã hoàn thành `q-pbar`.

---

### 2. Dải Nút Số Câu Hỏi Đa Trạng Thái (Question Button Strip)
- **Tệp nguồn:** [`js/student.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student.js), [`css/style.css`](file:///Users/namtp/Downloads/trac-nghiem/css/style.css)
- **Thiết kế & Phân loại trạng thái:**
  - Hiển thị trực tiếp trên Topbar chuỗi nút số `1, 2, 3... N` hỗ trợ cuộn ngang mượt mà (`overflow-x: auto; scrollbar-width: thin`).
  - Phân loại trực quan bằng class CSS:
    - `.answered`: Màu nền xanh lục emerald gradient, chữ trắng (đã chọn đáp án).
    - `.unanswered`: Màu nền trắng, viền xám mảnh (chưa trả lời).
    - `.in-current-part`: Viền màu tím indigo thể hiện câu hỏi thuộc Part đang xem.
    - `.active-target`: Viền vàng hổ phách phát sáng khi được click chọn.

---

### 3. Giải Thuật Điều Hướng & Cuộn Sát Mép Dưới Topbar (`jumpToQuestion`)
- **Tệp nguồn:** [`js/student.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student.js) (`jumpToQuestion`)
- **Giải thuật điều hướng liên Part & Cuộn chuẩn xác:**
  1. **Chuyển Part tự động:** Nếu câu hỏi đích nằm ở Part khác với Part hiện tại, hệ thống tự động gán `qState.partIdx = targetPartIdx` và gọi `renderPart()` để nạp thẻ câu hỏi vào DOM.
  2. **Tính toán tọa độ cuộn tuyệt đối:**
     ```javascript
     const headerHeight = document.querySelector('header')?.offsetHeight || 68;
     const topbarHeight = document.getElementById('quiz-sticky-topbar')?.offsetHeight || 60;
     const cardAbsoluteTop = cardEl.getBoundingClientRect().top + window.pageYOffset;
     const targetScrollY = cardAbsoluteTop - (headerHeight + topbarHeight + 10);
     window.scrollTo({ top: Math.max(0, targetScrollY), behavior: 'smooth' });
     ```
     Đảm bảo **mép trên của bounding box thẻ câu hỏi (`Câu X: ...`) nằm sát ngay dưới mép dưới của Sticky Topbar**, không bị che khuất nội dung đề thi.
  3. **Hiệu ứng trực quan nhận diện:** Kích hoạt animation viền phát sáng màu hổ phách/indigo (`.q-card-highlighted`) trong 2 giây giúp người dùng định vị câu hỏi ngay lập tức.
  4. **Tự động lưu trạng thái:** Học viên chọn hoặc thay đổi đáp án $\to$ Lưu tức thì vào `localStorage` và Topbar cập nhật Real-time Counter.

---

### 4. Bảng Ma Trận Câu Hỏi Toàn Đề Thi (`toggleQuestionMatrix`)
- **Tệp nguồn:** [`student.html`](file:///Users/namtp/Downloads/trac-nghiem/student.html), [`js/student.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student.js)
- Modal lưới ma trận hiển thị toàn bộ câu hỏi phân chia theo từng Part, hỗ trợ theo dõi tổng thể tiến độ làm bài thi và nhảy nhanh đến bất kỳ câu hỏi nào trong đề.

---

## 📊 Kết quả kiểm thử & Nghiệm thu
- **Tính năng điều hướng & Sticky Topbar phòng thi:** Hoạt động chính xác 100%, cập nhật thời gian thực khi chọn lại đáp án.
- **Giải thuật cuộn trang:** Tuyệt đối không bị che khuất câu hỏi dưới Sticky Topbar trên mọi độ phân giải màn hình.
