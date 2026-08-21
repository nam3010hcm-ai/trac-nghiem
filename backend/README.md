# LaTeX-OCR (Pix2TeX) & Exam Parser Backend

Backend Microservice chuyên dụng bóc tách đề thi toán học từ file **Word (.docx)** và **PDF**, sử dụng mô hình học sâu **LaTeX-OCR (Pix2TeX)** để chuyển đổi trực tiếp mọi hình ảnh công thức toán học sang mã LaTeX chuẩn `$ ... $`.

---

## 1. Cài đặt và Chạy trên máy tính cá nhân (Local)

### Bước 1: Cài đặt các thư viện cần thiết
```bash
cd backend
pip install -r requirements.txt
```

### Bước 2: Khởi chạy Server
```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

Server sẽ chạy tại địa chỉ: `http://localhost:8000` (Tài liệu API tại: `http://localhost:8000/docs`).

---

## 2. Triển khai miễn phí lên Cloud (Hugging Face Spaces / Render / Railway)

### Cách 1: Triển khai lên Hugging Face Spaces (Khuyên dùng - Miễn phí GPU/CPU)
1. Tạo một **Space** mới trên [Hugging Face](https://huggingface.co/new-space).
2. Chọn **Docker** làm SDK.
3. Tải toàn bộ thư mục `backend/` (`Dockerfile`, `requirements.txt`, `server.py`) lên Space.
4. Hugging Face sẽ tự động build và cung cấp cho bạn một đường dẫn API dạng:
   `https://[username]-[spacename].hf.space`

---

## 3. Các API chính

| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Kiểm tra trạng thái server và model |
| `POST` | `/api/ocr-math` | Gửi 1 ảnh công thức $\to$ Nhận về mã LaTeX `$ ... $` |
| `POST` | `/api/parse-exam` | Tải lên file `.docx` hoặc `.pdf` $\to$ Nhận về toàn bộ câu hỏi và công thức đã được OCR |
