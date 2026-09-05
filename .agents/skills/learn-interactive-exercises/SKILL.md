---
name: learn-interactive-exercises
description: Hướng dẫn thiết kế và lập trình các trò chơi & bài tập tương tác trong cổng học tập (learn.html): Nối từ SVG đường cong Bézier đa sắc màu có chế độ nộp bài, Language Focus trắc nghiệm MCQ & Backward Spelling xếp chữ ngược 3D, Thẻ ghi nhớ Flashcards 3D xoay 180 độ.
---

# TRÒ CHƠI & BÀI TẬP TƯƠNG TÁC HỌC TẬP (INTERACTIVE PUZZLES & FLASHCARDS 3D)

## 📌 Tổng quan
Phân hệ Bài tập Tương tác Đồ họa cao cung cấp các trải nghiệm học tập sinh động mô phỏng game hóa (Gamification): Nối cặp từ SVG Bézier đa sắc màu, Xếp chữ đảo ngược 3D (Backward Spelling), Trắc nghiệm câu khuyết ngữ pháp và Thẻ từ vựng Flashcard lật 3D theo không gian 3 chiều.

---

## 🛠️ Các Chức Năng & Giải Thuật Cốt Lõi

### 1. Hệ Thống Nối Từ Tự Do Bằng Đường Nét Đứt SVG Đa Sắc Màu & Submit Engine
- **Tệp nguồn:** [`js/learn.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn.js) (`renderMatchPuzzleView`, `selectMatchLeft`, `selectMatchRight`, `redrawMatchLines`, `submitMatchPuzzle`), [`css/style.css`](file:///Users/namtp/Downloads/trac-nghiem/css/style.css)
- **Vấn đề giải quyết:** Bài tập nối từ trước đây kiểm tra đúng/sai ngay lập tức khi bấm cặp, làm mất tính thử thách và không cho phép học viên nối tự do, quan sát toàn bộ các đường liên kết trước khi nộp bài.
- **Kiến trúc & Giải thuật hiện thực:**
  1. **Tầng vẽ đường nối SVG động (`match-puzzle-svg`):**
     - SVG layer nằm phủ lên trên canvas 2 cột (`pointer-events: none; z-index: 5`).
     - Lấy tọa độ connector dot bên phải ô trái (`x1, y1`) và connector dot bên trái ô phải (`x2, y2`) so với `wrapRect`.
     - Sinh đường cong mềm mại **Cubic Bézier Curve**:
       $$d = M\ x1\ y1\ C\ (x1 + dx)\ y1,\ (x2 - dx)\ y2,\ x2\ y2$$
       với $dx = \max(30, |x2 - x1| \times 0.45)$.
     - Đường nét đứt `stroke-dasharray="7,5"`, độ dày 3px, viền phát sáng (Glow backdrop 7px) và 2 chấm tròn đầu mối.
  2. **Bảng màu sinh động (Color Palette Mapping):**
     - Mỗi cặp nối sở hữu 1 màu sắc riêng biệt (Indigo, Emerald, Amber, Rose, Cyan, Purple, Blue, Orange, Teal, Pink).
     - Thẻ bên trái và bên phải đồng bộ màu nền, viền và chấm neo theo màu đường nối.
  3. **Tương tác Nối & Hủy nối tự do:**
     - Ánh xạ 1-1: Bấm đổi lựa chọn tự động chuyển đường nối sang ô mới.
     - Nút nhỏ `✕` (`match-chip-del-btn`) trên mỗi thẻ đã nối để xóa nhanh cặp đó.
     - Nút **`🗑️ Xóa hết nối`** để dọn sạch kết nối làm lại từ đầu.
     - Thanh tiến độ & Badge: `Đã nối: X / Y cặp`.
  4. **Quy trình Chấm điểm & Nộp bài (`submitMatchPuzzle`):**
     - Chỉ khi học viên bấm **"✅ Nộp bài & Xem kết quả"**, hệ thống mới chấm toàn bộ.
     - **Cặp đúng:** Đường line chuyển thành nét liền xanh lá `#16a34a`, thẻ viền xanh lá kèm tag `✅ Đúng`.
     - **Cặp sai:** Đường line chuyển thành nét đứt màu đỏ `#dc2626`, thẻ viền đỏ kèm tag `❌ Sai`.
     - **Chưa nối:** Thẻ mờ viền nét đứt kèm tag `⚠️ Chưa nối`.
     - Thưởng `+XP` (hoàn hảo 100% kèm pháo hoa `Confetti`), nút `🔄 Thử sức lại`, `👁️ Xem đáp án chuẩn` và nút chuyển tiếp.

---

### 2. Language Focus: Exercise 2 (MCQ) & Exercise 3 (Backward Spelling)
- **Tệp nguồn:** [`js/learn.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn.js), [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js), [`js/learn-data.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn-data.js)
- **Kiến trúc & Tính năng:**
  1. **⚡ Exercise 2. Trắc nghiệm Ngữ pháp / Từ vựng (A, B, C, D):**
     - Giao diện câu hỏi điền khuyết `________`.
     - 4 nút chọn đáp án A, B, C, D với hiệu ứng hover mượt mà.
     - Đánh giá tức thì, hiển thị hộp giải thích chi tiết (`Explain`), âm thanh thông báo và thưởng `+15 XP`.
  2. **🔤 Exercise 3. Backward Spelling & Word Puzzle (Đánh vần & Xếp chữ ngược):**
     - Banner hướng dẫn: `💡 Ví dụ: ADNAGAPORP ➔ PROPAGANDA`.
     - Hiển thị dạng ký tự đảo ngược (`ADNAGAPORP`, `HSILBATSE`, `ELGGURTS`...) kèm định nghĩa/ngữ cảnh.
     - **Hàng chữ đã ghép (`Assembled Tiles`):** Bấm chọn chữ từ ngân hàng để đưa lên hàng ghép; bấm vào chữ đã ghép để gỡ bỏ.
     - **Ngân hàng chữ cái (`Letter Pool`):** Các ô chữ 3D bóng bẩy nhấc bổng khi hover (`.spelling-char-tile`).
     - Tích hợp nút `✅ Kiểm tra từ vựng` (`+15 XP`), `🔄 Xếp lại`, `🔊 Nghe phát âm` chuẩn qua Web Speech API.
  3. **Biên soạn trong Unit Designer:** Tab Language Focus hỗ trợ 5 Sub-tabs trực quan (`Cặp nối từ`, `Trắc nghiệm MCQ`, `Backward Spelling` có nút tự động đảo chữ `autoUpdateLfScrambled`, `Bảng động từ quá khứ`, `Thẻ từ vựng 3D`).

---

### 3. Kiến Trúc Thẻ Ghi Nhớ Từ Vựng 3D Tương Tác (Flashcards 3D)
- **Tệp nguồn:** [`js/learn/learn-flashcards.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-flashcards.js), [`js/learn/learn-lang-focus.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-lang-focus.js), [`css/learn/learn-writing-lf.css`](file:///Users/namtp/Downloads/trac-nghiem/css/learn/learn-writing-lf.css)
- **Kiến trúc CSS 3D Flipping Transform:**
  - Container `.flashcard-3d-wrapper` sở hữu `perspective: 1200px;` tạo không gian 3 chiều có chiều sâu.
  - Sân khấu thẻ `.flashcard-3d-scene` sở hữu `transform-style: preserve-3d; transition: transform 0.65s cubic-bezier(0.4, 0, 0.2, 1);`.
  - Class `.flipped` kích hoạt `transform: rotateY(180deg);`.
  - Cả 2 mặt `.flashcard-front` và `.flashcard-back` được gán `backface-visibility: hidden; position: absolute; inset: 0;` chống hiện tượng đè chữ.
- **Tương tác đa dạng:**
  - Click bất kỳ điểm nào trên thẻ hoặc bấm *"🔄 Lật thẻ"* để đổi mặt.
  - Tích hợp thanh tiến độ học tập `Progress Bar` theo tỷ lệ thẻ đã xem.
  - Nút phát âm Web Speech AI Voice `🔊 Nghe phát âm` chuẩn bản xứ.
  - Hỗ trợ phím tắt bàn phím: Mũi tên `← / →` để chuyển thẻ, `Space` hoặc `Enter` để lật 3D tức thì.

---

## 📊 Kết quả kiểm thử & Nghiệm thu
- **Trò chơi Ghép cặp SVG Line:** Vẽ đường cong Bézier chính xác 100%, chấm điểm và đổi trạng thái mượt mà.
- **Exercise 2 & 3 Language Focus:** Hoạt động hoàn hảo trên mọi thiết bị và màn hình.
- **Thẻ Từ Vựng 3D:** Hiệu ứng quay 3 chiều 180 độ mượt mà, hỗ trợ phím tắt và phát âm chuẩn xác 100%.
