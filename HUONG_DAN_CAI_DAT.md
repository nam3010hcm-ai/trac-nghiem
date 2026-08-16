# Hướng Dẫn Hệ Thống EduCore: Tính Năng Video Roleplay 2 Nhân Vật A & B

## 1. Giới thiệu Tính Năng Video Roleplay Phát Âm Tiếng Anh
Hệ thống cho phép tạo các bài học hội thoại giao tiếp mô phỏng phát âm tiếng Anh giữa 2 nhân vật (Nhân vật A và Nhân vật B):
- **Phía Học Viên (`learn.html`)**:
  - Chọn đóng vai **Nhân vật A** hoặc **Nhân vật B** (hoặc luyện cả 2 vai).
  - Tự động phát video và giọng đọc của đối tác (máy) khi đến lượt đối tác.
  - Khi đến lượt học viên: Video chuyển sang trạng thái chờ, hiển thị câu cần đọc + phiên âm IPA + nghĩa tiếng Việt + mẹo phát âm.
  - Học viên bấm 🎙️ để phát âm -> Hệ thống nhận diện giọng nói (Web Speech API), so khớp từng từ (tô màu xanh lá nếu đúng, đỏ/vàng nếu sai), tính % chuẩn xác (0-100%).
  - Đạt điểm >= 75%: Tặng +25 XP, âm thanh chúc mừng, tự động chuyển lượt thoại tiếp theo sau 1.6 giây.
  - Sau khi hoàn thành: Bảng tổng kết % chuẩn xác, thưởng +50 XP, pháo hoa ăn mừng và nút "Đổi vai (Luyện vai còn lại)" tức thì.

- **Phía Quản Trị / Giáo Viên (`teacher.html`)**:
  - Vào **Quản Lý Unit Bài Học** -> Mở **Thiết Kế Unit** -> Chọn Tab **🗣️ 3. Speaking**.
  - Chọn chế độ: **🎬 1. Hội thoại Video 2 Nhân Vật (A & B)**.
  - Cấu hình thông tin Nhân vật A (Tên, Avatar, Chức danh, Mã màu) và Nhân vật B.
  - Thêm danh sách các lượt thoại (A nói hoặc B nói), nhập câu tiếng Anh, IPA, nghĩa tiếng Việt, mẹo phát âm, dán link Video URL hoặc bấm nút **Upload** tải video trực tiếp từ máy lên Supabase Storage (`audio-bank` / `video-bank`).
  - Có nút **🔊 Nghe thử (TTS)** để kiểm tra giọng đọc câu thoại ngay trong bảng soạn thảo.

---

## 2. Cấu Trúc Bảng `learning_units` Trên Supabase (PostgreSQL)

```sql
CREATE TABLE IF NOT EXISTS public.learning_units (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL DEFAULT '🇬🇧 Tiếng Anh',
  module TEXT NOT NULL DEFAULT 'English B1 - General & Academic Skills',
  title TEXT NOT NULL,
  topic TEXT DEFAULT '',
  level TEXT DEFAULT 'A2 - B1',
  icon TEXT DEFAULT '📖',
  description TEXT DEFAULT '',
  is_hidden BOOLEAN DEFAULT FALSE,
  listening JSONB DEFAULT '[]'::jsonb,
  reading JSONB DEFAULT '[]'::jsonb,
  speaking JSONB DEFAULT '[]'::jsonb,
  writing JSONB DEFAULT '[]'::jsonb,
  language_focus JSONB DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at BIGINT
);

-- Cho phép đọc/ghi công khai hoặc theo quyền (RLS):
ALTER TABLE public.learning_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read learning_units" ON public.learning_units FOR SELECT USING (true);
CREATE POLICY "Public upsert learning_units" ON public.learning_units FOR ALL USING (true);
```

---

## 3. Cấu Trúc JSON Của Bài Học Video Roleplay
Trong cột `speaking` của bảng `learning_units`:

```json
[
  {
    "id": "spk_video_1",
    "type": "video_roleplay",
    "title": "🎬 Video Roleplay: Hotel Check-in & Inquiry",
    "topic": "Travel & Hospitality",
    "level": "A2 - B1",
    "description": "Mô phỏng hội thoại video tương tác giữa Lễ tân khách sạn (Emma) và Du khách (David).",
    "characterA": {
      "id": "A",
      "name": "Emma (Lễ tân khách sạn)",
      "avatar": "👩‍💼",
      "roleTitle": "Hotel Receptionist",
      "color": "#2563eb"
    },
    "characterB": {
      "id": "B",
      "name": "David (Du khách check-in)",
      "avatar": "🧑‍🦱",
      "roleTitle": "Guest / Traveler",
      "color": "#059669"
    },
    "dialogue": [
      {
        "id": "dlg_1",
        "speaker": "A",
        "speakerName": "Emma (Lễ tân)",
        "text": "Good morning! Welcome to Grand Palace Hotel. How may I help you today?",
        "ipa": "/ɡʊd ˈmɔː.nɪŋ! ˈwel.kəm tuː ɡrænd ˈpæl.ɪs həʊˈtel. haʊ meɪ aɪ help juː təˈdeɪ?/",
        "meaning": "Chào buổi sáng! Chào mừng quý khách đến khách sạn Grand Palace. Tôi có thể giúp gì cho quý khách?",
        "tip": "Nhấn trọng âm ở 'morning', 'welcome', 'hotel'. Nối âm 'help-you'.",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
      },
      {
        "id": "dlg_2",
        "speaker": "B",
        "speakerName": "David (Du khách)",
        "text": "Hi! I have a reservation under the name David Miller for two nights.",
        "ipa": "/haɪ! aɪ hæv ə ˌrez.əˈveɪ.ʃən ˈʌn.dər ðə neɪm ˈdeɪ.vɪd ˈmɪl.ər fɔːr tuː naɪts/",
        "meaning": "Chào bạn! Tôi có đặt phòng trước dưới tên David Miller cho hai đêm.",
        "tip": "Phát âm chuẩn âm đuôi /ts/ trong 'nights' và trọng âm chính trong /ˌrez.əˈveɪ.ʃən/.",
        "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"
      }
    ]
  }
]
```

