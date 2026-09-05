---
name: learn-reading-studio
description: Hướng dẫn kỹ thuật và kiến trúc phân hệ Đọc hiểu (Reading Studio): 10 dạng bài tập đọc hiểu sư phạm chuẩn quốc tế (Pre-reading, Skimming, Scanning Table, Matching, True/False, TFNG, Summary Cloze, Sequencing, Detailed MCQ, Backward Spelling) cho cả giáo viên và học viên.
---

# STUDIO 10 DẠNG BÀI TẬP ĐỌC HIỂU SƯ PHẠM CHUẨN QUỐC TẾ

## 📌 Tổng quan
Phân hệ Đọc hiểu (Reading Studio) cung cấp giải pháp toàn diện từ khâu thiết kế bài giảng của giáo viên đến trải nghiệm tương tác học tập và chấm điểm tự động của học viên với trọn bộ 10 dạng bài tập đọc hiểu theo chuẩn khảo thí quốc tế (IELTS Reading, Cambridge CEFR).

---

## 🛠️ Danh Sách 10 Dạng Bài Tập Đọc Hiểu Chuẩn Sư Phạm

- **Tệp nguồn:** [`js/units/designer-reading-exercises.js`](file:///Users/namtp/Downloads/trac-nghiem/js/units/designer-reading-exercises.js), [`js/learn/learn-reading-exercises.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-reading-exercises.js), [`js/learn/learn-reading-eval.js`](file:///Users/namtp/Downloads/trac-nghiem/js/learn/learn-reading-eval.js)

| STT | Dạng bài (`type`) | Tên sư phạm | Đặc trưng & Quy chuẩn dữ liệu |
| :--- | :--- | :--- | :--- |
| 1 | `pre_reading` | 🟢 Pre-reading | Kích hoạt kiến thức nền, câu hỏi gợi mở thảo luận trước khi đọc văn bản chính. |
| 2 | `skimming` | 🔵 Skimming | Đọc lướt tìm ý chính / đại ý toàn bài với đồng hồ bấm giờ thử thách (60 giây). |
| 3 | `scanning_table` | 🔵 Scanning Table | Bảng tra cứu số liệu, dữ kiện, tên riêng hoặc mốc thời gian chi tiết. |
| 4 | `matching` | 🟡 Matching Pairs | Nối từ vựng 1–8 với định nghĩa tiếng Anh a–h (có công cụ dán nhanh từ vựng). |
| 5 | `true_false_group`| 🟠 True / False | Nhận định Đúng / Sai kiểm tra mức độ nắm bắt thông tin cốt lõi. |
| 6 | `tfng` | 🟠 True / False / Not Given | Suy luận đọc hiểu chuyên sâu chuẩn học thuật quốc tế (IELTS Reading). |
| 7 | `summary_cloze` | 🟣 Summary Cloze | Điền từ khóa thích hợp vào đoạn tóm tắt khuyết `[BLANK_1]`, `[BLANK_2]`. |
| 8 | `sequencing` | 🟣 Sequencing | Sắp xếp chuỗi sự kiện hoặc diễn biến câu chuyện theo đúng trình tự thời gian/logic. |
| 9 | `mcq_group` | 🔴 Detailed MCQ | Trắc nghiệm 4 lựa chọn A, B, C, D kèm giải thích chi tiết đáp án chuẩn. |
| 10 | `backward_spelling`| 🔤 Backward Spelling | Trò chơi xếp chữ đảo ngược rèn luyện trí nhớ chính tả từ vựng bài đọc. |

---

## 🎨 Giao Diện Studio Cho Giáo Viên (`teacher.html#unit`)

1. **Thêm nhanh bài tập:** Dropdown **`➕ Thêm Dạng Bài Tập Mới (Chọn 1/10 dạng)`** cho phép giáo viên chèn tức thì bất kỳ cấu trúc bài tập nào vào Unit đang soạn.
2. **Bộ bài tập mẫu sư phạm:** Nút **`✨ Nạp trọn bộ 10 dạng mẫu`** (`loadSample10ReadingExercises()`) tự động sinh đầy đủ cả 10 dạng bài tập mẫu chuẩn hóa chỉ với 1 click.
3. **Dọn dẹp nhanh:** Nút **`🗑️ Xóa hết bài tập`** (`clearAllReadingExercises()`) hỗ trợ khởi tạo lại bài đọc sạch sẽ.
4. **Biên tập động:** Hỗ trợ thêm/xóa dòng câu hỏi, thêm/xóa nhận định, thêm/xóa cặp nối từ bằng các nút bấm `➕ Thêm` và `🗑️ Xóa` phản hồi tức thì.

---

## 🚀 Trình Render & Đánh Giá Tương Tác Học Viên (`learn.html`)

- **Hiển thị song song (Split Screen):** Đoạn văn đọc hiểu (`.reading-passage`) hiển thị bên trái với typography chuẩn VnExpress (19px, line-height 2.0), bài tập hiển thị bên phải giúp học viên vừa đọc vừa thao tác thuận tiện.
- **Từ điển tương tác (Interactive Vocabulary):** Nhấp vào các từ vựng nổi bật trong bài để xem popup phiên âm IPA, từ loại và dịch nghĩa tiếng Việt.
- **Chấm điểm & Phản hồi (`learn-reading-eval.js`):** Tự động đối soát câu trả lời, tô màu trực quan (Xanh lục: Đúng, Đỏ: Sai), hiển thị giải thích và cộng điểm thưởng XP.

---

## 📊 Kết quả kiểm thử & Nghiệm thu
- **Hệ thống 10 dạng bài tập đọc hiểu:** Tích hợp đầy đủ 10/10 dạng chuẩn quốc tế, hoạt động ổn định trên cả giao diện biên soạn giáo viên và làm bài học viên.
- **Không có lỗi cú pháp hay runtime error khi nạp hoặc chuyển đổi giữa các dạng bài tập.**
