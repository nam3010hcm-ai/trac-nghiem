---
name: learn-unit-designer
description: Hướng dẫn kiến trúc Quản lý Unit Bài học 5 kỹ năng (bảng Supabase public.learning_units), Studio biên soạn Unit Designer (teacher.html#unit), window bindings inline, cấu trúc Element ID, tối ưu bố cục Teacher Admin và Phân cấp học tập đa môn học 3 cấp độ (Curriculum Hierarchy).
---

# STUDIO BIÊN SOẠN UNIT 5 KỸ NĂNG & PHÂN CẤP MÔN HỌC (CURRICULUM)

## 📌 Tổng quan
Phân hệ Quản trị Bài học & Studio Biên soạn Unit (`teacher.html#unit`, `teacher.html#curriculum`) cung cấp bộ công cụ trực quan No-Code WYSIWYG cho giảng viên để thiết kế trọn gói bài học tích hợp 5 Kỹ năng (Listening, Reading, Speaking, Writing, Language Focus), đồng thời tổ chức cây chương trình học 3 cấp độ chuẩn sư phạm.

---

## 🛠️ Các Chức Năng & Giải Thuật Cốt Lõi

### 1. Kiến Trúc Cơ Sở Dữ Liệu Supabase: Bảng `learning_units`
- **Tệp nguồn:** [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js), [`js/units/units-list.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/units-list.js), [`js/units/designer-save.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-save.js)
- **Tên bảng Supabase chuẩn: `learning_units` (Tránh lỗi 404 / PGRST205):**
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
- **Cơ chế Fallback an toàn:**
  - Khi nạp dữ liệu (`loadUnits`, `loadUnitsData`) hoặc lưu (`safeUpsertUnit`), luôn ưu tiên bảng `learning_units`. Nếu gặp lỗi bảng chưa tồn tại, hệ thống tự động fallback sang `units` và nạp an toàn từ `SAMPLE_LEARN_UNITS` mà không gây Exception giao diện.
  - Phân giải thông minh cả 2 định dạng: cột rời (`listening`, `reading`...) và chuỗi JSON `content`.

---

### 2. Global Window Bindings Bắt Buộc Cho Module Units
- **Tệp nguồn:** [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js), [`js/units/units-list.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/units-list.js), [`js/units/designer-core.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-core.js), [`js/units/designer-save.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-save.js), [`js/units/designer-handlers.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-handlers.js)
- **Nguyên tắc:** Mọi sự kiện inline trong `teacher.html` (`onchange`, `onclick`, `oninput`) đều gọi qua `window.*`. Các hàm sau BẮT BUỘC phải được bind lên `window`:
  - Quản lý danh sách: `window.loadUnits`, `window.renderUnitsList`, `window.populateUnitFilters`, `window.updateModuleFilterOptions`, `window.updateDatalists`.
  - Thao tác Unit: `window.toggleUnitVisibility`, `window.deleteUnit`, `window.onUnitFilterChange`, `window.onUnitSearchInput`.
  - Điều khiển Editor: `window.openUnitEditor`, `window.closeUnitEditor`, `window.saveUnit`, `window.switchDesignerSkillTab`.
  - Tương tác Form: `window.updateDesignerSubjectLabels`, `window.onDesignerSubjectInput`, `window.autoFitAllDesignerTextareas`, `window.autoUpdateLfScrambled`.

---

### 3. Đồng Bộ Element ID & Container Form 5 Kỹ Năng
- Container danh sách Unit trong `teacher.html`: `#unit-management-list` (layout Grid responsive).
- Modal biên soạn Unit 5 kỹ năng: `#unit-designer-modal`.
- **Container nội dung form 5 kỹ năng:** `#ud-skill-content` (**CỰC KỲ QUAN TRỌNG**: trong `teacher.html` là `<div id="ud-skill-content"></div>`, hàm `renderCurrentDesignerSkillBody()` phải trỏ chính xác vào `#ud-skill-content` hoặc fallback `#ud-skill-content-wrap` để nạp đúng giao diện vào DOM).
- Badge đếm số lượng Unit: `#unit-count-badge`.

---

### 4. Dán Nhanh Sách Giáo Khoa & Thanh Chèn Ký Tự IPA
- **Tệp nguồn:** [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js)
- Giao diện bảng No-Code WYSIWYG có thanh chèn nhanh các ký tự phiên âm quốc tế IPA (`æ, ə, ɪ, ʊ, θ, ð, ʃ, ʒ, ŋ, ɡ, tʃ, dʒ...`).
- Bộ phân tích Quick Paste thông minh tự động nhận diện và bóc tách danh sách từ vựng `1-8` và danh sách định nghĩa `a-h` theo chuẩn SGK.

---

### 5. Phân Cấp Học Tập Đa Môn Học 3 Cấp Độ (Curriculum Hierarchy Engine)
- **Tệp nguồn:** [`js/curriculum.js`](file:///Users/namtp/Downloads/trac-nghiem/js/curriculum.js), [`teacher.html#curriculum`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html), [`js/units.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units.js)
- **Cấu trúc 3 cấp độ:** `Môn học (Subject) ➔ Học phần (Module / Course) ➔ Unit Bài học (5 Kỹ năng)`.
- **Cơ chế Khử trùng lặp (Deduplication & Normalization):**
  - Hàm chuẩn hóa `matchSubject()` và `matchModule()` tự động gom nhóm Unit vào đúng Môn học (`🇬🇧 Tiếng Anh`, `📐 Toán Học`, `⚡ Vật Lý`, `🧪 Hóa Học`, `💻 Tin Học`), triệt tiêu hiện tượng trùng lặp do khác biệt khoảng trắng hoặc emoji.
- **Tích hợp hai chiều với Unit Designer:**
  - Nút *"➕ Thêm Unit 5 Kỹ Năng"* trên từng học phần tự động mở Unit Designer và điền sẵn Môn học + Học phần tương ứng (`openUnitEditor(null, subject, module)`).
  - Thẻ Unit hiển thị đầy đủ huy hiệu 5 kỹ năng: 🎧 `Lis`, 📖 `Read`, 🗣️ `Spk`, ✍️ `Wri`, 🔍 `LF`.

---

### 6. Tối Ưu Bố Cục Quản Trị & Chống Lỗi Gấp Khúc Nút Điều Hướng
- **Tệp nguồn:** [`teacher.html`](file:///Users/namtp/Downloads/trac-nghiem/teacher.html), [`css/style/style-student.css`](file:///Users/namtp/Downloads/trac-nghiem/css/style/style-student.css)
- Thiết lập `white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;` cho `.btn`, `.btn-sm`, `.admin-cmd-search` chống gãy dòng chữ theo chiều dọc khi thu nhỏ màn hình.
- Cố định thanh tìm kiếm `.admin-cmd-search` kích thước `min-width: 260px; max-width: 340px;` kèm phím tắt `Ctrl + K`.

---

## 📊 Kết quả kiểm thử & Nghiệm thu
- **Quản lý & Thiết kế Unit 5 Kỹ năng:** Đồng bộ 100% với bảng `learning_units` Supabase, render chuẩn vào `#ud-skill-content`.
- **Phân Cấp Học Phần 3 Cấp Độ (Curriculum Tree):** Đồng bộ Môn học ➔ Học phần ➔ Unit 5 Kỹ năng mượt mà 100%.
