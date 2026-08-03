# SmartCV Advisor — Skill và quy tắc cho AI Coding Agent

> **Tài liệu:** `skill.md`  
> **Phiên bản:** 2.1  
> **Ngày cập nhật:** 2026-08-03  
> **Mục đích:** Quy định cách AI phải phân tích, thiết kế, code, kiểm thử và cập nhật SmartCV Advisor Product MVP.

---

## 1. Bối cảnh bắt buộc phải hiểu

SmartCV Advisor là web app SaaS dùng AI để hỗ trợ người dùng đánh giá và cải thiện CV theo Role IT mục tiêu.

MVP phải vận hành được toàn bộ chuỗi:

```text
Landing
→ Tài khoản
→ Upload + consent
→ Chọn Role
→ Phân tích
→ Điểm/lỗi/gợi ý
→ Roadmap cải thiện CV
→ Lịch sử/phân tích lại
→ Feedback
→ Đo lường funnel
```

AI agent phải hiểu:

- đây là công cụ hỗ trợ cải thiện CV, không phải hệ thống tuyển dụng;
- kết quả là tư vấn có căn cứ, không phải phán quyết tuyệt đối;
- AI không được bịa thông tin hoặc tự quyết định toàn bộ điểm số;
- Roadmap MVP dựa trên kết quả CV và Role, không dựa trên JD;
- Matching CV–JD, Keyword Gap theo JD, Skill Gap theo JD và AI Chat chưa thuộc MVP.

---

## 2. Thứ tự đọc trước mọi task

1. `plan.md`.
2. `skill.md`.
3. `task_X.md`
4. Code, test và migration/seed hiện tại.

Nếu không xác định được Use Case hoặc acceptance criteria, không bắt đầu code. Trước tiên phải ghi rõ phần còn thiếu hoặc giả định cần xác nhận.

---

## 3. Tech stack không được tự ý thay đổi

| Thành phần    | Quy định                                           |
| ------------- | -------------------------------------------------- |
| Frontend      | React + TypeScript + Vite + Tailwind CSS           |
| Backend       | Python 3.11+ + FastAPI                             |
| Database      | MongoDB                                            |
| Driver        | Motor/PyMongo qua Repository layer                 |
| Validation    | Pydantic v2                                        |
| PDF           | PyMuPDF                                            |
| DOCX          | `python-docx`                                      |
| OCR           | Tesseract fallback                                 |
| AI            | OpenAI qua provider adapter                        |
| Test frontend | Vitest + React Testing Library; Playwright cho E2E |
| Test backend  | Pytest + HTTPX/TestClient                          |

### Cấm

- tự đổi framework hoặc database;
- gọi AI API trực tiếp từ frontend;
- gọi MongoDB trực tiếp trong router;
- hard-code secret, giá gói, quota hoặc quyền ở nhiều nơi;
- thêm dependency khi chưa chứng minh cần thiết;
- dùng AI để thay thế scoring engine deterministic;
- triển khai tính năng ngoài phạm vi chỉ vì thấy nó trong tầm nhìn dài hạn của báo cáo.

---

## 4. Nguyên tắc không thương lượng

1. **Use Case first:** mọi thay đổi phải có UC ID hoặc decision ID.
2. **Evidence first:** đánh giá/gợi ý chỉ dựa trên nội dung thực sự có trong CV.
3. **Không bịa:** không thêm skill, thành tích, công ty, vai trò, số liệu hay thời gian.
4. **Explainable scoring:** điểm phải truy vết được đến tiêu chí, cấu hình và evidence.
5. **Backend authority:** RBAC, quota, entitlement và ownership được kiểm tra ở backend.
6. **Versioning:** thay đổi config không hồi tố kết quả cũ.
7. **Privacy by design:** không log raw CV; dữ liệu cá nhân chỉ dùng đúng mục đích đã consent.
8. **Fail safely:** lỗi analytics không được làm hỏng luồng phân tích; lỗi AI không làm mất dữ liệu upload.
9. **No fake feature:** tính năng Sắp ra mắt không có endpoint hoặc flow giả như đang hoạt động.
10. **Test before done:** không tuyên bố hoàn thành nếu chưa có test/verification phù hợp.
11. **Incremental only:** trước khi thêm/sửa phải kiểm tra code hiện tại; phần nào đã đáp ứng thì giữ nguyên, không tạo module/UI/event/collection trùng và không xóa/chỉnh nội dung ngoài task.

---

## 5. Quy trình bắt buộc cho mọi task

### Bước 1 — Scope check

- Xác định task thuộc Use Case nào.
- Xác định actor và quyền.
- Kiểm tra task có vượt `plan.md` hay không.
- Liệt kê phần ngoài phạm vi.

### Bước 2 — Đọc code hiện tại

- Tìm route, component, service, repository, schema và test liên quan.
- Không tạo module trùng khi chức năng tương tự đã tồn tại.
- Tôn trọng convention hiện có nếu không trái `plan.md`.

### Bước 3 — Viết contract trước

Xác định:

- request/response schema;
- status/error codes;
- dữ liệu đọc/ghi;
- auth/RBAC/ownership;
- analytics/audit events;
- acceptance criteria.

### Bước 4 — Thiết kế dữ liệu

- Quyết định embed hay reference.
- Xác định index.
- Xác định version/snapshot.
- Xác định xóa cứng, xóa mềm hoặc inactive.
- Xác định dữ liệu nhạy cảm và retention.

### Bước 5 — Backend trước khi nối UI

```text
Router → Service → Repository
                 → Integration/Scoring/Storage
```

- Implement validation và business rule.
- Implement error handling.
- Implement test service/API.

### Bước 6 — Frontend

- Dùng API client/service chung.
- Có loading, empty, success, error, disabled và forbidden state.
- Không dựa vào UI để bảo vệ quyền.
- Không hiển thị dữ liệu chưa được backend trả về.

### Bước 7 — Analytics, audit và privacy

- Ghi đúng event cần thiết.
- Không đưa dữ liệu CV nhạy cảm vào event/log.
- Ghi audit cho thao tác Admin hoặc destructive action.

### Bước 8 — Kiểm thử

- Main flow.
- Alternative flow.
- Exception/edge cases.
- Unauthorized/forbidden.
- Quyền Free/Premium/Admin.
- Regression ở module liên quan.

### Bước 9 — Review phạm vi

- Kiểm tra không vô tình thêm JD Matching, Skill Gap hoặc AI Chat.
- Kiểm tra không hard-code config.
- Kiểm tra không lộ secret/dữ liệu.

### Bước 10 — Cập nhật tài liệu

- Cập nhật tiến độ trong `plan.md` nếu hoàn thành mốc.
- Tóm tắt file/API/schema/test đã thay đổi.
- Ghi lại giả định và debt còn lại.

---

## 6. Skill 01 — Phân tích yêu cầu và truy vết Use Case

### Khi dùng

Mọi task thêm/sửa chức năng, UI, API, schema, phân quyền hoặc business rule.

### Đầu ra bắt buộc trước khi code

```text
Use Case:
Actor:
Trigger:
Preconditions:
Postconditions:
Main flow:
Alternative/error flows:
Business rules:
Data changes:
API changes:
UI states:
Security checks:
Analytics/audit:
Acceptance criteria:
Out of scope:
```

### Tiêu chuẩn

- Không dùng câu “làm như bình thường” hoặc “xử lý phù hợp”.
- Error flow phải có mã lỗi, HTTP status và UI state tương ứng.
- Mọi destructive action phải có confirm và audit.
- Mọi quyền Premium phải có kiểm tra backend.

---

## 7. Skill 02 — Product scope và UX flow

### Nguyên tắc UX

- Mỗi màn hình có một primary action rõ ràng.
- Luồng phân tích luôn thể hiện 4 bước: Tải CV → Chọn Role → Phân tích → Kết quả.
- Điểm số luôn đi cùng giải thích và hành động.
- Không chỉ dùng màu để thể hiện mức độ lỗi.
- Cảnh báo mâu thuẫn dùng ngôn ngữ trung lập.
- Nội dung Premium bị khóa phải rõ quyền lợi nhưng không dùng dark pattern.
- Mobile có vùng bấm tối thiểu 44×44 px và focus state rõ.
- Mọi màn hình quan trọng có loading, empty, error và retry.

### Kiểm thử khả năng hiểu

UI kết quả phải giúp người dùng trả lời:

- Điểm này có ý nghĩa gì?
- Vì sao bị trừ điểm?
- Lỗi nào cần sửa trước?
- Tôi cần làm gì tiếp theo?
- Sau khi sửa, làm sao phân tích lại?

### Landing Page

Phải có:

- giá trị cốt lõi rõ ràng;
- CTA “Phân tích CV miễn phí”;
- 3 bước sử dụng;
- khối an toàn dữ liệu;
- preview Free/Premium;
- giữ UTM/message variant trong session cho analytics.
- trước khi chỉnh Landing phải audit component, route, CTA và event hiện có; chỉ bổ sung tiêu chí còn thiếu, không thiết kế lại hoặc xóa phần đang đúng khi task không yêu cầu.

---

## 8. Skill 03 — React/TypeScript/Vite/Tailwind

### Quy tắc code

- Dùng TypeScript strict; tránh `any` nếu không có lý do.
- Component nhỏ, một trách nhiệm.
- Feature-based structure.
- API call đi qua `api client` và feature service.
- Tách server state, form state và local UI state.
- Không lặp literal quyền/quota/plan ở nhiều component.
- Form có client validation nhưng backend vẫn là nguồn quyết định.
- Dùng AbortController cho upload/request dài khi phù hợp.
- Clear dữ liệu nhạy cảm khi logout.
- Không đưa raw CV text vào localStorage.

### Cấu trúc feature mẫu

```text
features/analysis/
├─ api/
├─ components/
├─ hooks/
├─ pages/
├─ schemas/
├─ types/
└─ utils/
```

### Test tối thiểu

- form validation;
- loading/error/success;
- upload sai loại/dung lượng;
- quota exceeded;
- Premium locked/unlocked;
- lịch sử Free/Premium cùng xem toàn bộ và phân trang;
- reanalysis flow;
- copy suggestion;
- feedback submit;
- admin permission state.

---

## 9. Skill 04 — FastAPI backend

### Kiến trúc

```text
Router → Service → Repository → MongoDB
                 → AI Adapter
                 → Scoring Engine
                 → Storage/Extractor
```

### Quy tắc

- Router không chứa business logic dài.
- Pydantic request/response tách khỏi Mongo document.
- Dùng dependency injection cho current user, role và database.
- Validate ObjectId và trả `404` khi không tồn tại.
- Không nhận `user_id` từ client làm nguồn authorization.
- Endpoint Admin bắt buộc kiểm tra Admin ở backend.
- Error response có `code`, `message`, `details`, `correlation_id`.
- Không trả stack trace cho client.
- Idempotency cho callback/mock payment hoặc action có thể retry.
- Analytics failure không làm request nghiệp vụ chính thất bại.

### HTTP status gợi ý

| Trường hợp                 |                            Status |
| -------------------------- | --------------------------------: |
| Validation sai             |                               422 |
| Chưa đăng nhập             |                               401 |
| Không đủ quyền/entitlement |                               403 |
| Không tìm thấy             |                               404 |
| Trùng dữ liệu              |                               409 |
| Quota đã hết               | 429 hoặc 403 với error code riêng |
| File quá lớn               |                               413 |
| AI/provider lỗi tạm thời   |                               503 |

---

## 10. Skill 05 — MongoDB data modeling

### Quy tắc

- Embed dữ liệu nhỏ, ổn định và luôn đọc cùng nhau.
- Reference dữ liệu lớn, có vòng đời riêng hoặc cần version/audit.
- Không dùng một mảng lịch sử tăng vô hạn trong `users`.
- Dùng collection riêng cho analysis, feedback, events và audit.
- Tạo normalized field cho unique không phân biệt hoa thường.
- Role đã được sử dụng chỉ được inactive/soft-delete.
- Snapshot config tại thời điểm phân tích.
- Audit log append-only.
- Dùng transaction nếu deployment hỗ trợ và thao tác thật sự cần tính nguyên tử; nếu không, thiết kế trạng thái/idempotency rõ.

### Checklist schema

- [ ] owner/user reference;
- [ ] created/updated timestamps;
- [ ] status enum;
- [ ] version/snapshot;
- [ ] index theo truy vấn thực tế;
- [ ] retention/xóa dữ liệu;
- [ ] không lưu secret/raw token;
- [ ] không lưu file binary lớn trong document.

---

## 11. Skill 06 — Authentication, RBAC và entitlement

### Auth

- Password hash an toàn.
- Access token ngắn hạn.
- Refresh token lưu hash, có `jti`, thiết bị, expiry và revoked state.
- Logout thu hồi refresh token tương ứng.
- Khóa user làm mất hiệu lực phiên hiện tại theo thiết kế.

### RBAC

```text
Guest
Registered
Premium
Admin
```

Không dùng Premium như system role cố định nếu có thể suy ra từ subscription đang active; tách:

- `system_role`: user/admin;
- `subscription_tier`: free/premium;
- `subscription_status`: active/expired/cancelled/mock_pending.

### Entitlement và account cycle service

Mọi kiểm tra quyền gói/quota đi qua service chung:

```python
cycle = account_cycle_service.resolve_active_cycle(user_id)
entitlements = entitlement_service.resolve(user, cycle, plan)
```

Quy tắc bắt buộc:

- Free và Premium đều có `history_unlimited = true`.
- Free có 3 lượt cho một `account_plan_cycle`; quota không tự reset nếu vẫn ở cùng cycle Free.
- Tạo cycle Free mới khi đăng ký lần đầu hoặc khi Premium kết thúc; cycle mới được cấp lại 3 lượt.
- Premium 30 ngày dùng `relativedelta(months=1)`, Premium 90 ngày dùng `relativedelta(months=3)`; không dùng `timedelta(days=30/90)`.
- Hủy Premium chỉ đặt `cancel_at_period_end = true`; subscription/cycle vẫn active đến `current_period_end`.
- Hết kỳ mới đóng Premium và tạo cycle Free mới.
- Không viết điều kiện `if user.is_premium` hoặc logic quota/lifecycle rải rác ở router/component.

---

## 12. Skill 07 — Upload, consent và xử lý tài liệu

### Validation bắt buộc

1. extension;
2. MIME;
3. file signature/magic bytes;
4. kích thước;
5. số trang nếu có giới hạn;
6. khả năng mở/đọc;
7. trạng thái quota;
8. consent hợp lệ.

### Extraction

- PDF text layer: PyMuPDF.
- PDF scan: OCR fallback.
- DOCX: `python-docx`.
- `.doc`: chỉ hỗ trợ khi có converter an toàn; nếu chưa có, trả lỗi rõ ràng thay vì giả vờ đọc được.

### Output tối thiểu

```json
{
  "text": "...",
  "page_count": 2,
  "method": "pdf_text|ocr|docx",
  "language_hints": ["vi", "en"],
  "warnings": [],
  "quality_score": 0.93
}
```

### Privacy

- Temporary file được xóa sau xử lý/hủy.
- Không ghi raw text vào application log.
- Không đưa tên file gốc vào analytics nếu chứa họ tên.

---

## 13. Skill 08 — AI extraction và deterministic scoring

### Phân chia trách nhiệm

**AI thực hiện:**

- nhận diện section;
- trích xuất evidence;
- phát hiện lỗi ngữ nghĩa/mâu thuẫn;
- tạo strengths, weaknesses, suggestions;
- tạo câu mẫu chỉ từ thông tin thật.

**Backend thực hiện:**

- validate JSON AI;
- áp dụng trọng số;
- tính điểm cuối;
- clamp 0–100;
- version hóa config;
- lưu evidence và audit metadata.

### Scoring baseline

- Summary 10;
- Education 10;
- Experience 20;
- Projects 15;
- Technical Skills 35;
- Certifications 10.

### Skill importance

- 0: không chấm;
- 1: nice to have;
- 2: quan trọng;
- 3: bắt buộc/rất quan trọng.

### Evidence rule

- Skill chỉ được evidence level 3 khi có ngữ cảnh cụ thể trong Experience/Projects.
- Không suy diễn skill chỉ vì công nghệ liên quan xuất hiện.
- Thiếu bằng chứng phải thể hiện là uncertainty, không kết luận người dùng không biết skill.

### Output AI phải structured

- JSON schema rõ ràng;
- không Markdown tự do cho dữ liệu nghiệp vụ;
- có `evidence_quote` ngắn hoặc vị trí section;
- có confidence/warning khi không chắc chắn;
- retry/repair một lần khi JSON lỗi; sau đó fail có kiểm soát.

---

## 14. Skill 09 — Kết quả, gợi ý và roadmap

### Kết quả

Mỗi issue gồm:

```json
{
  "category": "content",
  "severity": "high|medium|positive",
  "title": "Thiếu kết quả định lượng",
  "description": "...",
  "why_it_matters": "...",
  "evidence": "...",
  "priority": 1
}
```

### Gợi ý Free

- checklist tổng quan;
- hành động rõ nhưng không cung cấp toàn bộ câu mẫu nâng cao;
- không cố tình làm gợi ý vô dụng để ép nâng cấp.

### Gợi ý Premium

- giải thích chi tiết;
- action verbs;
- câu mẫu STAR dựa trên thông tin thật;
- nút Copy;
- disclaimer không dùng số liệu nếu không đúng thực tế.

### Roadmap MVP

Roadmap dựa trên:

- Role mục tiêu;
- điểm section;
- lỗi và priority action;
- skill được phát hiện/chưa có evidence rõ;
- mục tiêu phân tích lại.

Roadmap không được:

- dùng JD không tồn tại;
- gọi là Skill Gap theo JD;
- tự gợi ý khóa học trả phí như một khẳng định khách quan;
- tạo kỹ năng giả hoặc hứa hẹn việc làm.

---

## 15. Skill 10 — Lịch sử và phân tích lại

### History

- Lấy owner từ token.
- Sắp xếp mới nhất trước.
- Free và Premium dùng cùng repository/service/query và đều xem **toàn bộ lịch sử**.
- API có pagination cho cả hai gói để tối ưu hiệu năng nhưng không cắt số lượng theo entitlement.
- Không tồn tại business rule `history_limit`; không ẩn lịch sử cũ khi đổi/hủy/hết hạn gói.
- Mở chi tiết bằng `analysis_id`.
- Xóa có confirm, ownership và audit/privacy event.

### Reanalysis

- Tạo analysis mới, không ghi đè kết quả cũ.
- Có `previous_analysis_id`.
- So sánh score chỉ khi dữ liệu đủ tương đồng; phải hiển thị cảnh báo nếu Role khác.
- Không khẳng định điểm tăng đồng nghĩa CV chắc chắn tốt hơn trong mọi bối cảnh.

---

## 16. Skill 11 — Gói dịch vụ và mock payment

### Plan configuration

Mỗi plan có:

- code/name;
- price mock;
- `duration_days`: Free = -1 (không giới hạn thời hạn), Premium 30 = 30, Premium 90 = 90; hai gói Premium được tính theo 1/3 tháng lịch;
- analysis quota theo cycle;
- `history_unlimited = true` cho tất cả gói;
- danh sách quyền lợi/roadmap/suggestion entitlement;
- active status;
- version/updated timestamp và người cập nhật.

### NEWUC-02 — Admin quản lý cấu hình gói

- Form/API tối thiểu: tên gói, giá, thời hạn theo tháng lịch, số lượt phân tích, quyền lợi, trạng thái hoạt động, ngày/người cập nhật.
- Validate giá/quota và code gói không trùng; riêng `duration_days = -1` chỉ hợp lệ cho Free và biểu thị không giới hạn thời hạn.
- `history_unlimited` không cho Admin tắt trong phạm vi MVP hiện tại.
- Config mới không hồi tố cycle đã bắt đầu; cycle lưu plan snapshot.
- Thay đổi config phải có audit log.

### Mock payment

- Hiển thị rõ “MÔ PHỎNG — Không phát sinh giao dịch thật”.
- Có success/fail/cancel.
- Callback/action idempotent.
- Chỉ success mới kích hoạt subscription.
- Không lưu thông tin thẻ/ngân hàng.
- Không auto-renew.
- Hủy gói sau khi kích hoạt không thu hồi quyền ngay; đặt `cancel_at_period_end`, giữ quyền đến cuối kỳ rồi chuyển về Free và tạo quota 3 lượt mới.

---

## 17. Skill 12 — Analytics và Marketing funnel

### Event design

Event phải:

- tên dạng `snake_case`;
- timestamp từ server khi có thể;
- có `anonymous_id`, `session_id`, `user_id` tùy trạng thái;
- có source/campaign/message variant;
- properties theo whitelist;
- không chứa raw CV/PII.

### Luồng event cốt lõi

```text
landing_viewed
→ analysis_cta_clicked
→ registration_completed
→ cv_upload_completed
→ analysis_completed
→ analysis_result_viewed
→ suggestion_viewed
→ reanalysis_completed / upgrade_completed
```

### Không làm hỏng nghiệp vụ

- Analytics endpoint bất khả dụng không được chặn user.
- Có retry/buffer hợp lý ở client nhưng không gửi trùng vô hạn.
- Backend chống spam và field injection.

### Dashboard Admin

- tổng hợp theo thời gian, channel, campaign, variant;
- funnel và drop-off;
- conversion/reanalysis;
- feedback rating;
- không hiển thị raw clickstream của một người nếu không cần thiết.

---

### NEWUC-03 — Dashboard Admin tối thiểu

Phải tổng hợp được:

- lượt truy cập Landing Page;
- số đăng ký;
- số người chọn CV;
- số upload thành công;
- số bắt đầu và hoàn thành phân tích;
- số xem gợi ý;
- số phân tích lại;
- tỷ lệ rời bỏ từng bước;
- nguồn truy cập, campaign, `message_variant`;
- Registered/Premium conversion;
- Role được chọn nhiều;
- điểm hài lòng trung bình từ `DANHGIASP`.

Dữ liệu phải lọc theo khoảng thời gian và dùng aggregation pipeline/index phù hợp; không tính funnel bằng cách tải toàn bộ event về frontend.

## 18. Skill 13 — NEWUC-01 và NEWUC-04: Feedback, đánh giá sản phẩm và hỗ trợ vận hành

### Quy tắc nhiều đánh giá trong mỗi vòng đời

- Collection MongoDB bắt buộc: `DANHGIASP`.
- Mỗi `(user_id, account_cycle_id)` được có nhiều bản ghi; không tạo unique index trên cặp trường này.
- Người dùng được gửi nhiều đánh giá trong cùng vòng đời Free, Premium 30 ngày hoặc Premium 90 ngày.
- Feedback phải gắn `analysis_id` để Admin biết ngữ cảnh kết quả liên quan.

### Micro-survey tối thiểu

- đánh giá tổng thể 1–5;
- kết quả có dễ hiểu không;
- gợi ý có đủ cụ thể không;
- kết quả có hữu ích không;
- có lỗi/gợi ý nào chưa chính xác và mô tả tùy chọn;
- có muốn phân tích lại không;
- mức sẵn sàng giới thiệu sản phẩm;
- bình luận tùy chọn.

### Schema bắt buộc `DANHGIASP`

- `user_id`, `account_cycle_id`, `plan_code`, `analysis_id`;
- `overall_rating`, `result_clarity_rating`, `suggestion_specificity_rating`, `usefulness_rating`, `recommendation_rating` trong 1–5;
- `has_incorrect_content`, `incorrect_content_detail`, `wants_reanalysis`, `comment`;
- `category`, `status`, `internal_note`, `reviewed_by`, `reviewed_at`;
- `created_at`, `updated_at`.

### NEWUC-04 — Admin workflow

```text
new → reviewing → resolved | ignored
```

Category hợp lệ:

```text
technical_error
result_hard_to_understand
suggestion_not_specific
incorrect_evaluation
privacy
other
```

Admin được:

- xem danh sách phản hồi;
- lọc theo loại/rating/status/date/plan cycle;
- xem analysis metadata liên quan;
- ghi chú nội bộ;
- cập nhật trạng thái và người xử lý.

Admin không mặc định được xem toàn bộ CV thô. Không tạo thêm collection phản hồi khác nếu `DANHGIASP` đã đáp ứng.

---

## 19. Skill 14 — Security, privacy và audit

### Checklist bảo mật

- [ ] secret trong environment;
- [ ] password/token không log;
- [ ] ownership check;
- [ ] RBAC backend;
- [ ] rate limit;
- [ ] file signature validation;
- [ ] temporary file cleanup;
- [ ] input sanitization;
- [ ] no stack trace;
- [ ] audit destructive/admin actions;
- [ ] consent versioning;
- [ ] data deletion workflow;
- [ ] CORS cấu hình cụ thể, không wildcard production;
- [ ] dependency vulnerability review.

### Audit log

Audit log tối thiểu gồm:

```json
{
  "actor_id": "...",
  "action": "user_locked",
  "target_type": "user",
  "target_id": "...",
  "reason": "...",
  "occurred_at": "...",
  "correlation_id": "...",
  "metadata": {}
}
```

Không cho client tự gửi `actor_id` đáng tin cậy; backend lấy từ token.

---

## 20. Skill 15 — Testing và quality gate

### Backend

- unit test service/scoring/entitlement;
- repository test với test database;
- API test auth/RBAC/validation;
- test AI adapter bằng mock;
- test file hỏng, timeout, malformed JSON;
- test idempotency mock payment;
- test analytics không ảnh hưởng main flow.

### Frontend

- component state;
- form validation;
- role/entitlement state;
- upload cancel/retry;
- result/error/empty;
- full history parity giữa Free/Premium;
- reanalysis;
- plan/payment mock;
- feedback;
- admin tables/filter/modal.

### E2E bắt buộc

1. Guest → đăng ký → xác thực → đăng nhập.
2. Free → upload → analyze → result → suggestion.
3. Free hết quota bị chặn.
4. Free và Premium → full history giống nhau; Premium → roadmap → reanalysis.
5. Upgrade mock success/fail/cancel; kiểm tra ngày hết hạn +1/+3 tháng lịch và cancel-at-period-end.
6. Free cycle mới được cấp 3 lượt; quota không reset trong cùng cycle; lịch sử không mất khi về Free.
7. NEWUC-01 chỉ cho một feedback trên mỗi `(user_id, account_cycle_id)` và cho phép lại ở cycle mới.
8. Admin quản lý Role/Skill/User.
9. Admin thực hiện NEWUC-02, NEWUC-03, NEWUC-04: cấu hình gói, xem funnel, xử lý feedback.
10. User A không xem/xóa analysis của User B.

### Quality gate

Không merge khi:

- test liên quan fail;
- lint/typecheck fail;
- endpoint thiếu auth/ownership;
- schema thay đổi không có migration/seed/update doc;
- có secret hoặc raw CV trong log/test fixture công khai;
- UI thiếu error/loading state cho luồng chính.

---

## 21. Skill 16 — Logging, observability và xử lý lỗi

### Logging

Log cấu trúc gồm:

- timestamp;
- level;
- service/module;
- correlation_id;
- event/error code;
- user_id đã pseudonymize nếu cần;
- duration/status.

Không log:

- raw CV;
- password/token;
- prompt đầy đủ chứa CV;
- storage signed URL;
- PII trích xuất.

### Error code mẫu

```text
AUTH_INVALID_CREDENTIALS
AUTH_ACCOUNT_LOCKED
AUTH_SESSION_EXPIRED
CV_UNSUPPORTED_TYPE
CV_FILE_TOO_LARGE
CV_FILE_UNREADABLE
CV_CONSENT_REQUIRED
ANALYSIS_QUOTA_EXCEEDED
FEEDBACK_ALREADY_SUBMITTED_FOR_CYCLE
ANALYSIS_PROVIDER_UNAVAILABLE
ANALYSIS_RESULT_NOT_FOUND
SUBSCRIPTION_REQUIRED
SUBSCRIPTION_EXPIRED
PAYMENT_MOCK_FAILED
FORBIDDEN_RESOURCE
```

---

## 22. Skill 17 — Git, tài liệu và bàn giao

### Commit message

Dùng Conventional Commits:

```text
feat(analysis): add role-weighted scoring pipeline
fix(auth): revoke refresh token on account lock
refactor(db): centralize MongoDB repositories
chore(seed): add default service plans
```

Một commit có thể vừa refactor vừa thêm dữ liệu khi hai thay đổi không thể tách an toàn; chọn loại phản ánh mục tiêu chính và mô tả phần còn lại trong commit body.

### Sau khi hoàn thành task

AI phải báo cáo:

```text
Use Case:
Đã thay đổi:
API/schema/UI:
Test đã chạy:
Kết quả:
Giả định:
Rủi ro/debt còn lại:
```

Không viết “đã hoàn thành” nếu chỉ tạo UI mock nhưng backend/use case yêu cầu hoạt động thật.

---

## 23. Mẫu kế hoạch thực hiện một tính năng

```markdown
## Task: <Tên tính năng>

### 1. Truy vết

- Use Case:
- Actor:
- Acceptance criteria:

### 2. Scope

- In scope:
- Out of scope:

### 3. Thiết kế

- UX flow:
- API contract:
- Data model/index:
- RBAC/ownership:
- Analytics/audit:

### 4. Triển khai

- Backend files:
- Frontend files:
- Seed/config:

### 5. Kiểm thử

- Unit:
- Integration:
- E2E/manual:

### 6. Hoàn tất

- Documentation:
- Remaining risks:
```

---

## 24. Definition of Done cho từng task

Một task chỉ hoàn thành khi:

- [ ] truy vết được Use Case;
- [ ] không vượt phạm vi;
- [ ] có API/data contract rõ;
- [ ] backend kiểm tra auth/RBAC/ownership;
- [ ] UI có đầy đủ trạng thái phù hợp;
- [ ] analytics/audit được xem xét;
- [ ] không log dữ liệu nhạy cảm;
- [ ] test liên quan đã chạy;
- [ ] lint/typecheck pass;
- [ ] tài liệu/progress được cập nhật;
- [ ] không tạo regression hoặc tính năng giả.
