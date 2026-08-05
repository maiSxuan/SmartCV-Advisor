# Danh sách use case hiện có trong SmartCV Advisor

Dưới đây là toàn bộ các use case chính đang có trong project theo cấu trúc backend, frontend và phạm vi MVP hiện tại.

## Nhóm quản trị Admin

- UC-001: Quản lý danh sách Role IT
  - Thêm, sửa, kích hoạt/khóa role IT
  - Xem danh sách role và tìm kiếm/lọc

- UC-002: Quản lý điểm số và trọng số skill theo Role IT
  - Thêm/sửa skill cho từng role
  - Cập nhật required score, weight, importance, trạng thái skill
  - Chỉnh sửa hàng loạt cấu hình skill

- UC-004: Quản lý người dùng
  - Xem danh sách người dùng
  - Tìm kiếm, lọc, phân trang người dùng
  - Xem chi tiết người dùng
  - Chỉnh sửa thông tin người dùng
  - Khóa/mở khóa tài khoản

## Nhóm tài khoản người dùng

- UC-008: Đăng ký tài khoản
  - Tạo tài khoản mới với thông tin cá nhân và điều khoản

- UC-009: Đăng nhập và phục hồi truy cập
  - Đăng nhập vào hệ thống
  - Làm mới phiên đăng nhập
  - Quên mật khẩu
  - Tạo mật khẩu mới

- UC-010: Đăng xuất
  - Kết thúc phiên làm việc hiện tại

- UC-011: Quản lý thông tin cá nhân và quyền riêng tư
  - Xem hồ sơ cá nhân
  - Cập nhật thông tin cá nhân
  - Gửi yêu cầu xóa dữ liệu

## Nhóm phân tích CV

- UC-012: Tải CV lên hệ thống
  - Upload file CV (PDF/DOC/DOCX/ảnh)
  - Kiểm tra định dạng và kích thước file
  - Ghi nhận đồng ý xử lý dữ liệu (consent)

- UC-013: Chọn vị trí mục tiêu / Career Role
  - Xem danh sách role IT có sẵn
  - Chọn role phù hợp để phân tích CV

- UC-014: Trích xuất và phân tích CV
  - Trích xuất nội dung CV
  - Phân tích theo role mục tiêu
  - Chấm điểm CV và lưu kết quả phân tích

- UC-015: Xem kết quả phân tích CV
  - Xem điểm tổng quan
  - Xem điểm thành phần theo các tiêu chí
  - Xem các lỗi cơ bản trong CV

- UC-016: Xem gợi ý cải thiện CV
  - Xem các đề xuất cải thiện CV theo từng vấn đề
  - Phân biệt nội dung miễn phí và nội dung Premium

- UC-024: Xem lịch sử phân tích
  - Xem lại các kết quả phân tích trước đó
  - Mở lại chi tiết kết quả phân tích

- UC-026: Xem gói dịch vụ
  - Xem danh sách gói Free/Premium
  - Xem tính năng và giới hạn của từng gói

## Tóm tắt

Project hiện tại có tập trung triển khai các use case chính từ đăng nhập, quản lý người dùng, upload và phân tích CV cho đến quản trị dữ liệu và gói dịch vụ.

---

# Ý nghĩa của “Thống kê sử dụng & phễu chuyển đổi” trong trang Admin

## 1. Mục đích chung

Phần này giúp Admin quan sát cách người dùng đi qua toàn bộ hành trình của SmartCV Advisor, từ lúc truy cập trang chủ cho đến khi hoàn thành phân tích CV, xem gợi ý hoặc nâng cấp Premium.

Nó được dùng để:

- đánh giá mức độ sử dụng sản phẩm;
- nhận biết bước nào khiến nhiều người dùng dừng lại;
- đo hiệu quả chuyển đổi từ đăng ký sang sử dụng thật và trả phí;
- xác định nguồn truy cập, chiến dịch hoặc thông điệp thu hút người dùng tốt;
- biết Role IT nào được quan tâm nhiều;
- theo dõi mức độ hài lòng qua phản hồi của người dùng;
- cung cấp dữ liệu để Admin cải thiện giao diện, quy trình phân tích CV, nội dung marketing và gói dịch vụ.

## 2. Ý nghĩa của phễu chuyển đổi

Phễu mô tả các bước chính trong hành trình sử dụng:

1. **Truy cập trang chủ:** số lần sự kiện mở Landing Page được ghi nhận.
2. **Đăng ký:** số lượt hoàn tất đăng ký tài khoản.
3. **Chọn CV:** số người dùng hoặc phiên truy cập duy nhất đã chọn CV. Đây là bước duy nhất hiện được khử trùng lặp theo `ActorKey`.
4. **Tải CV lên thành công:** số lượt hệ thống nhận và lưu CV thành công.
5. **Bắt đầu phân tích:** số lượt quy trình phân tích CV được khởi chạy.
6. **Hoàn thành phân tích:** số lượt phân tích tạo được kết quả thành công.
7. **Xem gợi ý:** số lượt người dùng mở phần gợi ý cải thiện CV.
Các con số giúp Admin thấy quy mô ở từng bước. Ví dụ, có nhiều lượt tải CV nhưng ít lượt hoàn thành phân tích có thể cho thấy lỗi xử lý, thời gian chờ lâu hoặc trải nghiệm chưa tốt.

## 3. Tỷ lệ rời bỏ từng bước

Tỷ lệ rời bỏ cho biết mức giảm từ một bước sang bước kế tiếp trong phễu.

Công thức đang dùng:

`Số rời bỏ = max(Số ở bước trước - Số ở bước sau, 0)`

`Tỷ lệ rời bỏ = Số rời bỏ / Số ở bước trước × 100%`

Ví dụ: có 100 lượt đăng ký và 60 lượt chọn CV thì số rời bỏ là 40, tương ứng 40%. Tỷ lệ càng cao thì bước chuyển tiếp đó càng cần được kiểm tra. Nếu bước sau có số lượt lớn hơn bước trước, hệ thống hiển thị mức rời bỏ bằng 0 thay vì số âm.

Phần rời bỏ được tính từ “Truy cập trang chủ” đến “Xem gợi ý”.

## 4. Các tỷ lệ chuyển đổi

- **Tỷ lệ hoàn thành phân tích CV trên tổng lượt đăng ký:** tỷ lệ số lượt hoàn thành phân tích trên số lượt hoàn tất đăng ký. Chỉ số này cho biết người đăng ký có đi đến giá trị cốt lõi của sản phẩm hay không.

  `Tỷ lệ = Số lượt hoàn thành phân tích / Số lượt đăng ký × 100%`

- **Tỷ lệ nâng cấp Premium trên tổng lượt đăng ký:** tỷ lệ số sự kiện nâng cấp Premium trên số lượt hoàn tất đăng ký. Chỉ số này phản ánh khả năng biến người đăng ký thành khách hàng trả phí. Giao diện cũng hiển thị số lượt nâng cấp Premium và số lượt đăng ký dùng trong phép tính.

  `Tỷ lệ = Số lượt chuyển sang Premium / Số lượt đăng ký × 100%`

Nếu chưa có lượt đăng ký thì tỷ lệ được hiển thị là 0% để tránh phép chia cho 0. Cả hai tỷ lệ chuyển đổi đều được giới hạn trong khoảng từ 0% đến 100%; nếu số lượt ở tử số lớn hơn số lượt đăng ký thì kết quả hiển thị tối đa là 100%.

## 5. Nguồn truy cập và thông điệp

- **Nguồn truy cập:** cho biết người dùng đến Landing Page từ đâu, chẳng hạn truy cập trực tiếp, Google hoặc mạng xã hội.
- **Chiến dịch:** nhóm lượt truy cập theo tên campaign, giúp so sánh hiệu quả các chiến dịch marketing.
- **Biến thể thông điệp:** thống kê biến thể nội dung gắn với lượt nhấn CTA, hữu ích khi thử nghiệm nhiều tiêu đề, lời kêu gọi hành động hoặc thông điệp quảng bá.

Mỗi danh sách hiển thị tối đa 20 giá trị có số lượt cao nhất. Nguồn và campaign được tổng hợp từ sự kiện truy cập Landing Page, còn biến thể thông điệp được tổng hợp từ sự kiện nhấn CTA.

## 6. Role được chọn nhiều

Mục này xếp hạng các Role IT mục tiêu được ghi nhận khi bắt đầu phân tích, ví dụ Frontend Developer, Backend Developer hoặc Data Analyst. Admin có thể dùng thông tin này để ưu tiên cập nhật bộ kỹ năng, trọng số chấm điểm, nội dung gợi ý và chiến dịch phù hợp với nhu cầu phổ biến.

## 7. Mức độ hài lòng

- **Điểm trung bình:** trung bình trường `DanhGia` trong các phản hồi, hiển thị trên thang 5 điểm.
- **Tổng phản hồi:** tổng số bản ghi phản hồi được dùng trong phần thống kê.

Điểm cao cho thấy người dùng nhìn chung hài lòng; điểm thấp hoặc giảm theo thời gian là tín hiệu Admin nên xem chi tiết phản hồi và báo lỗi để tìm nguyên nhân.

## 8. Nguồn dữ liệu và cách hiểu đúng

- Các chỉ số phễu, chuyển đổi, nguồn truy cập, campaign, biến thể thông điệp và Role được tổng hợp từ collection `SUKIEN_SANPHAM`.
- Điểm hài lòng và tổng phản hồi được tổng hợp từ collection `DANHGIASP`.
- Backend hỗ trợ lọc theo `date_from` và `date_to`. Tuy nhiên, giao diện Admin hiện gọi API không truyền khoảng thời gian, vì vậy mặc định hiển thị toàn bộ dữ liệu đã ghi nhận.
- Các bước trong phễu chủ yếu là **số lượt sự kiện**, không đồng nhất với số người dùng duy nhất. Một người có thể tạo nhiều lượt phân tích hoặc xem gợi ý.
- Tỷ lệ rời bỏ hiện so sánh tổng số của hai loại sự kiện liền nhau, không truy vết một cohort người dùng qua từng bước. Vì vậy đây là chỉ báo vận hành tổng quan, không nên diễn giải tuyệt đối là đúng từng cá nhân đã rời bỏ.
- Dữ liệu thống kê không sử dụng nội dung CV thô hoặc thông tin cá nhân trích xuất từ CV.

## 9. Cách Admin nên sử dụng

- Tìm bước có tỷ lệ rời bỏ cao nhất để ưu tiên kiểm tra.
- So sánh số “Bắt đầu phân tích” và “Hoàn thành phân tích” để phát hiện vấn đề xử lý.
- Theo dõi “Tỷ lệ hoàn thành phân tích CV trên tổng lượt đăng ký” để đánh giá khả năng kích hoạt người dùng mới.
- Theo dõi “Tỷ lệ nâng cấp Premium trên tổng lượt đăng ký” để đánh giá hiệu quả thương mại.
- Dùng nguồn, campaign và biến thể thông điệp để quyết định kênh marketing cần đầu tư.
- Dùng Role phổ biến để ưu tiên nội dung và cấu hình chấm CV.
- Đọc điểm hài lòng cùng phản hồi chi tiết; không nên chỉ dựa vào một con số trung bình.
