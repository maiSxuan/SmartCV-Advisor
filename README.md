# SmartCV Advisor

SmartCV Advisor là MVP web app phân tích CV theo vị trí IT mục tiêu. Luồng hiện tại tập trung vào UC-012 đến UC-015:

1. Tải CV PDF/DOC/DOCX hoặc ảnh CV PNG/JPG/JPEG/WEBP/BMP và ghi nhận đồng ý xử lý dữ liệu.
2. Chọn vị trí mục tiêu.
3. Trích xuất nội dung CV, dùng GPT để tách section và review theo role.
4. Backend chuẩn hóa/cap điểm, lưu kết quả và hiển thị điểm tổng quan, 5 tiêu chí, lỗi cơ bản.

> Không commit `backend/.env`. API key GPT phải để trong `.env`, không hard-code trong code hoặc notebook.

## Yêu cầu môi trường

- Python 3.12+
- Node.js + npm
- MongoDB local hoặc MongoDB Atlas
- OpenAI API key

## Cấu trúc chính

```text
SmartCV-Advisor/
├─ backend/
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ data/
│  │  │  └─ it_role_skill_score_dataset.json
│  │  ├─ db.py
│  │  ├─ routes/
│  │  │  ├─ cv.py
│  │  │  ├─ analysis.py
│  │  │  └─ premium.py
│  │  └─ services/
│  │     ├─ cv_service.py
│  │     ├─ gpt_service.py
│  │     └─ analysis_service.py
│  ├─ create_collections.py
│  └─ .env.example
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ pages/
│  │  │  ├─ UploadCvPage.tsx
│  │  │  ├─ AnalysisResultPage.tsx
│  │  │  ├─ HistoryPage.tsx
│  │  │  └─ PlansPage.tsx
│  │  └─ services/api.ts
│  └─ package.json
└─ README.md
```

## 1. Cấu hình backend

Mở terminal tại thư mục `backend`:

```powershell
cd D:\SmartCV-Advisor\backend
```

Tạo virtual environment nếu chưa có:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

Cài dependency:

```powershell
pip install -r requirements.txt
```

Ảnh CV và PDF scan được đọc trực tiếp bằng GPT image model, nên không cần cài Tesseract hoặc Poppler.

Tạo file `.env` từ mẫu:

```powershell
Copy-Item .env.example .env
```

Mở `backend/.env` và điền giá trị thật:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=smartcv
MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000
MONGODB_CONNECT_TIMEOUT_MS=5000
MONGODB_SOCKET_TIMEOUT_MS=10000
CORS_ALLOW_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
CORS_ALLOW_ORIGIN_REGEX=^http://(localhost|127\.0\.0\.1):517[0-9]$
JWT_SECRET_KEY=replace_with_a_random_secret_of_at_least_32_bytes
JWT_ALGORITHM=HS256
ACCESS_TOKEN_MINUTES=1440
REFRESH_TOKEN_DAYS=7
REMEMBER_ME_REFRESH_DAYS=30
AUTH_MAX_FAILED_LOGIN_ATTEMPTS=5
AUTH_TEMP_LOCK_MINUTES=15
FRONTEND_URL=http://localhost:5173
AUTH_SMTP_HOST=smtp.gmail.com
AUTH_SMTP_PORT=465
AUTH_SMTP_USER=your-sender@gmail.com
AUTH_SMTP_PASS=your-google-app-password
AUTH_SMTP_USE_SSL=true
AUTH_SMTP_FROM=your-sender@gmail.com
EMAIL_VERIFICATION_TOKEN_MINUTES=30
PASSWORD_RESET_TOKEN_MINUTES=30
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_SECONDS=30
GPT_OCR_MAX_PDF_PAGES=5
GPT_OCR_PDF_RENDER_ZOOM=2.0
```

Nếu dùng MongoDB Atlas, thay `MONGODB_URI` bằng connection string Atlas. Nếu dùng key từng nằm trong notebook prototype, nên rotate/revoke key cũ rồi dán key mới vào `.env`.

## 2. Seed dữ liệu demo

Đảm bảo MongoDB chạy được, sau đó chạy:

```powershell
cd D:\SmartCV-Advisor\backend
.\.venv\Scripts\Activate.ps1
python create_collections.py
```

Nếu database đã seed từ bản cũ, vẫn chạy lại lệnh trên để bổ sung 15 role từ dataset. Script dùng upsert nên không cần xóa database trước.

Script sẽ tạo dữ liệu mẫu:

- User demo `KH001`, `KH002`
- 15 Role IT từ dataset `it_role_skill_score_dataset.json`
- 43 kỹ năng duy nhất và 645 cấu hình role-skill score
- CV demo `CV001`, `CV002`
- Kết quả demo `KQ001`
- Gói dịch vụ Free/Premium

Tài khoản demo sau khi seed:

| Email | Mật khẩu | Vai trò |
| --- | --- | --- |
| `minhan@example.com` | `Demo1234` | Registered |
| `hoangnam@example.com` | `Demo1234` | Premium |
| `admin@smartcv.vn` | `Demo1234` | Admin |

Luồng đăng ký gửi liên kết xác thực qua SMTP. Tài khoản mới chỉ có thể đăng nhập sau khi người dùng mở liên kết và xác thực email. Luồng quên mật khẩu cũng gửi liên kết một lần qua SMTP; token chỉ được lưu dưới dạng SHA-256 và không được trả về API.

Với Gmail, `AUTH_SMTP_PASS` phải là **App Password** của tài khoản gửi, không phải mật khẩu Gmail thông thường. Không commit file `.env` hoặc App Password lên Git.

## 3. Chạy backend

Chạy trực tiếp từ thư mục gốc của project (khuyến nghị):

```powershell
cd D:\SmartCV-Advisor
.\start-backend.ps1
```

Script này truyền `--app-dir backend`, vì vậy Uvicorn luôn tìm thấy package
`app` dù terminal được mở tại thư mục gốc.

Hoặc chạy thủ công bên trong thư mục backend:

```powershell
cd D:\SmartCV-Advisor\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend chạy tại:

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- Health check DB/GPT/OCR: `http://127.0.0.1:8000/api/health`

API chính cho luồng CV:

| Method | Endpoint | Use case |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | UC-008 đăng ký |
| `POST` | `/api/v1/auth/verify-email` | Xác thực email đăng ký |
| `POST` | `/api/v1/auth/resend-verification` | Gửi lại email xác thực |
| `POST` | `/api/v1/auth/login` | UC-009 đăng nhập |
| `POST` | `/api/v1/auth/forgot-password` | UC-009 quên mật khẩu |
| `POST` | `/api/v1/auth/reset-password` | UC-009 tạo mật khẩu mới |
| `POST` | `/api/v1/auth/logout` | UC-010 đăng xuất |
| `GET` | `/api/v1/users/me` | UC-011 xem hồ sơ cá nhân |
| `PATCH` | `/api/v1/users/me` | UC-011 cập nhật hồ sơ |
| `POST` | `/api/v1/users/me/data-deletion-request` | UC-011 yêu cầu xóa dữ liệu |
| `POST` | `/api/v1/cvs` | UC-012 tải CV + consent |
| `GET` | `/api/v1/career-roles` | UC-013 chọn vị trí |
| `POST` | `/api/v1/cvs/{cv_id}/analyses` | UC-014 phân tích/chấm điểm |
| `GET` | `/api/v1/analyses/{analysis_id}` | UC-015 xem kết quả |
| `GET` | `/api/v1/analyses?limit=10` | Lịch sử demo |
| `GET` | `/api/v1/service-plans` | Gói dịch vụ |

## 4. Pipeline GPT đang chạy như thế nào

Pipeline backend lấy cảm hứng từ notebook `Pipeline_CV_role_weighted.ipynb`, nhưng đã tách thành service production hơn:

1. `cv_service.py`
   - Validate extension, MIME, signature, dung lượng 5 MB.
   - Đọc text PDF bằng PyMuPDF.
   - Nếu PDF gần như không có text layer (`<300` ký tự), render các trang đầu bằng PyMuPDF rồi gửi ảnh sang GPT image model để OCR và tách section.
   - Đọc text DOCX bằng `python-docx`.
   - Đọc ảnh CV PNG/JPG/JPEG/WEBP/BMP trực tiếp bằng GPT image model.
   - Không dùng OCR cục bộ, không fallback Tesseract/Poppler cho ảnh hoặc PDF scan.
   - Với PDF text/DOCX, gọi GPT để tách section chuẩn: `Professional Summary`, `Education`, `Experience`, `Projects`, `Technical Skills`, `Certifications`, `Other`.
   - Nếu không có `OPENAI_API_KEY`, ảnh CV/PDF scan sẽ trả lỗi cấu hình rõ ràng; PDF text/DOCX vẫn có rule-based section parser dự phòng.

2. `gpt_service.py`
   - Đọc `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_IMAGE_MODEL`, `OPENAI_TIMEOUT_SECONDS` từ `.env`.
   - Gọi `client.chat.completions.create(...)` với `response_format={"type": "json_object"}` giống hướng notebook.
   - Dùng GPT image model cho OCR ảnh CV và PDF scan, sau đó trả `raw_text`, `sections`, `warnings`.
   - Prompt yêu cầu chỉ trả JSON, không markdown, không bịa thông tin ngoài CV.

3. `analysis_service.py`
   - Gọi GPT review section theo role/skill score bằng rubric dài tương tự notebook.
   - Danh sách role và `skill_score` lấy từ dataset `backend/app/data/it_role_skill_score_dataset.json`.
   - Tổng điểm lấy từ 6 section: `Professional Summary`, `Education`, `Experience`, `Projects`, `Technical Skills`, `Certifications`.
   - Trả thêm `technical_skill_assessment` theo nhóm bắt buộc/quan trọng/nice-to-have và `roadmap_recommendation`.
   - Backend vẫn normalize/cap điểm section theo tổng 100 và lưu `scoring_config_version`.
   - Nếu GPT lỗi, fallback rule-based scoring để demo không bị dừng.
   - Lưu metadata: `ModelVersion`, `PromptVersion`, `AnalysisMethod`.

## 5. Chạy frontend

Mở terminal mới:

```powershell
cd D:\SmartCV-Advisor\frontend
npm install
npm run dev -- --host 127.0.0.1
```

Frontend chạy tại:

```text
http://127.0.0.1:5173
```

Các màn hình chính:

- Đăng ký: `http://127.0.0.1:5173/register`
- Đăng nhập: `http://127.0.0.1:5173/login`
- Hồ sơ cá nhân: `http://127.0.0.1:5173/profile`
- Upload/analysis flow: `http://127.0.0.1:5173/upload`
- Kết quả demo: `http://127.0.0.1:5173/analysis/KQ001`
- Lịch sử: `http://127.0.0.1:5173/`
- Gói dịch vụ: `http://127.0.0.1:5173/plans`

Frontend đang gọi backend qua:

```ts
http://127.0.0.1:8000/api/v1
```

Cấu hình nằm trong `frontend/src/services/api.ts`.

## 6. Kiểm tra nhanh

Backend:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/v1/users/me
Invoke-RestMethod http://127.0.0.1:8000/api/v1/career-roles
Invoke-RestMethod http://127.0.0.1:8000/api/v1/analyses/KQ001
```

Frontend:

```powershell
cd D:\SmartCV-Advisor\frontend
npm run build
npm run lint
```

## 7. Lỗi thường gặp

`OPENAI_API_KEY` chưa có hoặc sai:

- PDF text/DOCX vẫn có thể fallback rule-based ở bước tách section.
- Ảnh CV và PDF scan sẽ không chạy được vì OCR đang dùng GPT image model.
- Kiểm tra lại `backend/.env`.
- Restart backend sau khi sửa `.env`.

MongoDB không kết nối được:

- Kiểm tra `MONGODB_URI`.
- Nếu dùng Atlas, kiểm tra network/IP allowlist.
- Nếu dùng Atlas URI dạng `mongodb+srv://...`, lỗi DNS cũng làm upload CV trả `503 DATABASE_UNAVAILABLE`.
- Mở `http://127.0.0.1:8000/api/health` và kiểm tra `database.available`.
- Chạy lại `python create_collections.py` sau khi kết nối thành công.

Upload ảnh/PDF scan không đọc được:

- Kiểm tra `OPENAI_API_KEY` trong `backend/.env` đã là key thật và restart backend.
- Kiểm tra `OPENAI_IMAGE_MODEL` đang là model có khả năng đọc ảnh, ví dụ `gpt-4o-mini`.
- Mở `http://127.0.0.1:8000/api/health` và kiểm tra `gpt.configured` cùng `ocr.configured`.
- Với PDF scan dài, chỉnh `GPT_OCR_MAX_PDF_PAGES` nếu cần gửi nhiều trang hơn.
- Dùng ảnh rõ nét, đủ sáng, không nghiêng nhiều.

Upload DOC cũ bị từ chối:

- `.doc` được validate signature nhưng hiện chưa đọc ổn định.
- Chuyển CV sang PDF, DOCX hoặc ảnh rõ nét.

Frontend không gọi được backend:

- Kiểm tra backend đang chạy ở port `8000`.
- Nếu frontend mở bằng `http://127.0.0.1:5173`, backend cũng phải cho phép origin này trong CORS.
- Sau khi sửa `.env` hoặc `backend/app/main.py`, restart backend để CORS mới có hiệu lực.
- Mở `http://127.0.0.1:8000/api/health`; nếu trang này mở được nhưng frontend vẫn báo không kết nối, gần như chắc là CORS hoặc frontend đang gọi sai URL.
- Mở Swagger `http://127.0.0.1:8000/docs` để test API trước.

## 8. Ghi chú bảo mật

- Không commit `backend/.env`.
- Không đưa OpenAI API key vào notebook, README, source code, screenshot hoặc log.
- Không log raw CV hoặc full prompt chứa nội dung CV.
- Nội dung CV chỉ nên gửi tối thiểu cần thiết cho GPT để phân tích.
