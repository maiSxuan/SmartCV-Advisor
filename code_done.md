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
