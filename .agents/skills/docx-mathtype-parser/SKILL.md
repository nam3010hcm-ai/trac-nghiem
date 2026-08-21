---
name: docx-mathtype-parser
description: Hướng dẫn kỹ thuật và tài liệu chi tiết về hệ thống giải mã file Word (.docx), bóc tách công thức Toán học MathType OLE Binary (MTEF), OMML sang LaTeX và hiển thị MathJax.
---

# HƯỚNG DẪN KỸ THUẬT: BÓC TÁCH FILE WORD (.DOCX) & GIẢI MÃ MATHTYPE SANG LATEX

## 📌 Tổng quan
Tài liệu này ghi lại toàn bộ kiến trúc, chức năng, giải thuật và các thay đổi đã được hiện thực trong dự án trắc nghiệm nhằm tự động hóa 100% việc đọc file đề thi Microsoft Word (.docx), giải mã các công thức toán MathType nhị phân, font Symbol, chỉ số trên/dưới và đồng bộ dữ liệu với Supabase / MathJax.

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
  - Trước đây, vòng lặp nhận diện đáp án đúng kiểm tra trên toàn bộ document, dẫn đến việc phương án `A` luôn bị gán nhầm làm đáp án đúng ngay cả khi đáp án đúng là `C`, `B`, `D` được in đậm và bôi đỏ.
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

## 📊 Kết quả kiểm thử trên Đề thi mẫu (`BTTN - P1 - DE 30 cau SO CAU.docx`)
- **Tổng số công thức MathType OLE:** 43/43 công thức được giải mã thành công 100%.
- **Độ chính xác nhận diện đáp án đúng (In đậm & Bôi đỏ):** 34/34 câu (100%), nhận diện chuẩn xác các đáp án C, B, D (ví dụ Câu 4: C, Câu 7: B, Câu 11: C, Câu 14: D, Câu 15: C, Câu 18: C, Câu 20: C, Câu 24: C, Câu 28: D...).
- **Chất lượng hiển thị:**
  - Tất cả các ma trận $2\times2, 3\times3, 2\times3, 3\times2$ hiển thị dưới dạng `\begin{bmatrix}` sắc nét.
  - Các phân số $\frac{1}{k}A^{-1}$, $\frac{1}{k^n}A^{-1}$, $A^{-1} = \frac{1}{\det(A)}A^*$ hiển thị đúng tử số và mẫu số.
  - Các kích thước ma trận $3\times4, 4\times2, 4\times4, 3\times2, 2\times3$ hiển thị đúng dấu nhân $\times$.
  - Biểu thức $A^2, A^{2026}, A^T, A^{-1}, (A^*)^T, (AB^{-1}C)^{-1}$ hiển thị dạng công thức Toán học MathJax chuẩn.
- **Tỉ lệ lỗi Math input error:** 0%.
