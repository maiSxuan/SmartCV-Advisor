# SmartCV Advisor — Kế hoạch phát triển Product MVP

> **Tài liệu:** `plan.md`  
> **Phiên bản:** 2.1  
> **Ngày cập nhật:** 2026-08-03  
> **Trạng thái:** Nguồn kế hoạch chính cho AI coding agent và nhóm phát triển  
> **Phạm vi:** Product MVP có thể vận hành, kiểm thử với người dùng thật và đo lường hiệu quả Marketing

---

## 1. Mục tiêu của tài liệu

Tài liệu này giúp AI coding agent và thành viên nhóm:

1. hiểu đúng mục tiêu, phạm vi và giới hạn của SmartCV Advisor;
2. biết Use Case nào phải triển khai trong MVP;
3. biết thứ tự ưu tiên và quan hệ phụ thuộc giữa các module;
4. giữ kiến trúc, dữ liệu, API và phân quyền nhất quán;
5. không tự mở rộng sang Matching CV–JD, Skill Gap hoặc AI Chat khi chưa được phê duyệt;
6. tạo đủ dữ liệu phục vụ thử nghiệm người dùng, Closed Beta và phần Marketing trong báo cáo.

Mọi task code phải truy vết được về ít nhất một Use Case, một yêu cầu phi chức năng hoặc một quyết định kỹ thuật trong tài liệu này.

---

## 2. Tổng quan sản phẩm

**SmartCV Advisor** là nền tảng web SaaS ứng dụng AI, hỗ trợ sinh viên, người mới tốt nghiệp, Fresher/Junior và người đang tìm việc đánh giá chất lượng CV trước khi ứng tuyển.

### 2.1. Ba câu hỏi MVP phải trả lời

1. **CV của người dùng đang đạt bao nhiêu điểm?**
2. **CV đang có lỗi gì và vì sao lỗi đó quan trọng?**
3. **Người dùng nên sửa gì trước và có muốn phân tích lại sau khi chỉnh sửa hay không?**

### 2.2. Chuỗi giá trị chính

```text
Landing Page
→ Đăng ký/Đăng nhập
→ Tải CV và đồng ý xử lý dữ liệu
→ Chọn vị trí mục tiêu
→ Trích xuất, phân tích và chấm điểm
→ Xem điểm, lỗi và gợi ý
→ Xem roadmap cải thiện CV
→ Chỉnh sửa CV bên ngoài hệ thống
→ Phân tích lại
→ Gửi phản hồi
```

### 2.3. Sản phẩm không phải là gì

- Không phải hệ thống tuyển dụng hoặc công cụ quyết định đậu/rớt.
- Không được khẳng định người dùng chắc chắn vượt ATS hoặc được gọi phỏng vấn.
- Không được tự tạo thành tích, kỹ năng, kinh nghiệm hoặc số liệu không có trong CV.
- Không phải trình tạo/chỉnh sửa CV hoàn chỉnh trong MVP.
- Không phải nền tảng tìm việc hoặc tự động nộp hồ sơ.

---

## 3. Nguồn sự thật và xử lý mâu thuẫn

Khi tài liệu xung đột, áp dụng thứ tự ưu tiên sau:

1. `plan.md` — phạm vi triển khai, kiến trúc và quyết định kỹ thuật hiện hành.
2. `skill.md` — quy trình và tiêu chuẩn AI coding agent phải tuân thủ.
3. `task_X.md` - những thứ muốn làm và yêu cầu của dev
4. `main (2).pdf` — tầm nhìn sản phẩm, khách hàng, Marketing, mô hình gói và yêu cầu thử nghiệm.

5. Code hiện tại — dùng để hiểu trạng thái triển khai, không được tự động xem là đúng hơn đặc tả.

### Quy tắc xử lý

- Không âm thầm hợp nhất hai yêu cầu mâu thuẫn.
- Ghi rõ mâu thuẫn trong phần phân tích task.
- Dùng phạm vi trong tài liệu này làm quyết định cuối cùng cho MVP.
- Không đổi ID Use Case cũ; các ID không liên tục là chủ ý.

---

## 4. Quyết định phạm vi MVP

### 4.1. Chức năng phải hoạt động

- Landing Page và CTA bắt đầu phân tích.
- Đăng ký, đăng nhập, đăng xuất và xử lý phiên hết hạn.
- Hồ sơ cá nhân, dữ liệu CV và quyền yêu cầu xóa dữ liệu.
- Upload PDF/DOC/DOCX, kiểm tra tệp, consent và hủy upload.
- Chọn Role IT mục tiêu.
- Trích xuất nội dung, nhận diện section, chấm điểm 0–100 theo Role.
- Điểm tổng, điểm thành phần, lỗi, điểm mạnh, điểm yếu và hành động ưu tiên.
- Gợi ý cơ bản cho Free; gợi ý chi tiết/câu mẫu cho Premium.
- Roadmap cải thiện CV sau đánh giá cho Premium.
- Lịch sử phân tích: Free và Premium đều xem lại toàn bộ lịch sử, cùng logic, không giới hạn số bản ghi; chỉ dùng phân trang để tối ưu hiệu năng.
- Phân tích lại CV và liên kết kết quả trước–sau.
- Gói Free, Premium 30 ngày và Premium 90 ngày.
- Thanh toán VNPay mô phỏng; không phát sinh giao dịch thật.
- Quản lý Role IT, skill/trọng số, người dùng, gói dịch vụ, phản hồi và thống kê.
- Ghi nhận analytics funnel phục vụ phần Marketing của báo cáo.
- Audit log cho thao tác quản trị và sự kiện bảo mật quan trọng.

### 4.2. Quyết định về Roadmap trong MVP

`UC-021` được giữ lại nhưng phải hiểu là:

> **Roadmap cải thiện CV dựa trên Role mục tiêu, điểm section, lỗi và kỹ năng có/thiếu được phát hiện trong chính CV.**

Roadmap MVP **không phụ thuộc vào Job Description**, không được gọi là Skill Gap theo JD và không được hứa hẹn lộ trình nghề nghiệp toàn diện.

Roadmap có thể gồm:

- việc cần sửa ngay trong CV;
- kỹ năng nên chứng minh rõ hơn bằng Project/Experience;
- nội dung nên bổ sung nếu đúng với kinh nghiệm thực tế;
- checklist theo mức ưu tiên;
- CTA phân tích lại sau khi hoàn thành.

### 4.3. Ngoài phạm vi MVP

Các chức năng sau chỉ hiển thị nhãn **Sắp ra mắt** nếu xuất hiện trên UI:

- nhập/dán Job Description;
- Matching Score với JD cụ thể;
- Keyword Gap theo JD;
- Skill Gap chuyên sâu theo JD;
- AI Assistant dạng chat;
- trình soạn thảo CV trực tiếp;
- tải CV đã chỉnh sửa từ hệ thống;
- tự động nộp CV;
- quản lý tuyển dụng cho doanh nghiệp;
- B2B/B2B2C, bulk license hoặc API thương mại;
- thanh toán thật và tự động gia hạn;
- fine-tune mô hình riêng hoặc phân tích hàng loạt CV.

---

## 5. Actor và quyền truy cập

| Actor                  | Quyền chính                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Guest                  | Xem Landing Page, cách hoạt động, gói dịch vụ, đăng ký và đăng nhập                                                              |
| Registered User — Free | 3 lượt phân tích cho mỗi vòng đời Free; xem điểm/lỗi/gợi ý cơ bản; xem lại toàn bộ lịch sử phân tích không giới hạn              |
| Premium User           | Không giới hạn lượt phân tích trong thời hạn gói; xem lại toàn bộ lịch sử giống Free; roadmap; gợi ý chi tiết và câu mẫu Premium |
| Admin                  | Quản lý Role, skill/trọng số, người dùng, gói, phản hồi, analytics và audit cần thiết                                            |
| System                 | Xử lý job phân tích, kiểm tra hạn gói, quota, ghi analytics/audit và xóa dữ liệu theo policy                                     |

### Quy tắc entitlement và vòng đời tài khoản

- Backend là nguồn quyết định quyền; ẩn nút trên frontend không đủ.
- Free và Premium đều được xem lại **toàn bộ lịch sử phân tích**. Không tồn tại `history_limit` theo gói; API dùng pagination cho cả hai gói nhưng không cắt dữ liệu.
- Mỗi tài khoản luôn thuộc đúng một `account_plan_cycle` đang hoạt động: `free`, `premium_30` hoặc `premium_90`.
- Một vòng đời Free bắt đầu khi:
  1. tài khoản được tạo lần đầu ở gói Free; hoặc
  2. gói Premium kết thúc và hệ thống chuyển người dùng về Free.
- Khi bắt đầu một vòng đời Free mới, hệ thống cấp đúng **3 lượt phân tích**. Nếu người dùng vẫn ở cùng vòng đời Free thì quota không tự làm mới theo ngày/tháng.
- Free bị chặn upload/phân tích mới khi đã dùng hết 3 lượt của vòng đời Free hiện tại; việc xem lịch sử vẫn không bị chặn.
- Gói Premium 30 ngày được tính theo **1 tháng lịch**: ví dụ bắt đầu ngày 03/08 thì `current_period_end` là ngày 03/09 cùng giờ và múi giờ.
- Gói Premium 90 ngày được tính theo **3 tháng lịch**. Không dùng `timedelta(days=30/90)`; dùng phép cộng tháng lịch và nếu ngày tương ứng không tồn tại thì chốt vào ngày cuối cùng của tháng đích.
- Premium có quyền khi chu kỳ hiện tại còn hiệu lực: `status = active` và `current_period_start <= now < current_period_end`.
- Khi người dùng hủy gói Premium, hệ thống chỉ đặt `cancel_at_period_end = true`; quyền Premium vẫn giữ nguyên đến `current_period_end` và không chuyển về Free ngay.
- Tại `current_period_end`, nếu không gia hạn, hệ thống đóng chu kỳ Premium, tạo một vòng đời Free mới và cấp lại 3 lượt phân tích.
- Gói không tự động gia hạn và không tự động trừ tiền trong MVP.
- Chuyển gói hoặc hủy gói không xóa CV, analysis, roadmap, phản hồi hoặc lịch sử đã có.
- Các giới hạn/quyền lợi phải lấy từ cấu hình gói và cycle hiện tại, không hard-code rải rác trong UI.

---

## 6. Danh sách Use Case MVP chính thức

### 6.1. Public, tài khoản và quyền riêng tư

| ID     | Tên Use Case                                | Actor              | Ưu tiên | Kết quả bắt buộc                                                           |
| ------ | ------------------------------------------- | ------------------ | ------- | -------------------------------------------------------------------------- |
| UC-027 | Xem Landing Page và bắt đầu phân tích       | Guest              | High    | Hiểu giá trị sản phẩm, CTA dẫn đến đăng ký/đăng nhập, ghi nguồn truy cập   |
| UC-008 | Đăng ký tài khoản                           | Guest              | High    | Tạo Registered User, đồng ý điều khoản, xác thực email                     |
| UC-009 | Đăng nhập và khôi phục mật khẩu             | Guest/User/Admin   | High    | Xác thực, kiểm tra trạng thái, điều hướng theo role, hỗ trợ reset password |
| UC-010 | Đăng xuất và xử lý phiên                    | User/Admin/System  | High    | Thu hồi phiên/token phù hợp, xóa dữ liệu nhạy cảm phía client              |
| UC-011 | Quản lý hồ sơ, dữ liệu CV và quyền riêng tư | Registered/Premium | High    | Cập nhật hồ sơ, xem/xóa CV và kết quả thuộc sở hữu, ghi nhận yêu cầu xóa   |

### 6.2. Phân tích và cải thiện CV

| ID       | Tên Use Case                          | Actor                     | Ưu tiên | Kết quả bắt buộc                                                                                                 |
| -------- | ------------------------------------- | ------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| UC-012   | Tải CV và đồng ý xử lý dữ liệu        | Registered/Premium        | High    | File hợp lệ, consent được lưu, upload có thể hủy/thay                                                            |
| UC-013   | Chọn Role IT mục tiêu                 | Registered/Premium        | High    | Chọn một Role đang hoạt động và lưu cho lần phân tích                                                            |
| UC-014   | Trích xuất, phân tích và chấm điểm CV | Registered/Premium/System | High    | Job hoàn tất trong mục tiêu 30 giây, tạo kết quả 0–100 và lỗi có cấu trúc                                        |
| UC-015   | Xem kết quả đánh giá CV               | Registered/Premium        | High    | Hiểu điểm tổng, điểm thành phần, lỗi, bằng chứng và ưu tiên                                                      |
| UC-016   | Xem gợi ý cải thiện CV                | Registered/Premium        | High    | Free xem checklist cơ bản; Premium xem chi tiết/câu mẫu và Copy                                                  |
| UC-021   | Xem roadmap cải thiện CV              | Premium                   | High    | Roadmap dựa trên kết quả CV/Role, không dựa trên JD                                                              |
| UC-024   | Xem và quản lý lịch sử phân tích      | Registered/Premium        | Medium  | Free và Premium cùng xem lại toàn bộ lịch sử; mở lại/xóa kết quả; có pagination nhưng không giới hạn theo gói    |
| UC-028   | Phân tích lại CV sau khi chỉnh sửa    | Registered/Premium        | High    | Tạo analysis mới, liên kết analysis trước và hiển thị thay đổi cơ bản                                            |
| NEWUC-01 | Gửi phản hồi/đánh giá sản phẩm        | Registered/Premium        | High    | Mỗi vòng đời tài khoản chỉ gửi một lần; lưu đánh giá 1–5, câu trả lời tối thiểu, bình luận và analysis liên quan |

### 6.3. Gói dịch vụ

| ID     | Tên Use Case                                | Actor                    | Ưu tiên | Kết quả bắt buộc                                                         |
| ------ | ------------------------------------------- | ------------------------ | ------- | ------------------------------------------------------------------------ |
| UC-026 | Xem gói dịch vụ và trạng thái gói           | Guest/Registered/Premium | Medium  | Hiển thị Free, Premium 30/90 ngày, quyền lợi và tính năng sắp ra mắt     |
| UC-030 | Nâng cấp Premium bằng thanh toán mô phỏng   | Registered               | High    | Tạo giao dịch mock, xử lý success/fail/cancel, kích hoạt gói khi success |
| UC-031 | Gia hạn và quản lý vòng đời Job Search Pass | Premium/System           | High    | Xem hạn, gia hạn mock, tự hết hạn, không auto-renew                      |

### 6.4. Quản trị và vận hành

| ID       | Tên Use Case                              | Actor | Ưu tiên | Kết quả bắt buộc                                                                                                 |
| -------- | ----------------------------------------- | ----- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| UC-001   | Quản lý danh sách Role IT                 | Admin | High    | Thêm, sửa, tìm kiếm, lọc, ngưng hoạt động; không xóa cứng Role đã được dùng                                      |
| UC-002   | Quản lý skill, điểm và trọng số theo Role | Admin | High    | Cấu hình version hóa, validation tổng trọng số, chỉnh sửa hàng loạt                                              |
| UC-004   | Quản lý người dùng                        | Admin | High    | Tìm/lọc/xem chi tiết, khóa/mở khóa, không khóa Admin khác                                                        |
| NEWUC-02 | Quản lý cấu hình gói                      | Admin | Medium  | Quản lý tên gói, giá, thời hạn, số lượt phân tích, quyền lợi, trạng thái hoạt động và ngày cập nhật              |
| NEWUC-03 | Xem thống kê sử dụng và funnel            | Admin | High    | Hiển thị các chỉ số kiểm chứng MVP, nguồn/campaign/variant, conversion, drop-off, role phổ biến và điểm hài lòng |
| NEWUC-04 | Quản lý phản hồi và báo lỗi               | Admin | High    | Xem/lọc phản hồi, rating và analysis liên quan; phân loại; cập nhật trạng thái; ghi chú nội bộ                   |

### 6.5. Đặc tả bổ sung cho các NEWUC

#### NEWUC-01 — Gửi phản hồi/đánh giá sản phẩm

- **Trigger:** sau khi người dùng đã xem kết quả phân tích hoặc gợi ý.
- **Giới hạn:** mỗi `account_plan_cycle` chỉ được tạo **một** đánh giá. Người dùng có thể đánh giá một lần ở vòng đời Free, một lần ở chu kỳ Premium 30 ngày, một lần ở chu kỳ Premium 90 ngày hoặc ở các chu kỳ mới về sau.
- **Không giới hạn theo tài khoản vĩnh viễn:** khi người dùng bước sang một cycle mới thì được quyền đánh giá lại cho cycle đó.
- **Nội dung tối thiểu phải lưu:**
  - điểm đánh giá tổng thể 1–5;
  - kết quả có dễ hiểu không;
  - gợi ý có đủ cụ thể không;
  - kết quả có hữu ích không;
  - có lỗi/gợi ý nào chưa chính xác hay không và mô tả tùy chọn;
  - người dùng có muốn phân tích lại không;
  - mức sẵn sàng giới thiệu sản phẩm;
  - bình luận tùy chọn;
  - `analysis_id` liên quan;
  - snapshot gói/cycle tại thời điểm gửi.
- Backend phải enforce unique `(user_id, account_cycle_id)` và trả lỗi có cấu trúc nếu đã đánh giá trong cycle hiện tại.

#### NEWUC-02 — Quản lý cấu hình gói

Admin quản lý tối thiểu:

- tên/mã gói;
- giá;
- thời hạn theo tháng lịch;
- số lượt phân tích cho cycle;
- danh sách quyền lợi;
- trạng thái hoạt động;
- ngày cập nhật và người cập nhật.

Quy tắc:

- `history_unlimited` luôn là `true` cho Free, Premium 30 và Premium 90;
- thay đổi cấu hình không được hồi tố chu kỳ đã bắt đầu nếu chưa có yêu cầu rõ ràng;
- mọi thay đổi phải có audit log;
- không xóa cứng gói đã được sử dụng.

#### NEWUC-03 — Xem thống kê sử dụng và funnel

Dashboard phải hiển thị tối thiểu:

1. lượt truy cập Landing Page;
2. số đăng ký;
3. số người chọn CV;
4. số upload thành công;
5. số bắt đầu phân tích;
6. số hoàn thành phân tích;
7. số xem gợi ý;
8. số phân tích lại;
9. tỷ lệ rời bỏ từng bước;
10. nguồn truy cập;
11. campaign và `message_variant`;
12. Registered/Premium conversion;
13. Role được chọn nhiều;
14. điểm hài lòng trung bình từ `DANHGIASP`.

Các số liệu phải lọc được theo khoảng thời gian; dữ liệu tổng hợp không được chứa raw CV hoặc PII lấy từ CV.

#### NEWUC-04 — Quản lý phản hồi và báo lỗi

Admin phải có thể:

- xem danh sách phản hồi;
- lọc theo loại phản hồi, rating, trạng thái, gói/cycle và thời gian;
- xem `analysis_id` và metadata phân tích liên quan nhưng không mặc định xem raw CV;
- phân loại thành: `technical_error`, `result_hard_to_understand`, `suggestion_not_specific`, `incorrect_evaluation`, `privacy`, `other`;
- chuyển trạng thái: `new`, `reviewing`, `resolved`, `ignored` tương ứng Mới, Đang xem xét, Đã xử lý, Không xử lý;
- ghi chú nội bộ, người xử lý và thời điểm xử lý.

Nếu dữ liệu hiện tại chưa đáp ứng, phải bổ sung field/index vào `DANHGIASP`; không tạo collection phản hồi trùng chức năng.

### 6.6. Chức năng xuyên suốt — không cần màn hình riêng cho người dùng

| Mã     | Chức năng `include`          | Áp dụng                                                                  |
| ------ | ---------------------------- | ------------------------------------------------------------------------ |
| INC-01 | Ghi analytics event          | Landing, đăng ký, upload, phân tích, kết quả, gợi ý, reanalysis, upgrade |
| INC-02 | Kiểm tra RBAC và entitlement | Mọi endpoint protected và nội dung Premium                               |
| INC-03 | Ghi consent/version policy   | Đăng ký và upload CV                                                     |
| INC-04 | Ghi audit log                | Thao tác Admin, khóa tài khoản, xóa dữ liệu, thay đổi config             |
| INC-05 | Kiểm tra ownership           | CV, analysis, feedback và lịch sử cá nhân                                |
| INC-06 | Xử lý lỗi chuẩn hóa          | Tất cả API và job xử lý                                                  |

---

## 7. Quy tắc bổ sung Landing Page

Landing Page là một phần của Use Case bắt đầu sử dụng sản phẩm, không chỉ là màn hình giới thiệu. Landing phải:

- giải thích SmartCV Advisor giải quyết vấn đề gì;
- hiển thị CTA **“Phân tích CV miễn phí”**;
- chuyển Guest đến đăng ký/đăng nhập;
- ghi nhận nguồn truy cập, UTM, campaign và `message_variant`;
- hiển thị thông tin an toàn dữ liệu/quyền riêng tư.

**Quy tắc triển khai gia tăng:** trước khi sửa Landing, AI phải kiểm tra UI, route, event và nội dung hiện có. Thành phần nào đã đúng thì giữ nguyên; chỉ bổ sung phần còn thiếu, không tạo trang/CTA/event trùng và không xóa hoặc chỉnh lại nội dung không liên quan.

## 8. Luồng nghiệp vụ bắt buộc

### 8.1. Luồng Guest đến kết quả đầu tiên

```text
Landing
→ CTA “Phân tích CV miễn phí”
→ Đăng ký + đồng ý điều khoản
→ Xác thực email
→ Đăng nhập
→ Upload + consent
→ Chọn Role
→ Xác nhận dùng lượt
→ Phân tích
→ Kết quả
→ Gợi ý
→ Feedback
```

### 8.2. Luồng cải thiện và phân tích lại

```text
Kết quả cũ
→ Xem gợi ý/roadmap
→ Chỉnh CV bên ngoài hệ thống
→ Phân tích lại
→ Upload phiên bản mới
→ Giữ Role cũ hoặc chọn Role khác
→ Kết quả mới
→ Hiển thị score delta và thay đổi chính
```

### 8.3. Luồng nâng cấp

```text
Click nội dung Premium bị khóa
→ Modal quyền lợi
→ Trang gói
→ Chọn 30 hoặc 90 ngày
→ VNPay mô phỏng
→ Success: tạo subscription active
→ Fail/Cancel: không thay đổi quyền
```

### 8.4. Luồng thử nghiệm Marketing

```text
URL có UTM/message_variant
→ Landing view
→ CTA click
→ Register
→ Upload
→ Analysis completed
→ Result viewed
→ Suggestion viewed
→ Feedback/Reanalysis/Upgrade
```

---

## 9. Tech stack và kiến trúc bắt buộc

### 9.1. Tech stack

| Lớp                   | Công nghệ                                                     |
| --------------------- | ------------------------------------------------------------- |
| Frontend              | React + TypeScript + Vite + Tailwind CSS                      |
| Backend               | Python 3.11+ + FastAPI                                        |
| Database              | MongoDB                                                       |
| Driver                | Motor/PyMongo thông qua Repository layer                      |
| Validation            | Pydantic v2                                                   |
| PDF                   | PyMuPDF                                                       |
| DOCX                  | `python-docx`                                                 |
| OCR fallback          | Tesseract, chỉ khi text layer không đủ                        |
| AI                    | OpenAI qua `AIProvider` adapter; key từ environment           |
| Auth                  | JWT access token + refresh token có thu hồi                   |
| Frontend tests        | Vitest + React Testing Library; Playwright cho E2E quan trọng |
| Backend tests         | Pytest + HTTPX/TestClient                                     |
| Deployment định hướng | Vercel + Render + MongoDB Atlas                               |

### 9.2. Kiến trúc backend

```text
Router
  → Service
    → Repository → MongoDB
    → Storage Adapter
    → Document Extractor
    → AI Provider Adapter
    → Deterministic Scoring Engine
    → Analytics/Audit Service
```

Quy tắc:

- Router chỉ xử lý HTTP concern.
- Service chứa business rule và transaction-like orchestration.
- Repository chứa truy vấn MongoDB.
- Không gọi MongoDB trực tiếp từ router.
- Không gọi OpenAI trực tiếp từ router hoặc frontend.
- Frontend không chứa công thức chấm điểm nghiệp vụ.
- Tệp CV không lưu binary trực tiếp trong document MongoDB; dùng storage abstraction và chỉ lưu metadata/path/key.

### 9.3. Cấu trúc thư mục gợi ý

```text
smartcv-advisor/
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ features/
│  │  │  ├─ auth/
│  │  │  ├─ profile/
│  │  │  ├─ analysis/
│  │  │  ├─ history/
│  │  │  ├─ roadmap/
│  │  │  ├─ plans/
│  │  │  ├─ feedback/
│  │  │  ├─ analytics/
│  │  │  └─ admin/
│  │  ├─ lib/
│  │  ├─ routes/
│  │  └─ types/
│  └─ tests/
├─ backend/
│  ├─ app/
│  │  ├─ api/v1/
│  │  ├─ core/
│  │  ├─ db/
│  │  ├─ models/
│  │  ├─ schemas/
│  │  ├─ repositories/
│  │  ├─ services/
│  │  ├─ integrations/
│  │  ├─ scoring/
│  │  ├─ extraction/
│  │  └─ utils/
│  └─ tests/
├─ docs/
├─ plan.md
└─ skill.md
```

---

## 10. Pipeline phân tích CV

### 10.1. Các bước

1. Resolve `account_plan_cycle` hiện tại và kiểm tra quota/entitlement của cycle đó.
2. Xác thực extension, MIME, signature, dung lượng và khả năng đọc.
3. Ghi consent với `policy_version`, thời điểm và user.
4. Lưu metadata CV và tạo `analysis_job`.
5. Trích xuất text bằng PyMuPDF hoặc `python-docx`.
6. OCR fallback nếu text quá ít hoặc file là scan.
7. Chuẩn hóa text nhưng không làm mất URL, công nghệ, mốc thời gian và số liệu.
8. Nhận diện section.
9. Trích xuất evidence và lỗi/mâu thuẫn.
10. Lấy snapshot Role/Skill config đang hoạt động.
11. Backend tính điểm deterministic.
12. AI tạo strengths, weaknesses, suggestions và priority actions dựa trên evidence.
13. Lưu kết quả, tăng `analysis_used` của cycle hiện tại và cập nhật trạng thái job.
14. Ghi analytics và hiển thị kết quả.

### 10.2. Section và trọng số baseline

| Section              | Điểm tối đa |
| -------------------- | ----------: |
| Professional Summary |          10 |
| Education            |          10 |
| Experience           |          20 |
| Projects             |          15 |
| Technical Skills     |          35 |
| Certifications       |          10 |
| **Tổng**             |     **100** |

### 10.3. Skill score

| Giá trị | Ý nghĩa                     |
| ------: | --------------------------- |
|       0 | Không dùng để chấm Role này |
|       1 | Nice to have                |
|       2 | Quan trọng                  |
|       3 | Rất quan trọng/bắt buộc     |

### 10.4. Evidence level

| Mức | Ý nghĩa                                         |
| --: | ----------------------------------------------- |
|   0 | Không thấy trong CV                             |
|   1 | Nhắc mơ hồ/không rõ ngữ cảnh                    |
|   2 | Liệt kê rõ trong Skills/Education/Certification |
|   3 | Có bằng chứng cụ thể trong Experience/Projects  |

AI không được gán evidence level 3 khi skill chỉ xuất hiện trong danh sách kỹ năng.

### 10.5. Kết quả phải lưu

- `analysis_id`, `user_id`, `cv_file_id`, `target_role_id`;
- `status`, `started_at`, `completed_at`, `processing_ms`;
- tổng điểm, điểm section và xếp loại;
- strengths, weaknesses, issues, suggestions;
- evidence theo skill/section;
- cảnh báo mâu thuẫn;
- `scoring_config_version`, `prompt_version`, `model_name`;
- entitlement snapshot;
- `previous_analysis_id` khi là phân tích lại.

---

## 11. Mô hình dữ liệu MongoDB dự kiến

| Collection             | Mục đích                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `users`                | tài khoản, system role, trạng thái và profile                                               |
| `refresh_tokens`       | refresh token đã hash và trạng thái thu hồi                                                 |
| `career_roles`         | Role IT và trạng thái hoạt động                                                             |
| `skills`               | danh mục skill dùng chung                                                                   |
| `role_skill_configs`   | cấu hình skill/trọng số/version theo Role                                                   |
| `cv_files`             | metadata tệp, storage key, owner và consent reference                                       |
| `consents`             | loại consent, policy version, thời điểm và trạng thái                                       |
| `analysis_jobs`        | trạng thái tiến trình, lỗi, retry và timing                                                 |
| `analysis_results`     | điểm, issue, suggestion, evidence và version snapshot                                       |
| `improvement_roadmaps` | roadmap cơ bản theo analysis/Role                                                           |
| `service_plans`        | Free, Premium 30/90 ngày, giá, duration, quota, quyền lợi và trạng thái                     |
| `subscriptions`        | thông tin đăng ký Premium, `current_period_start/end`, `cancel_at_period_end` và trạng thái |
| `account_plan_cycles`  | vòng đời Free/Premium, quota đã dùng, thời gian bắt đầu/kết thúc và snapshot plan           |
| `mock_transactions`    | giao dịch VNPay mô phỏng                                                                    |
| `DANHGIASP`            | đánh giá sản phẩm theo analysis và account cycle; mỗi user/cycle chỉ một bản ghi            |
| `analytics_events`     | event funnel và nguồn Marketing                                                             |
| `audit_logs`           | thao tác Admin và sự kiện bảo mật append-only                                               |

### 11.1. Schema vòng đời tài khoản

`account_plan_cycles` tối thiểu gồm:

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "plan_code": "free|premium_30|premium_90",
  "plan_snapshot": {},
  "started_at": "datetime",
  "current_period_end": "datetime|null",
  "ended_at": "datetime|null",
  "status": "active|ended",
  "analysis_quota": 3,
  "analysis_used": 0,
  "created_from": "registration|upgrade|premium_expired|premium_cancelled_at_period_end"
}
```

- Free: `current_period_end = null`, quota mặc định 3, không reset cho đến khi cycle Free kết thúc.
- Premium: quota theo cấu hình, `current_period_end` tính theo 1 hoặc 3 tháng lịch.

### 11.2. Collection `DANHGIASP`

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId",
  "account_cycle_id": "ObjectId",
  "plan_code": "free|premium_30|premium_90",
  "analysis_id": "ObjectId",
  "overall_rating": 1,
  "result_clarity_rating": 1,
  "suggestion_specificity_rating": 1,
  "usefulness_rating": 1,
  "has_incorrect_content": false,
  "incorrect_content_detail": null,
  "wants_reanalysis": true,
  "recommendation_rating": 1,
  "comment": null,
  "category": "other",
  "status": "new|reviewing|resolved|ignored",
  "internal_note": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

Rating phải nằm trong 1–5. `account_cycle_id` bắt buộc để enforce đúng một đánh giá cho mỗi vòng đời tài khoản.

### Index tối thiểu

```text
users.email_normalized unique
career_roles.name_normalized unique
role_skill_configs(role_id, version) unique
cv_files(user_id, created_at desc)
analysis_jobs(user_id, status, created_at desc)
analysis_results(user_id, created_at desc)
analysis_results(previous_analysis_id)
subscriptions(user_id, status, current_period_end)
account_plan_cycles(user_id, started_at desc)
account_plan_cycles(user_id, status) partial unique với `status = active`
DANHGIASP(user_id, account_cycle_id) unique
DANHGIASP(analysis_id, created_at desc)
DANHGIASP(category, status, created_at desc)
analytics_events(event_name, occurred_at desc)
analytics_events(session_id, occurred_at asc)
analytics_events(source.utm_campaign, source.message_variant, occurred_at desc)
audit_logs(actor_id, created_at desc)
```

---

## 12. API module dự kiến

```text
/api/v1/auth
/api/v1/profile
/api/v1/privacy
/api/v1/roles
/api/v1/cv-files
/api/v1/analyses
/api/v1/history
/api/v1/roadmaps
/api/v1/plans
/api/v1/subscriptions
/api/v1/mock-payments
/api/v1/feedback
/api/v1/analytics/events
/api/v1/admin/roles
/api/v1/admin/skills
/api/v1/admin/users
/api/v1/admin/plans
/api/v1/admin/feedback
/api/v1/admin/analytics
```

### Response chuẩn

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

### Error chuẩn

```json
{
  "data": null,
  "error": {
    "code": "CV_FILE_TOO_LARGE",
    "message": "Dung lượng tệp vượt quá giới hạn cho phép.",
    "details": {},
    "correlation_id": "..."
  }
}
```

---

## 13. Analytics phục vụ Marketing và kiểm thử người dùng

### 13.1. Event tối thiểu

```text
landing_viewed
analysis_cta_clicked
registration_started
registration_completed
upload_page_viewed
cv_file_selected
cv_consent_accepted
cv_upload_completed
cv_upload_failed
career_role_selected
analysis_started
analysis_completed
analysis_failed
analysis_result_viewed
issue_detail_viewed
suggestion_viewed
roadmap_viewed
reanalyze_clicked
reanalysis_completed
premium_locked_clicked
plan_viewed
upgrade_started
upgrade_completed
feedback_submitted
```

### 13.2. Thuộc tính nguồn Marketing

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`;
- `message_variant`;
- `anonymous_id`, `session_id`, `user_id` nếu đã đăng nhập;
- route, device type, app version;
- metadata không nhạy cảm của event.

### 13.3. Chỉ số Admin phải xem được

- lượt truy cập Landing Page;
- số đăng ký;
- số người chọn CV;
- số upload thành công;
- số bắt đầu phân tích;
- số hoàn thành phân tích;
- số xem gợi ý;
- số phân tích lại;
- tỷ lệ rời bỏ từng bước trong funnel;
- nguồn truy cập;
- campaign và `message_variant`;
- Registered/Premium conversion;
- Role được chọn nhiều nhất;
- điểm hài lòng trung bình từ `DANHGIASP`;
- các chỉ số lỗi/consent bổ trợ khi cần chẩn đoán funnel.

### 13.4. Dữ liệu không được log

- raw CV hoặc text đã trích xuất;
- họ tên, email, số điện thoại lấy từ CV;
- tên file gốc nếu chứa thông tin cá nhân;
- access/refresh token;
- prompt chứa toàn bộ CV;
- URL storage có quyền truy cập;
- toàn bộ phản hồi AI trong analytics event.

---

## 14. Bảo mật và quyền riêng tư

- Mọi CV và analysis đều có owner.
- Backend phải kiểm tra ownership ở mọi endpoint đọc/sửa/xóa.
- Mật khẩu hash bằng thuật toán phù hợp; không lưu plaintext.
- Refresh token lưu bản hash và có thể thu hồi.
- Secret nằm trong `.env`; `.env` không commit.
- Không log raw CV hoặc thông tin nhạy cảm.
- Consent phải lưu `policy_version` và thời điểm.
- Xóa dữ liệu phải bao gồm file, metadata, analysis và roadmap liên quan theo policy.
- Admin không mặc định được xem nội dung CV; chỉ xem metadata cần thiết cho vận hành.
- Audit log append-only trong phạm vi ứng dụng.
- Rate limit cho auth, upload, analytics event và AI endpoint.
- Kiểm tra MIME/signature, không chỉ extension.
- Temporary file phải được xóa sau xử lý hoặc khi hủy.

---

## 15. Kế hoạch triển khai theo milestone

### M0 — Khóa phạm vi và hợp đồng dữ liệu

- Chốt Use Case trong tài liệu này.
- Tạo `plan.md`, `skill.md`, API conventions và error codes.
- Chốt schema MongoDB và seed Role/Skill/Plan.
- Chốt mock data và acceptance criteria.

**Hoàn thành khi:** AI agent có thể xác định rõ in-scope/out-of-scope và chạy project skeleton.

### M1 — Nền tảng dự án và xác thực

- Setup frontend/backend, config, CORS, logging, MongoDB.
- UC-027, UC-008, UC-009, UC-010.
- RBAC, refresh token, route guard và error handler.

### M2 — Admin master data

- UC-001, UC-002, UC-004.
- Seed Role/Skill baseline.
- Version hóa scoring config và audit log.

### M3 — Upload, consent và trích xuất

- UC-011, UC-012, UC-013.
- Storage adapter, validation, PDF/DOCX/OCR fallback.
- Progress/error/cancel states.

### M4 — Scoring engine và kết quả

- UC-014, UC-015.
- Evidence extraction, deterministic scoring, prompt adapter.
- Lưu version và hiển thị điểm/lỗi/bằng chứng.

### M5 — Gợi ý, roadmap, lịch sử và phân tích lại

- UC-016, UC-021, UC-024, UC-028.
- Lịch sử Free/Premium cùng truy vấn và cùng quyền xem toàn bộ; chỉ khác các quyền Premium khác.
- Entitlement Free/Premium.
- Score delta cơ bản và liên kết previous analysis.

### M6 — Gói dịch vụ và thanh toán mô phỏng

- UC-026, UC-030, UC-031, NEWUC-02.
- `account_plan_cycles`, quy tắc tháng lịch, cancel-at-period-end và reset 3 lượt khi về Free.
- Plan config, quota, expiry job/check và mock transaction.

### M7 — Feedback và Marketing analytics

- NEWUC-01, NEWUC-03, NEWUC-04.
- Collection `DANHGIASP` và unique feedback theo account cycle.
- Event tracking, UTM/message variant, funnel dashboard.
- Micro-survey sau kết quả/gợi ý.

### M8 — Hardening, test và Closed Beta

- Security review, accessibility, responsive, performance.
- E2E các luồng chính.
- Seed/demo data, deployment và backup.
- User testing, thu thập feedback và tạo backlog cải tiến.

---

## 16. Acceptance criteria cấp sản phẩm

MVP chỉ được xem là hoàn thành khi:

- [ ] Guest đi từ Landing đến đăng ký/đăng nhập được.
- [ ] User upload CV hợp lệ chỉ sau khi consent.
- [ ] Free có đúng 3 lượt cho mỗi vòng đời Free và không tự reset khi vẫn ở cùng cycle; Premium dùng theo chu kỳ còn hiệu lực.
- [ ] Pipeline đọc được PDF/DOCX phổ biến và có lỗi rõ ràng cho file không hỗ trợ.
- [ ] Kết quả có tổng điểm 0–100, điểm thành phần, lỗi, bằng chứng và hành động ưu tiên.
- [ ] Điểm số truy vết được đến Role/config version/evidence.
- [ ] Free/Premium nhìn thấy nội dung đúng quyền ở cả frontend và backend.
- [ ] Premium có roadmap cải thiện CV không phụ thuộc JD.
- [ ] Free và Premium đều xem lại toàn bộ lịch sử phân tích với cùng logic và pagination; không giới hạn theo gói.
- [ ] Phân tích lại tạo analysis mới và liên kết analysis trước.
- [ ] NEWUC-01 lưu vào `DANHGIASP`, gắn với analysis và chỉ cho một đánh giá trên mỗi account cycle.
- [ ] Thanh toán mô phỏng không làm phát sinh giao dịch thật.
- [ ] Premium 30/90 ngày dùng mốc +1/+3 tháng lịch; hủy gói chỉ có hiệu lực cuối kỳ; khi về Free tạo cycle mới và cấp lại 3 lượt.
- [ ] Chuyển/hủy/hết hạn gói không làm mất lịch sử phân tích.
- [ ] Admin hoàn thành NEWUC-02, NEWUC-03 và NEWUC-04: cấu hình gói, funnel/analytics, phản hồi/báo lỗi.
- [ ] Funnel Marketing đo được từ Landing đến result/suggestion/reanalysis, có source, campaign và message variant.
- [ ] Không log raw CV hoặc dữ liệu nhạy cảm.
- [ ] Có test cho success, error, unauthorized, forbidden và edge cases.
- [ ] Các tính năng ngoài phạm vi chỉ có nhãn Sắp ra mắt, không có flow giả.

---

## 17. Quy tắc cập nhật tiến độ

Sau mỗi task hoặc milestone, AI agent phải cập nhật một mục tiến độ theo mẫu:

```markdown
### YYYY-MM-DD — <Tên task/milestone>

- Use Case: UC-xxx
- Đã hoàn thành:
- File/API/schema đã thay đổi:
- Test đã chạy:
- Giả định/quyết định:
- Còn lại/rủi ro:
```

Không đánh dấu hoàn thành khi chưa có test hoặc chưa kiểm tra acceptance criteria liên quan.
