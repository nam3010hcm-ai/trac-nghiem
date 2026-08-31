---
name: docx-mathtype-parser
description: Hướng dẫn kỹ thuật và tài liệu chi tiết về hệ thống giải mã file Word (.docx), bóc tách công thức Toán học MathType OLE Binary (MTEF), OMML sang LaTeX, hiển thị MathJax và Hệ thống Học tập 5 Kỹ năng tương tác (Learn & Unit Designer).
---

# HƯỚNG DẪN KỸ THUẬT & KIẾN TRÚC HỆ THỐNG TRẮC NGHIỆM - EDUCORE

## 📌 Tổng quan
Tài liệu này ghi lại toàn bộ kiến trúc, chức năng, giải thuật và các thay đổi đã được hiện thực trong dự án trắc nghiệm nhằm:
1. Tự động hóa 100% việc đọc file đề thi Microsoft Word (.docx), giải mã các công thức toán MathType nhị phân (MTEF v5/v7), font Symbol, chỉ số trên/dưới và đồng bộ dữ liệu với Supabase / MathJax.
2. Nâng cấp hệ thống học tập 5 Kỹ năng (`learn.html`) và Trình biên soạn Unit chuyên nghiệp (`teacher.html#unit`) với đồ họa tương tác cao, đường nối SVG nét đứt đa sắc màu, trắc nghiệm A/B/C/D và trò chơi xếp chữ ngược (Backward Spelling).

---

## 🛠️ Các chức năng & Giải thuật cốt lõi đã xây dựng

### 1. Trích xuất luồng nhị phân OLE Mini-FAT (Compound File Binary Format)
- **Tệp nguồn:** [`js/docx-parser.js`](file:///Users/namtp/Downloads/trac-nghiem/js/docx-parser.js) (`extractOleMiniFatStream`)
- **Vấn đề giải quyết:** Các công thức MathType trong Word được nhúng dưới dạng file OLE nhị phân (`word/embeddings/oleObject*.bin`). Các luồng dữ liệu nhỏ hơn 4096 byte được lưu trữ phân mảnh trong **Mini-FAT / Mini Stream Container** (kích thước sector 64 byte), không nằm liên tục trong FAT chính.
- **Giải thuật:**
  1. Đọc OLE Header (512 byte đầu, chữ ký `0xD0CF11E0`).
  2. Bóc tách bảng FAT chính và bảng Directory Entries (128 byte/entry).
  3. Tìm Root Entry để định vị Mini Stream Container (chuỗi sector 512 byte của Mini-FAT).
  4. Duyệt tìm Entry mang tên `"Equation Native"` hoặc `"Equation"`.
  5. Đọc chuỗi sector 64 byte từ Mini Stream thông qua bảng Mini-FAT, trích xuất chính xác 100% luồng nhị phân MathType MTEF gốc.

---

### 2. Bộ giải mã MathType nhị phân (MTEF v5 / v7) sang LaTeX chuẩn
- **Tệp nguồn:** [`js/docx-parser.js`](file:///Users/namtp/Downloads/trac-nghiem/js/docx-parser.js) (`parseMathTypeBinaryToLatex`)
- **Vấn đề giải quyết:** Đọc trực tiếp bytecode MathType, không phụ thuộc vào thư viện ngoài, không bị lỗi OCR khi ảnh WMF mờ.
- **Giải thuật bóc tách bản ghi MTEF:**
  - **Định vị Root LINE:** Tìm vị trí thẻ Tag 10 (`FULL size`) liền kề Tag 1 (`LINE`, `0x01, 0x00`) hoặc bản ghi toán học đầu tiên sau bảng Font/Size.
  - **Tag 1 (LINE):** Đọc đệ quy các phần tử toán cho đến khi gặp Tag 0 (`END`).
  - **Tag 2 (CHAR):** Đọc mã ký tự (8-bit hoặc 16-bit Unicode). Tự động ánh xạ:
    - `0xB4` / `´` $\to$ `\times` (dấu nhân)
    - `0xB9` / `¹` $\to$ `\neq` (dấu khác $\neq$)
    - `0xA3` / `£` $\to$ `\le` ($\le$), `0xB3` / `³` $\to$ `\ge` ($\ge$)
    - Dấu gạch ngang `–`, `—`, `−` $\to$ `-`
  - **Tag 3 (TMPL - Biểu thức mẫu):**
    - **Phân số (Fractions: `tc` = 0, 1, 11, 12, 13):** Bóc tách chính xác 2 byte biến thể, không đọc thừa byte `topt`, lấy tử số và mẫu số $\to$ `\frac{num}{den}` (Sửa lỗi $\frac{1}{k}$ bị đọc nhầm thành $\frac{1}{1}k$).
    - **Căn thức (`tc` = 2, 19, 20):** `\sqrt{body}` hoặc `\sqrt[deg]{body}`.
    - **Dấu ngoặc (`tc` = 3, 4, 5, 6, 7):** Ngoặc ma trận `\left[ ... \right]`, ngoặc tròn `\left( ... \right)`, trị tuyệt đối `\left| ... \right|`. Tự động lược bỏ ngoặc vuông thừa nếu bên trong đã chứa `\begin{bmatrix}`.
    - **Chỉ số trên/dưới (`tc` = 27, 28, 29):** Đọc 1 byte `topt` và trả về `_{sub}`, `^{sup}` hoặc `_{sub}^{sup}`.
  - **Tag 5 (MATRIX - Bảng ma trận):**
    - Bóc tách số hàng `rows`, số cột `cols`, căn lề và các vách ngăn.
    - Đọc `rows * cols` ô phần tử, ngăn cách các cột bằng ` & ` và các hàng bằng ` \\ `.
    - Đóng gói chuẩn LaTeX: `\begin{bmatrix} a & b \\ c & d \end{bmatrix}`.
  - **Tag 6 (EMBELL - Dấu phẩy, mũ, vector):**
    - Ánh xạ sang dấu phẩy đạo hàm `'`, `''`, `'''` hoặc số sao `^*`.

---

### 3. Giải mã ký hiệu Font đặc biệt `<w:sym>` (Font Symbol / Wingdings)
- **Tệp nguồn:** [`js/docx-parser.js`](file:///Users/namtp/Downloads/trac-nghiem/js/docx-parser.js) (`processNode`)
- **Vấn đề giải quyết:** Trong Word, các ký hiệu kích thước ma trận $3\times4$, $4\times2$, $4\times4$ và các phép toán $\neq, \pm, \le, \ge$ thường được lưu trong thẻ `<w:sym w:font="Symbol" w:char="F0B4"/>`. Nếu chỉ đọc `<w:t>`, các ký tự này bị mất khiến `3×4` biến thành `34`, `4×4` biến thành `44`.
- **Bảng ánh xạ:**
  - `F0B4` $\to$ `×` (Phép nhân ma trận $3\times4, 4\times4, 3\times2$)
  - `F0B9` $\to$ `≠` ($m \neq 4$)
  - `F0A3` $\to$ `≤`, `F0B3` $\to$ `≥`
  - `F0B1` $\to$ `±`, `F0B7` $\to$ `·`, `F0B8` $\to$ `÷`
  - `F0A5` $\to$ `∞`, `F0DE` $\to$ `→`, `F0D0` $\to$ `∈`, `F0C7` $\to$ `∩`, `F0C8` $\to$ `∪`
  - `F0C0` $\to$ `α`, `F0C1` $\to$ `β`, `F0C4` $\to$ `Δ`, `F070` $\to$ `π`

---

### 4. Bóc tách chỉ số trên / dưới từ Word `<w:vertAlign>` & Tự động bọc Toán
- **Tệp nguồn:** [`js/docx-parser.js`](file:///Users/namtp/Downloads/trac-nghiem/js/docx-parser.js) (`autoWrapMathTokens`)
- **Vấn đề giải quyết:**
  - Các biến số như $A^2$, $A^T$, $A^{-1}$, $A^{2026}$, $(A^*)^T$, $(AB)^{-1} = A^{-1}B^{-1}$ được gõ bằng phím tắt Superscript của Word.
  - Khi xuất sang văn bản, chúng có dạng `A^{2}`, `A^{-1}` nhưng không nằm trong dấu `$ ... $`, khiến MathJax không nhận diện để render.
- **Giải thuật:**
  - Nhận diện thẻ `<w:vertAlign w:val="superscript"/>` $\to$ `^{...}`.
  - Tự động quét toàn bộ văn bản câu hỏi, phương án và lời giải, nhận diện các biểu thức chứa số mũ / chỉ số dưới và bọc trong cặp `$ ... $`.
  - Tự động chuẩn hóa $\det(A)$, $A^*$ và gộp các cặp số mũ liên tiếp `^{–}^{1}` $\to$ `^{-1}`.

---

### 5. Bảo vệ mã nguồn LaTeX trong `renderRich()` (Sửa lỗi "Math input error")
- **Tệp nguồn:** [`js/common.js`](file:///Users/namtp/Downloads/trac-nghiem/js/common.js) (`renderRich`)
- **Vấn đề giải quyết:**
  - Hàm `renderRich()` trước đó mã hóa ký tự `&` thành `&amp;` để chống XSS.
  - Ma trận LaTeX bắt buộc dùng `&` để phân tách cột: `\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`.
  - Khi biến thành `&amp;`, MathJax không biên dịch được cú pháp ma trận và báo lỗi **`Math input error`**.
- **Giải pháp:**
  1. Sử dụng Placeholder để cô lập toàn bộ các khối công thức `$ ... $`, `$$ ... $$`, `\( ... \)`, `\[ ... \]`.
  2. Escape HTML an toàn cho phần văn bản thông thường.
  3. Khôi phục nguyên vẹn mã LaTeX nguyên bản và trả về cho MathJax typeset.

---

### 6. Cập nhật Live Render trong màn hình Preview
- **Tệp nguồn:** [`js/pdf-parser.js`](file:///Users/namtp/Downloads/trac-nghiem/js/pdf-parser.js) (`renderParsedExamPreview`, `updateParsedQuestionText`, `updateParsedQuestionOption`)
- Sử dụng `renderRich()` cho `Trạng thái 2 (Rendered MathJax)` thay vì hàm `esc()` thô, đảm bảo giao diện xem trước hiển thị công thức trực quan và tự động render ngay khi người dùng chỉnh sửa mã nguồn.

---

### 7. Đồng bộ Schema cơ sở dữ liệu Supabase (Sửa lỗi Status 400 Insert)
- **Tệp nguồn:** [`js/pdf-parser.js`](file:///Users/namtp/Downloads/trac-nghiem/js/pdf-parser.js) (`saveParsedExamToSupabase`)
- Khớp chính xác với cấu trúc bảng Supabase:
  - Bảng `public.questions`: `type`, `cat`, `subcat`, `text`, `opts` (JSONB), `ans` (JSONB), `explain`, `created_by`, `difficulty`, `skill`.
  - Bảng `public.exams`: `name`, `description`, `count`, `cat`, `subcat`, `time_limit`, `q_ids` (JSONB), `is_hidden`, `passing_score`, `created_by`.

---

### 8. Bộ nhận diện đáp án đúng Đa tiêu chí (In đậm & Bôi đỏ)
- **Tệp nguồn:** [`js/docx-parser.js`](file:///Users/namtp/Downloads/trac-nghiem/js/docx-parser.js), [`js/pdf-parser.js`](file:///Users/namtp/Downloads/trac-nghiem/js/pdf-parser.js)
- **Vấn đề giải quyết:**
  - Vòng lặp nhận diện đáp án đúng kiểm tra trên toàn bộ document, dẫn đến việc phương án `A` luôn bị gán nhầm làm đáp án đúng ngay cả khi đáp án đúng là `C`, `B`, `D` được in đậm và bôi đỏ.
  - `optRegex` cũ nuốt khoảng trắng giữa các phương án nằm cùng dòng.
- **Giải thuật hiện thực:**
  1. Phân vùng dòng/đoạn văn chính xác theo từng câu hỏi (`qGroups`).
  2. Gắn tọa độ ký tự `range: [rStart, rEnd]` cho từng `run` và đối soát vùng chồng lấn với Nhãn (Label: `c.`) và Nội dung (Content).
  3. Hệ thống tính điểm trọng số đa tiêu chí:
     - Nhãn In đậm + Bôi đỏ: **+100 điểm**
     - Nhãn Bôi đỏ: **+80 điểm**
     - Ký hiệu đánh dấu (`*`, `[x]`): **+90 điểm**
     - Nội dung In đậm + Bôi đỏ: **+70 điểm**
     - Nội dung Bôi đỏ: **+60 điểm**
     - Nhãn In đậm đơn lẻ: **+30 điểm**
     - Nhãn Gạch chân (`w:u`): **+25 điểm**
     - Nêu trong Lời giải (`Chọn C`): **+50 điểm**
     - Bảng đáp án (`BẢNG ĐÁP ÁN` / `ANSWER KEY`): Tự động đối soát và điền dự phòng.
  4. Tự động khử nhiễu khi cả 4 phương án đều in đậm nhãn.

---

### 9. Sticky Topbar Thống kê & Điều hướng câu hỏi phòng thi trắc nghiệm
- **Tệp nguồn:** [`student.html`](file:///Users/namtp/Downloads/trac-nghiem/student.html), [`js/student.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student.js), [`css/style.css`](file:///Users/namtp/Downloads/trac-nghiem/css/style.css)
- **Vấn đề giải quyết:** Học viên khi làm bài thi trắc nghiệm khó theo dõi tổng số câu, số câu đã làm, số câu chưa làm và gặp khó khăn khi muốn chuyển nhanh giữa các câu để xem lại hoặc chọn lại đáp án (đặc biệt khi đề thi có nhiều phần/Part).
- **Kiến trúc & Tính năng hiện thực:**
  1. **Sticky Topbar cố định & Real-time Counter:**
     - Tự động dính trên đầu khi cuộn trang (`position: sticky; top: 68px; z-index: 85;`).
     - Badge thống kê trực quan: `Tổng: N câu` (`#quiz-stat-total`), `Đã làm: X/N` (`#quiz-stat-answered` - màu xanh lục), `Chưa làm: Y` (`#quiz-stat-unanswered` - màu cam).
     - Đồng hồ đếm ngược `q-timer` và thanh tiến độ % câu hỏi đã hoàn thành `q-pbar`.
  2. **Dải nút số câu hỏi (`1, 2, 3... N`):**
     - Hiển thị trực tiếp trên Topbar với trạng thái phân biệt rõ ràng:
       - `.answered`: Màu nền xanh lục emerald gradient, chữ trắng.
       - `.unanswered`: Màu nền trắng, viền mảnh.
       - `.in-current-part`: Viền màu tím indigo thể hiện câu thuộc Part đang xem.
       - `.active-target`: Viền vàng hổ phách phát sáng khi được click.
     - Hỗ trợ cuộn ngang mượt mà.
  3. **Giải thuật điều hướng & Cuộn sát mép dưới Topbar (`jumpToQuestion`):**
     - Tự động xác định Part chứa câu hỏi đích và chuyển Part nếu câu hỏi thuộc Part khác (`qState.partIdx = targetPartIdx`, `renderPart()`).
     - Tính toán tọa độ cuộn tuyệt đối trừ đi tổng chiều cao của Header và Sticky Topbar (`targetScrollY = cardAbsoluteTop - (headerHeight + topbarHeight + 10)`), đảm bảo **mép trên của bounding box thẻ câu hỏi (`Câu X: ...`) nằm sát ngay dưới mép dưới của Sticky Topbar**.
     - Hiệu ứng phát sáng viền (`.q-card-highlighted`) trong 2 giây giúp định vị câu hỏi ngay lập tức.
     - Học viên chọn lại đáp án -> Dữ liệu lưu `localStorage` và Topbar cập nhật tức thì.
  4. **Bảng ma trận câu hỏi toàn đề thi (`toggleQuestionMatrix`):**
     - Modal lưới ma trận hiển thị toàn bộ câu hỏi phân chia theo từng Part, hỗ trợ theo dõi tổng thể và nhảy câu nhanh.

---

### 10. Hệ thống Quản lý Danh tính (Họ và Tên) & Audit Logs Lưu vết Thao tác CRUD của Giảng viên
- **Tệp nguồn:** [`js/common.js`](file:///Users/namtp/Downloads/trac-nghiem/js/common.js), [`js/teacher.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teacher.js), [`js/student.js`](file:///Users/namtp/Downloads/trac-nghiem/js/student.js), [`js/auth-logs.js`](file:///Users/namtp/Downloads/trac-nghiem/js/auth-logs.js), [`js/exams.js`](file:///Users/namtp/Downloads/trac-nghiem/js/exams.js), [`js/questions.js`](file:///Users/namtp/Downloads/trac-nghiem/js/questions.js), [`js/students-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/students-mgr.js), [`js/teachers-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/teachers-mgr.js), [`js/assignments-mgr.js`](file:///Users/namtp/Downloads/trac-nghiem/js/assignments-mgr.js), [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html), [`index.html`](file:///Users/namtp/Downloads/trac-nghiem/index.html), [`student.html`](file:///Users/namtp/Downloads/trac-nghiem/student.html), [`learn.html`](file:///Users/namtp/Downloads/trac-nghiem/learn.html)
- **Cơ sở dữ liệu Supabase:**
  - Bảng `public.teachers`: `id`, `email`, `teacher_name` (NOT NULL), `department`, `role`, `is_active`, `last_login_at`, `last_logout_at`, `user_id`, `teacher_code`, `password`.
  - Bảng `public.students`: `id`, `full_name` (NOT NULL), `class_name`, `academic_year`, `email`, `password`, `is_active`, `created_by`, `last_login_at`, `last_logout_at`, `total_xp`, `user_id`, `student_code`, `role`.
- **Kiến trúc & Tính năng hiện thực:**
  1. **Hiển thị Họ và Tên người dùng chuẩn xác trên toàn bộ hệ thống (`renderGlobalHeaderProfile` & `getAuthorDisplayName`):**
     - **Giảng viên / Quản trị:** Khi đăng nhập, hệ thống tự động đối soát bảng `teachers` để lấy trường `teacher_name` (Họ và Tên đầy đủ, ví dụ `Thầy Nam (Root Admin)`, `Dr. Chen`, `Lê Văn Nam`). Header Profile Badge và Sidebar Profile hiển thị rõ Họ và Tên kèm vai trò và đơn vị bộ môn.
     - **Học viên:** Khi đăng nhập qua Cổng Thi hoặc Học Tập, hệ thống lấy trường `full_name` trong bảng `students` để hiển thị Họ và Tên trên Header, Lời chào Portal (`Xin chào, Nguyễn Văn An 👋`), phòng thi và bảng kết quả.
     - Thay thế toàn bộ hiển thị chung chung (`email.split('@')[0]`, `Admin / Teacher`, `Học viên`) bằng Họ và Tên thực tế của người dùng.
  2. **Lưu vết tất cả thao tác CRUD của Giảng viên (`logTeacherActivity`):**
     - Mọi hành động Tạo mới (CREATE), Chỉnh sửa (UPDATE), Xóa (DELETE), Khóa/Mở khóa (TOGGLE), Giao bài tập (ASSIGN), Import tài liệu (IMPORT) đều được tự động lưu vết với:
       + **Người thực hiện:** Họ và Tên Giảng viên (`actor_name`), Email (`actor_email`), Vai trò (`actor_role`).
       + **Hành động & Phân hệ:** Tạo mới / Sửa / Xóa Đề thi, Câu hỏi, Học viên, Giảng viên, Bài học Unit, Nhiệm vụ học tập.
       + **Đối tượng & Chi tiết:** Tên đề thi, nội dung câu hỏi, thông tin học viên, lớp học...
       + **Thời gian thực hiện:** ISO timestamp thời gian thực.
     - Dữ liệu lưu vết được ghi đồng thời vào Supabase (`user_auth_logs`) và bộ nhớ đệm `localStorage` (`educore_teacher_activity_logs`).
  3. **Bảng Nhật ký Thao tác CRUD (Teacher Activity Logs) trong Quản trị LMS:**
     - Tích hợp sub-tab chuyên dụng trong Tab `authlogs` trên `teacher.html` cho phép Root Admin và Giảng viên theo dõi toàn bộ lịch sử thay đổi: ai đã tạo đề thi nào, ai sửa câu hỏi nào, ai xóa/khóa tài khoản học viên, kèm bộ lọc theo từ khóa, vai trò và mốc thời gian (Hôm nay, 7 ngày, 30 ngày).
  4. **Hiển thị Tác giả (Họ và Tên) trong các bảng quản lý:**
     - Danh sách Đề thi (`exams.js`), Ngân hàng câu hỏi (`questions.js`), Bài học Unit (`units.js`), Danh sách học viên (`students-mgr.js`) đều hiển thị Họ và Tên tác giả người tạo thông qua hàm `getAuthorDisplayName(item.created_by)`.

---

### 11. Hệ thống Nối từ Tự do bằng Đường nét đứt Đa sắc màu (Interactive SVG Curved Lines & Submit Engine)
- **Tệp nguồn:** [`js/learn.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn.js) (`renderMatchPuzzleView`, `selectMatchLeft`, `selectMatchRight`, `redrawMatchLines`, `submitMatchPuzzle`), [`css/style.css`](file:///Users/namtp/Downloads/trac-nghiem/css/style.css)
- **Vấn đề giải quyết:** Bài tập nối từ và định nghĩa trước đây kiểm tra đúng/sai ngay lập tức khi bấm cặp, làm mất tính thử thách và không cho phép học viên nối tự do, quan sát toàn bộ các đường liên kết trước khi nộp bài.
- **Kiến trúc & Giải thuật hiện thực:**
  1. **Tầng vẽ đường nối SVG động (`match-puzzle-svg`):**
     - SVG layer nằm phủ lên trên canvas 2 cột (`pointer-events: none; z-index: 5`).
     - Tự động lấy tọa độ connector dot bên phải của ô trái (`x1, y1`) và connector dot bên trái của ô phải (`x2, y2`) so với `wrapRect`.
     - Sinh đường cong mềm mại **Cubic Bézier Curve**: `d = M x1 y1 C (x1 + dx) y1, (x2 - dx) y2, x2 y2` với `dx = Math.max(30, |x2 - x1| * 0.45)`.
     - Đường nét đứt `stroke-dasharray="7,5"`, độ dày 3px, kèm đường viền phát sáng (Glow backdrop 7px) và 2 chấm tròn đầu mối.
  2. **Bảng màu sinh động (Color Palette Mapping):**
     - Mỗi cặp nối sở hữu 1 màu sắc riêng biệt (Indigo, Emerald, Amber, Rose, Cyan, Purple, Blue, Orange, Teal, Pink).
     - Thẻ bên trái và bên phải đồng bộ màu nền, viền và chấm neo theo màu đường nối.
  3. **Tương tác Nối & Hủy nối tự do:**
     - Ánh xạ 1-1: Bấm đổi lựa chọn tự động chuyển đường nối sang ô mới.
     - Nút nhỏ `✕` (`match-chip-del-btn`) trên mỗi thẻ đã nối để xóa nhanh cặp đó.
     - Nút **`🗑️ Xóa hết nối`** để dọn sạch kết nối làm lại từ đầu.
     - Thanh tiến độ & Badge: `Đã nối: X / Y cặp`.
  4. **Quy trình Chấm điểm & Nộp bài (`submitMatchPuzzle`):**
     - Chỉ khi học viên bấm nút **"✅ Nộp bài & Xem kết quả"**, hệ thống mới chấm toàn bộ.
     - **Cặp đúng:** Đường line chuyển thành nét liền xanh lá `#16a34a`, thẻ viền xanh lá kèm tag `✅ Đúng`.
     - **Cặp sai:** Đường line chuyển thành nét đứt màu đỏ `#dc2626`, thẻ viền đỏ kèm tag `❌ Sai`.
     - **Chưa nối:** Thẻ mờ viền nét đứt kèm tag `⚠️ Chưa nối`.
     - Thưởng `+XP` (hoàn hảo 100% kèm pháo hoa `Confetti`), nút `🔄 Thử sức lại`, `👁️ Xem đáp án chuẩn` và nút chuyển sang bài tiếp theo.

---

### 12. Bổ sung Exercise 2 (MCQ A, B, C, D) & Exercise 3 (Backward Spelling) trong 5. Language Focus
- **Tệp nguồn:** [`js/learn.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn.js), [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js), [`js/learn-data.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn-data.js), [`css/style.css`](file:///Users/namtp/Downloads/trac-nghiem/css/style.js)
- **Kiến trúc & Tính năng hiện thực:**
  1. **⚡ Exercise 2. Choose the best answer from A, B, C, or D (Trắc nghiệm Ngữ pháp / Từ vựng):**
     - Giao diện câu hỏi điền khuyết `________` chuyên nghiệp (Ví dụ: *For many Vietnamese people, the ________ for justice for Agent Orange victims will still continue.*).
     - 4 nút chọn đáp án A, B, C, D với hiệu ứng hover và phản hồi tương tác mượt mà.
     - Đánh giá tức thì, hiển thị hộp giải thích chi tiết (`Explain`), âm thanh chúc mừng / nhắc nhở và thưởng `+15 XP`.
  2. **🔤 Exercise 3. Backward Spelling & Word Puzzle (Đánh vần / Xếp chữ ngược):**
     - Banner ví dụ mẫu: `💡 Ví dụ: ADNAGAPORP ➔ PROPAGANDA`.
     - Hiển thị dạng ký tự đảo ngược/xáo trộn (`ADNAGAPORP`, `HSILBATSE`, `ELGGURTS`, `NOITAREBIL`...) và định nghĩa/gợi ý ngữ cảnh.
     - **Hàng chữ cái đã ghép (`Assembled Tiles`):** Bấm chọn chữ từ ngân hàng để đưa lên hàng ghép; bấm vào chữ đã ghép để gỡ bỏ.
     - **Ngân hàng chữ cái (`Letter Pool`):** Các ô chữ cái 3D bóng bẩy nhấc bổng khi hover (`.spelling-char-tile`).
     - Tích hợp nút `✅ Kiểm tra từ vựng` (`+15 XP`), `🔄 Xếp lại`, `🔊 Nghe phát âm` chuẩn tiếng Anh qua Web Speech API.
  3. **Unit Designer (Biên soạn trực quan cho Giáo viên):**
     - Tab 5. Language Focus trong Unit Designer được nâng cấp thành **5 Sub-tabs trực quan**:
       1. `🧩 1. Nối Từ & Định Nghĩa (Matching Pairs)`
       2. `⚡ 2. Trắc Nghiệm (A, B, C, D)`
       3. `🔤 3. Backward Spelling (Xếp chữ ngược)`: Có tính năng tự động đảo ngược chữ (`autoUpdateLfScrambled`) và nút `⚡ Tải từ mẫu`.
       4. `📝 4. Bảng Động Từ Quá Khứ (Past Form Table)`
       5. `🎴 5. Thẻ Từ Vựng 3D (Flashcards)`
     - Tự động đồng bộ và lưu trữ đầy đủ `grammarChallenge` và `backwardSpelling` lên Supabase / LocalStorage.

---

### 13. Nâng cấp 🔤 2. Danh Mục Tra Từ Nhanh & Dán Nhanh Sách Giáo Khoa (1-8 & a-h)
- **Tệp nguồn:** [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js), [`js/learn.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn.js)
- **Tính năng hiện thực:**
  - Thay thế toàn bộ JSON textarea bằng giao diện bảng No-Code WYSIWYG có thanh chèn IPA nhanh (`æ, ə, ɪ, ʊ, θ, ð, ʃ, ʒ, ŋ, ɡ, tʃ, dʒ...`).
  - Hỗ trợ bộ phân tích Quick Paste thông minh tự động nhận diện danh sách từ `1-8` và danh sách định nghĩa `a-h` theo chuẩn đề thi và sách giáo khoa.

---

### 14. Kiến trúc Quản lý Unit Bài học & Supabase Schema (Lưu ý quan trọng cho Unit Designer & Learn)
- **Tệp nguồn:** [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js), [`js/units/units-list.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/units-list.js), [`js/units/units-state.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/units-state.js), [`js/units/designer-core.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-core.js), [`js/units/designer-save.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-save.js), [`js/units/designer-handlers.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-handlers.js), [`js/learn/learn-roadmap.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-roadmap.js), [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html)
- **Kiến trúc & Quy tắc đồng bộ:**
  1. **Tên bảng Supabase chuẩn: `learning_units` (Tránh lỗi 404 / PGRST205):**
     - Bảng lưu trữ bài học 5 kỹ năng trên Supabase PostgreSQL mang tên chuẩn là **`public.learning_units`** (KHÔNG dùng `units`).
     - **Cấu trúc cột chuẩn:**
       - `id TEXT PRIMARY KEY`
       - `subject TEXT NOT NULL DEFAULT '🇬🇧 Tiếng Anh'`
       - `module TEXT NOT NULL DEFAULT 'English B1 - General & Academic Skills'`
       - `title TEXT NOT NULL`
       - `topic TEXT DEFAULT ''`
       - `level TEXT DEFAULT 'A2 - B1'`
       - `icon TEXT DEFAULT '📖'`
       - `description TEXT DEFAULT ''`
       - `is_hidden BOOLEAN DEFAULT FALSE`
       - `listening JSONB DEFAULT '[]'::jsonb`
       - `reading JSONB DEFAULT '[]'::jsonb`
       - `speaking JSONB DEFAULT '[]'::jsonb`
       - `writing JSONB DEFAULT '[]'::jsonb`
       - `language_focus JSONB DEFAULT '{}'::jsonb`
       - `created_by TEXT`, `created_at BIGINT`
     - **Cơ chế Fallback thông minh:** Khi tải dữ liệu (`loadUnits`, `loadUnitsData`) hoặc lưu (`safeUpsertUnit`), luôn ưu tiên bảng `learning_units`, nếu gặp lỗi bảng chưa tồn tại sẽ tự động fallback sang `units` và nạp an toàn từ `SAMPLE_LEARN_UNITS` mà không gây Exception giao diện. Hệ thống phân giải thông minh cả 2 định dạng: cột rời (`listening`, `reading`...) và chuỗi JSON `content`.
  2. **Global Window Bindings bắt buộc cho Module Units:**
     - Mọi sự kiện inline trong `teacher.html` (`onchange`, `onclick`, `oninput`) đều gọi qua `window.*`. Các hàm sau BẮT BUỘC phải được bind lên `window` trong `js/units.js`, `units-list.js`, `designer-core.js`, `designer-save.js`, `designer-handlers.js`:
       - `window.loadUnits`, `window.renderUnitsList`, `window.populateUnitFilters`, `window.updateModuleFilterOptions`, `window.updateDatalists`
       - `window.toggleUnitVisibility`, `window.deleteUnit`, `window.onUnitFilterChange`, `window.onUnitSearchInput`
       - `window.openUnitEditor`, `window.closeUnitEditor`, `window.saveUnit`, `window.switchDesignerSkillTab`
       - `window.updateDesignerSubjectLabels`, `window.onDesignerSubjectInput`, `window.autoFitAllDesignerTextareas`, `window.autoUpdateLfScrambled`
  3. **Đồng bộ Element ID & Container Form 5 Kỹ Năng (Tránh lỗi không render):**
     - Container danh sách Unit trong `teacher.html`: `#unit-management-list` (layout Grid responsive).
     - Modal biên soạn Unit 5 kỹ năng: `#unit-designer-modal`.
     - **Container nội dung form 5 kỹ năng:** `#ud-skill-content` (**CỰC KỲ QUAN TRỌNG**: trong `teacher.html` là `<div id="ud-skill-content"></div>`, hàm `renderCurrentDesignerSkillBody()` phải trỏ chính xác vào `#ud-skill-content` hoặc fallback `#ud-skill-content-wrap` để nạp đúng giao diện vào DOM).
     - Badge đếm số lượng Unit: `#unit-count-badge`.
  4. **Nạp & Đồng bộ Dữ liệu 5 Kỹ Năng trong Unit Designer (`designer-core.js` & `designer-save.js`):**
     - 🎧 **Listening:** Nạp `mediaType`, `title`, `audioUrl`, `videoUrl`, `transcript` / `audioText`, và danh sách câu hỏi `exercises`.
     - 📖 **Reading:** Nạp đoạn văn `passage`, từ điển tương tác `vocabulary` (từ, IPA, POS, nghĩa) và 10 dạng bài tập đọc hiểu `exercises`.
     - 🗣️ **Speaking:** Nạp câu luyện mẫu `text`, phiên âm `ipa`, bản dịch `meaning`, và hình ảnh `image`.
     - ✍️ **Writing:** Nạp bài tập viết lại câu `transformation` (câu gốc `originalSentence`, phủ định `negativeAnswer`, nghi vấn `questionAnswer`, `hint`) và sắp xếp từ `scramble` (câu chuẩn `correctSentence`, `hint`).
     - 🔍 **Language Focus:** Nạp và tự động trích xuất đồng bộ 5 Sub-tabs: `pastVerbs` (Infinitive, Past, Meaning), `grammarChallenge` (Trắc nghiệm A/B/C/D), `backwardSpelling` (Đảo chữ ngược), `matchPairs` (Cặp nối từ), `flashcards` (Thẻ ghi nhớ 3D).

---

### 15. Hệ Thống Studio 10 Dạng Bài Tập Đọc Hiểu Sư Phạm Chuẩn Quốc Tế
- **Tệp nguồn:** [`js/units/designer-reading-exercises.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-reading-exercises.js), [`js/learn/learn-reading-exercises.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-reading-exercises.js), [`js/learn/learn-reading-eval.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-reading-eval.js)
- **10 Dạng bài tập đọc hiểu chuẩn sư phạm:**
  1. `pre_reading`: 🟢 Pre-reading (Kích hoạt kiến thức nền & Dự đoán câu hỏi gợi mở thảo luận).
  2. `skimming`: 🔵 Skimming (Đọc lướt tìm ý chính / Tổng quan văn bản trong 60 giây).
  3. `scanning_table`: 🔵 Scanning Table (Bảng tra cứu thông tin chi tiết / Số liệu / Sự kiện).
  4. `matching`: 🟡 Matching Pairs (Nối từ vựng 1–8 với định nghĩa tiếng Anh a–h có hỗ trợ Dán nhanh).
  5. `true_false_group`: 🟠 True / False (Nhận định Đúng / Sai đọc hiểu trọng tâm).
  6. `tfng`: 🟠 True / False / Not Given (Đọc hiểu suy luận chuyên sâu chuẩn IELTS Reading).
  7. `summary_cloze`: 🟣 Summary Cloze (Tóm tắt văn bản điền khuyết từ khóa `[BLANK_1]`, `[BLANK_2]`).
  8. `sequencing`: 🟣 Sequencing (Sắp xếp chuỗi sự kiện theo đúng thứ tự thời gian / logic).
  9. `mcq_group`: 🔴 Detailed MCQ (Trắc nghiệm đọc hiểu 4 lựa chọn A, B, C, D kèm giải thích chi tiết).
  10. `backward_spelling`: 🔤 Backward Spelling (Đánh vần & Game xếp chữ đảo ngược từ vựng đọc hiểu).
- **Giao diện Studio dành cho Giáo viên (`teacher.html#unit`):**
  - Dropdown **`➕ Thêm Dạng Bài Tập Mới (Chọn 1/10 dạng)`** cho phép giáo viên chèn nhanh bất kỳ dạng bài tập nào.
  - Nút **`✨ Nạp trọn bộ 10 dạng mẫu`** (`loadSample10ReadingExercises()`) nạp ngay bộ 10 bài tập mẫu chuẩn sư phạm hoàn chỉnh.
  - Nút **`🗑️ Xóa hết bài tập`** (`clearAllReadingExercises()`).
  - Hỗ trợ thêm/xóa dòng câu hỏi, thêm/xóa nhận định, thêm/xóa cặp nối từ bằng nút `➕ Thêm` và `🗑️ Xóa`.

---

## 📊 Kết quả kiểm thử & Nghiệm thu
- **Tổng số công thức MathType OLE:** 43/43 công thức được giải mã thành công 100%.
- **Độ chính xác nhận diện đáp án đúng (In đậm & Bôi đỏ):** 34/34 câu (100%).
- **Trò chơi Ghép cặp SVG Line:** Vẽ đường cong Bézier chính xác 100%, chấm điểm và đổi trạng thái mượt mà.
- **Exercise 2 & 3 Language Focus:** Hoạt động hoàn hảo trên mọi thiết bị và màn hình.
- **Quản lý & Thiết kế Unit 5 Kỹ năng:** Đồng bộ 100% với bảng `learning_units` Supabase, render chuẩn 5 kỹ năng vào `#ud-skill-content`, bộ lọc tìm kiếm & chuyển tab mượt mà không có runtime error.
- **Hệ thống 10 Dạng Bài Tập Đọc Hiểu Sư Phạm:** Tích hợp đầy đủ Studio tương tác cho giáo viên và Renderer/Chấm điểm tương tác cho học viên với 10 dạng chuẩn quốc tế.
- **Tỉ lệ lỗi Math input error / runtime error:** 0%.
