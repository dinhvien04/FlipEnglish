# FlipEnglish 🎓✨

**FlipEnglish** là nền tảng học từ vựng và luyện tập tiếng Anh tương tác cao cấp theo chuẩn khung tham chiếu Châu Âu (**CEFR A1 — C2**), tích hợp công nghệ trí tuệ nhân tạo **Google Gemini AI**, phương pháp lặp lại ngắt quãng (**Spaced Repetition System - SRS**), cùng hệ thống hình ảnh thực tế và phòng thi mô phỏng toàn diện.

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 1. 📚 Giáo Trình CEFR Toàn Diện (A1 — C2 Curriculum)
- **72 bài học** được cấu trúc bài bản với **720+ từ vựng & cụm từ** cốt lõi từ cơ bản đến nâng cao.
- **A1 — A2**: 100% hình ảnh minh họa chân thực, trực quan.
- **B1 — C2**: Tập trung ngữ cảnh chuyên sâu, từ vựng học thuật, thành ngữ, collocations, nuances và từ đồng nghĩa.
- Phát âm chuẩn bản xứ với hỗ trợ điều chỉnh tốc độ nghe (Normal 0.9x / Slow 0.65x).

### 2. 📇 Flashcard 3D & Quiz Đa Dạng
- Thẻ học từ vựng hiệu ứng lật 3D mượt mà, hỗ trợ thao tác chạm và phím tắt (Spacebar, Phím mũi tên).
- Hệ thống bài tập kiểm tra phong phú:
  - Trắc nghiệm Anh → Việt & Việt → Anh
  - Điền từ vào chỗ trống (Fill in the Blank)
  - Thử thách nghe phát âm (Listening Challenge)
  - Nhận diện qua ảnh thực tế (Picture Quiz)

### 3. 🤖 Gemini AI Trợ Giảng Thông Minh (AI Powered)
- **Explain My Mistake**: Phân tích lỗi sai ngữ cảnh tức thì, giải thích lý do đáp án chưa chính xác và gợi ý ví dụ đúng.
- **AI Targeted Practice**: Tự động sinh bộ câu hỏi luyện tập bổ trợ tức thời dựa trên các từ vựng người học làm sai.
- **AI Conversation Lab**: Luyện hội thoại ngữ cảnh thực tế (Du lịch, Phỏng vấn, Đàm phán, Học tập) với khả năng chấm điểm, sửa lỗi phát âm và ngữ pháp theo thời gian thực.
- **FlipLens (AI Vision)**: Chụp hoặc tải ảnh thực tế để Gemini AI phát hiện đồ vật xung quanh và chuyển đổi thành bài học từ vựng tức thì.

### 4. 🧠 Ôn Tập Thông Minh SRS (Spaced Repetition System)
- Thuật toán lặp lại ngắt quãng khoa học với 4 mức đánh giá: `Again` (10 phút), `Hard` (1 ngày), `Good` (3 ngày), `Easy` (7 ngày).
- Tự động ưu tiên từ vựng đến hạn ôn tập và từ vựng hay làm sai trong các bài kiểm tra.
- Lưu trữ tiến độ học tập an toàn, độc lập ngay trên trình duyệt (Local Persistence).

### 5. 🎯 Trung Tâm Thi & Đánh Giá (Practice Exam Center)
- Đa dạng chế độ thi: **Quick Test** (10 câu), **Level Exam** (25 câu), **Mock Exam** (50 câu).
- Đồng hồ bấm giờ thực tế, bảng điều hướng câu hỏi (Question Navigator), gắn cờ câu hỏi (Flag for Review).
- Báo cáo kết quả phân tích chi tiết kỹ năng, tự động chuyển từ vựng làm sai vào hàng đợi Smart Review.

### 6. 📱 Tối Ưu Responsive & Trải Nghiệm Cảm Ứng (Touch & Mobile First)
- Thiết kế thích ứng mượt mà trên **Điện thoại**, **iPad / Máy tính bảng**, và **Máy tính để bàn**.
- Tuân thủ tiêu chuẩn tiếp cận **WCAG 2.2**: Touch target $\ge 44\text{px} - 48\text{px}$, loại bỏ độ trễ chạm 300ms với `touch-action: manipulation`.
- Hỗ trợ đầy đủ vùng an toàn thiết bị (`safe-area-inset`) và chiều cao động (`100dvh`).

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Build Tool**: [Vite 6](https://vite.dev/), [esbuild](https://esbuild.github.io/)
- **Backend / API**: [Express](https://expressjs.com/), [Node.js](https://nodejs.org/), [Helmet](https://helmetjs.github.io/), [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- **AI Integration**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Google Gemini Interactions & Multimodal Vision API)
- **Schema Validation**: [Zod](https://zod.dev/)

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án (Getting Started)

### 1. Yêu cầu môi trường
- **Node.js**: Phiên bản 20.x hoặc 24.x
- **npm**: Phiên bản 10.x trở lên

### 2. Cài đặt dependencies
```bash
git clone https://github.com/dinhvien04/FlipEnglish.git
cd FlipEnglish
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` tại thư mục gốc của dự án:
```env
PORT=5173
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 4. Chạy môi trường phát triển (Development)
```bash
npm run dev
```
Truy cập ứng dụng tại: **`http://localhost:5173`**

### 5. Build và chạy Production
```bash
# Build dự án (Vite client + Express server)
npm run build

# Khởi chạy server production
npm run start
```

---

## 🧪 Kiểm Thử & Xác Thực (Validation & Tests)

Dự án bao gồm bộ kiểm thử chất lượng và toàn vẹn dữ liệu:

```bash
# Kiểm tra TypeScript type checking
npm run lint

# Xác thực tính toàn vẹn 72 bài học & 720 từ vựng CEFR
npm run validate:curriculum

# Kiểm thử bộ sinh đề thi và cấu hình phòng thi
npm run validate:exams

# Kiểm thử thuật toán lặp lại ngắt quãng Smart Review (SRS)
npm run validate:review

# Xác thực schema và kịch bản hội thoại AI Conversation Lab
npm run validate:conversation

# Kiểm thử bảo mật (Security Smoke Tests & Audit)
npm run security:audit
npm run test:security
```

---

## 🔒 Bảo Mật (Security Hardening)

- **Content Security Policy (CSP)** & HTTP Security Headers thông qua `Helmet`.
- **Chống tấn công Brute-force & DoS**: Tích hợp `express-rate-limit` với giới hạn riêng biệt cho từng endpoint AI.
- **Xác thực dữ liệu nghiêm ngặt**: Xác thực toàn bộ payload đầu vào bằng Zod schema `.strict()`, từ chối các trường lạ và kiểm tra magic bytes của ảnh tải lên.
- **Bảo vệ quyền riêng tư**: Toàn bộ dữ liệu hội thoại và ảnh tải lên được xử lý bảo mật trực tiếp theo phiên, không lưu trữ ảnh nhạy cảm lên máy chủ.

---

## 📄 Bản Quyền (License)

Dự án được xây dựng phục vụ mục đích giáo dục và nghiên cứu. Mọi quyền được bảo lưu bởi FlipEnglish.
