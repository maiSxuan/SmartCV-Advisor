BƯỚC 2: CHỈNH LẠI LOGIC:
đối với gói FREE thì không nên giới hạn lịch sử phân tích, để nó hiện lên hết luôn (tính năng: xem lại toàn bộ lịch sử phân tích). Tức là logic của lịch sử phân tích của gói premium và gói free phải y chang nhau, đều không được phép giới hạn

BƯỚC 3: CHỈNH LẠI vòng đời của tài khoản (vòng đời giống cái gói của chatgpt)
ví dụ khi người dùng đang là gói premium 30 ngày (ngày đăng kí là 3/8) thì phải đến ngày 3/9 mới hết hạn 30 ngày, tương tự gói 90 ngày cũng vậy. còn nếu đang là gói premium 30 ngày mà họ lại hủy gói, thì phải đúng 30 ngày sau kể từ ngày đăng kí thì mới về trạng thái gói free. Khi về gói free thì lịch sử vẫn đầy đủ không bị giới hạn, và phải cấp lại 3 lượt phân tích khi họ bước vào chu kì vòng đời tài khoản free (gói free chỉ có 3 lượt phân tích cho 1 vòng đời tài khoản)

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
- Lưu ý tôi muốn: mỗi vòng đời tài khoản chỉ có lần đánh giá duy nhất. ví dụ khi khách hàng ở tài khoản free thì cho 1 lần đánh giá suốt vòng đời tài khoản free, tương tự cho premium 30 ngày, premium 90 ngày. Hiện tại database ở mongodb đang thiếu collection DANHGIASP cần bổ sung và thêm các thuộc tính phù hợp với nội dung tối thiểu

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
