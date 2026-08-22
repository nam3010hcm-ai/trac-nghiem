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

---

## 4. Cấu Trúc JSON Của Bài Học Listening & Video Comprehension (Kỹ Năng Nghe & Xem Video)
Trong cột `listening` của bảng `learning_units`:

```json
[
  {
    "id": "lis_1",
    "title": "🎧 Audio: A Conversation at the Airport Check-in",
    "topic": "Travel & Tourism",
    "level": "A2 - B1",
    "mediaType": "audio", // "audio" | "video" | "tts"
    "audioUrl": "https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3",
    "videoUrl": "",
    "audioText": "Good morning. Where are you flying to today?...",
    "transcript": "Agent: Good morning. Where are you flying to today?\nPassenger: I'm flying to London Heathrow on flight BA178...",
    "image": "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=80",
    "speed": 1.0,
    "duration": "45s",
    "exercises": [
      {
        "id": "ex_1",
        "type": "mcq",
        "question": "Where is the passenger flying to?",
        "options": ["London Gatwick", "London Heathrow", "New York JFK", "Paris Charles de Gaulle"],
        "answer": 1,
        "explain": "The passenger says: \"I'm flying to London Heathrow on flight BA178.\""
      },
      {
        "id": "ex_2",
        "type": "dictation",
        "prompt": "Nghe và gõ lại chính xác câu thông báo cửa khởi hành:",
        "targetSentence": "Gate 24B starts boarding at 10:30.",
        "hint": "Bắt đầu bằng \"Gate...\""
      },
      {
        "id": "ex_3",
        "type": "gap_fill",
        "sentence": "May I see your ___ and ticket, please? Here is your ___ pass.",
        "answers": ["passport", "boarding"],
        "optionsBank": ["passport", "boarding", "luggage", "visa"]
      },
      {
        "id": "ex_4",
        "type": "true_false",
        "question": "The flight number is BA178 and boarding starts at 10:30.",
        "answer": true,
        "explain": "The agent states flight BA178 and Gate 24B boards at 10:30."
      }
    ]
  },
  {
    "id": "lis_2",
    "title": "🎬 Video Comprehension: Travel Vlog & City Exploration",
    "topic": "Travel & Lifestyle",
    "level": "B1 - B2",
    "mediaType": "video",
    "audioUrl": "",
    "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "audioText": "Welcome to our weekend travel journey!...",
    "transcript": "Host: Welcome to our weekend travel journey!\nToday we are exploring historical landmarks...",
    "image": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    "speed": 1.0,
    "duration": "1m 15s",
    "exercises": [
      {
        "id": "ex_lis2_1",
        "type": "mcq",
        "question": "What are the travelers exploring today in the video?",
        "options": ["Modern tech factories", "Historical landmarks and cozy coffee shops", "Deep ocean diving", "Mountain climbing only"],
        "answer": 1,
        "explain": "The video mentions exploring historical landmarks, cozy coffee shops, and traditional street food."
      },
      {
        "id": "ex_lis2_2",
        "type": "true_false",
        "question": "The host advises travelers to check the local transport schedule.",
        "answer": true,
        "explain": "The host explicitly said: \"always check the local transport schedule.\""
      }
    ]
  }
]
```

### Hướng Dẫn Giáo Viên Tải Lên Media & Quản Lý Bài Tập:
1. Mở **Quản Lý Unit Bài Học** trên `teacher.html` -> Chọn **Thiết Kế Unit**.
2. Chuyển sang Tab **🎧 1. Listening**.
3. Chọn nguồn nội dung:
   - **🎵 1. File Âm Thanh**: Bấm `📂 Tải Lên Audio` (hỗ trợ .mp3, .wav, .m4a, .ogg) để tải trực tiếp lên Supabase Storage (`audio-bank`), hoặc dán URL trực tiếp.
   - **🎬 2. Video Clip**: Bấm `📂 Tải Lên Video` (hỗ trợ .mp4, .webm, .mov) hoặc dán link video online / YouTube embed.
   - **🗣️ 3. Giọng Đọc AI**: Nhập văn bản và bấm `🔊 Nghe thử AI Voice`.
4. Nhập tiêu đề bài học, thời lượng, ảnh bìa và kịch bản văn bản (Transcript).
5. Sử dụng 4 nút thêm câu hỏi tương tác:
   - `🔘 Trắc Nghiệm (MCQ)`
   - `✍️ Chép Chính Tả (Dictation)`
   - `🔤 Điền Chỗ Trống (Gap Fill)`
   - `⚖️ Đúng / Sai (True / False)`
6. Bấm **💾 Lưu Unit & Cập Nhật Lên Hệ Thống** để đồng bộ lên Supabase.

