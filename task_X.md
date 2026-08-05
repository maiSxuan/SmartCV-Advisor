BƯỚC 2: CHỈNH LẠI LOGIC:
đối với gói FREE thì không nên giới hạn lịch sử phân tích, để nó hiện lên hết luôn (tính năng: xem lại toàn bộ lịch sử phân tích). Tức là logic của lịch sử phân tích của gói premium và gói free phải y chang nhau, đều không được phép giới hạn

BƯỚC 3: CHỈNH LẠI vòng đời của tài khoản (vòng đời giống cái gói của chatgpt)
ví dụ khi người dùng đang là gói premium 30 ngày (ngày đăng kí là 3/8) thì phải đến ngày 3/9 mới hết hạn 30 ngày, tương tự gói 90 ngày cũng vậy. còn nếu đang là gói premium 30 ngày mà họ lại hủy gói, thì phải đúng 30 ngày sau kể từ ngày đăng kí thì mới về trạng thái gói free. Khi về gói free thì lịch sử vẫn đầy đủ không bị giới hạn, và phải cấp lại 3 lượt phân tích khi họ bước vào chu kì vòng đời tài khoản free (gói free chỉ có 3 lượt phân tích cho 1 vòng đời tài khoản)

- Quy ước cấu hình thời hạn: `DV_FREE.HanSuDung = -1` biểu thị không giới hạn thời hạn sử dụng; Premium 30/90 vẫn dùng lần lượt 30/90 để tính 1/3 tháng lịch.

BƯỚC 4: THỰC HIỆN THÊM CÁC USECASE SAU ĐỂ ĐẢM BẢO ĐỦ USECASE CHO MVP SẢN PHẨM
NEWUC-01: Gửi phản hồi (hoặc đánh giá sản phẩm)

- Báo cáo yêu cầu biểu mẫu phản hồi ngay sau khi người dùng nhận kết quả và đánh giá theo thang 1–5.
- Nội dung tối thiểu:
  Kết quả có dễ hiểu không?
  Gợi ý có đủ cụ thể không?
  Kết quả có hữu ích không?
  Có lỗi/gợi ý nào chưa chính xác?
  Người dùng có muốn phân tích lại không?
  Người dùng có sẵn sàng giới thiệu sản phẩm không?
  Bình luận tùy chọn.
- Lưu ý cập nhật: trong mỗi vòng đời Free, Premium 30 ngày hoặc Premium 90 ngày, người dùng được gửi nhiều đánh giá sản phẩm. Mỗi đánh giá vẫn phải gắn với vòng đời và kết quả phân tích liên quan. Hiện tại database ở mongodb đang thiếu collection DANHGIASP cần bổ sung và thêm các thuộc tính phù hợp với nội dung tối thiểu

NEWUC-02: Quản lý cấu hình gói
Admin cần quản lý tối thiểu:
Tên gói.
Giá.
Thời hạn.
Số lượt phân tích.
Quyền lợi.
Trạng thái hoạt động.
Ngày cập nhật.

NEWUC-03: Xem thống kê sử dụng và funnel

Phải hiển thị ít nhất thể hiện đúng bản chất MVP sản phẩm làm tiền đề để kiểm chứng, markting:
Lượt truy cập Landing Page.
Số đăng ký.
Số người chọn CV.
Số upload thành công.
Số bắt đầu phân tích.
Số hoàn thành phân tích.
Số xem gợi ý.
Số phân tích lại.
Tỷ lệ rời bỏ từng bước.
Nguồn truy cập.
Campaign/message variant.
Registered/Premium conversion.
Role được chọn nhiều.
Điểm hài lòng trung bình.

NEWUC-04: Quản lý phản hồi và báo lỗi (ở đây cần xem database có khả năng đáp ứng không, nếu không thì tự thêm dữ liệu để hoàn chỉnh uc này)
Admin cần:
Xem danh sách phản hồi.
Lọc theo loại phản hồi.
Xem rating.
Xem analysis liên quan.
Phân loại: lỗi kỹ thuật; kết quả khó hiểu; gợi ý chưa cụ thể; nhận xét chưa chính xác; quyền riêng tư; góp ý khác.
Chuyển trạng thái: Mới; Đang xem xét; Đã xử lý; Không xử lý.
Ghi chú nội bộ.

BƯỚC 5: CẦN CHỈNH LẠI (THÊM) LANDING PAGE THEO TIÊU CHÍ:
Xem Landing Page và bắt đầu phân tích
Không nên xem Landing Page chỉ là một màn hình UI, bởi báo cáo dùng nó để:
Giải thích SmartCV Advisor giải quyết vấn đề gì.
Hiển thị CTA “Phân tích CV miễn phí”.
Chuyển Guest đến đăng ký/đăng nhập.
Ghi nhận nguồn truy cập và thông điệp Marketing.
Hiển thị thông tin an toàn dữ liệu.
LƯU ý: cái nào hiện tại đang có rồi thì bỏ qua, không nên thêm hoặc xóa hoặc chỉnh bậy

BƯỚC 6: CHỈNH SỬA CÁI LOGIC ĐANG BỊ SAI

- Check đuôi email: nếu đuôi đăng nhập/ đăng kí của user không là phải gmail.com thì không cho đăng kí/đăng nhập --> chỉnh logic đăng kí/đăng nhập đúng logic bình thường.
  - thực hiện xác thực tài khoản email khi đăng kí và quên mật khẩu lúc đăng nhập --> dùng Nodemailer:
    AUTH_SMTP_HOST=smtp.gmail.com
    AUTH_SMTP_PORT=465
    AUTH_SMTP_USER=xuan1885322434@gmail.com
    AUTH_SMTP_PASS=xxxxxxxxxxxxx
- avt ở góc phải trên cùng phải link vs hồ sơ cá nhân
- Chỉnh tiếng việt toàn bộ UI cho hợp lí
- Chỉnh combobox nằm bên dưới tiêu chí
- Bỏ “bạn có muốn phân tích lại không” ở phần gửi phản hồi đánh giá của user và đẩy cái phải hồi này dưới phần roadmap sau khi đã xem đánh giá cv, roadmap ở trên
- Chỉnh điểm đánh giá thành sao (UI) kèm sub, ví dụ 5 sao là cực kì hài lòng, 4: hài lòng, 3: bình thường, 2: tệ, 1: rất tệ
- thêm footer các page (user free, premium, landing page)
- Khi nhấn nút "Phân tích CV ngay" ở landing page mà còn trong phiên đăng nhập của user (free/premium) thì nên chuyển về trang user để phân tích. còn nếu user chưa đăng nhập gì hết thì khi nhấn "Phân tích CV ngay" thì chuyển về trang đăng kí
- nên tăng thời gian phiên đăng nhập của user, admin lên 1 ngày
- cho phép user xóa CV của họ không cần phải yêu câù admin duyệt
- amdin không được có chức năng chỉnh sửa thông tin của user
