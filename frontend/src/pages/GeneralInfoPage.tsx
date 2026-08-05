import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { getStoredAuthUser } from '../services/api';

type ActiveTab = 'privacy' | 'data-policy';

export default function GeneralInfoPage({ initialTab }: { initialTab?: ActiveTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getStoredAuthUser();
  const analysisPath = currentUser && currentUser.role !== 'admin'
    ? '/upload'
    : currentUser?.role === 'admin' ? '/admin/roles' : '/register';

  // Determine active tab from prop, query parameter, or route pathname
  const getTabFromLocation = (): ActiveTab => {
    const queryTab = searchParams.get('tab');
    if (queryTab === 'data-policy' || queryTab === 'terms') return 'data-policy';
    if (queryTab === 'privacy' || queryTab === 'privacy-policy') return 'privacy';
    if (location.pathname.includes('data-policy') || location.pathname.includes('terms')) return 'data-policy';
    if (location.pathname.includes('privacy')) return 'privacy';
    return initialTab ?? 'privacy';
  };

  const activeTab = getTabFromLocation();
  const [activeSectionId, setActiveSectionId] = useState<string>('');

  const handleTabChange = (tab: ActiveTab) => {
    setSearchParams({ tab });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const privacySections = [
    { id: 'p1', title: '1. Giới thiệu chung' },
    { id: 'p2', title: '2. Phạm vi áp dụng' },
    { id: 'p3', title: '3. Dữ liệu cá nhân thu thập' },
    { id: 'p4', title: '4. Mục đích thu thập và xử lý' },
    { id: 'p5', title: '5. Cơ sở pháp lý xử lý dữ liệu' },
    { id: 'p6', title: '6. AI & việc xử lý nội dung CV' },
    { id: 'p7', title: '7. Chia sẻ dữ liệu với bên thứ ba' },
    { id: 'p8', title: '8. Chuyển dữ liệu ra nước ngoài' },
    { id: 'p9', title: '9. Thời gian lưu trữ dữ liệu' },
    { id: 'p10', title: '10. Bảo mật dữ liệu' },
    { id: 'p11', title: '11. Quyền của bạn với dữ liệu' },
    { id: 'p12', title: '12. Cookie & công nghệ theo dõi' },
    { id: 'p13', title: '13. Dữ liệu người chưa đủ 18 tuổi' },
    { id: 'p14', title: '14. Thay đổi chính sách' },
    { id: 'p15', title: '15. Thông tin liên hệ' },
  ];

  const dataPolicySections = [
    { id: 'd1', title: '1. Đối tượng áp dụng' },
    { id: 'd2', title: '2. Vai trò các bên kiểm soát và xử lý dữ liệu' },
    { id: 'd3', title: '3. 7 nguyên tắc xử lý dữ liệu' },
    { id: 'd4', title: '4. Quy trình ghi nhận sự đồng ý' },
    { id: 'd5', title: '5. Quy trình xóa CV và dữ liệu liên quan' },
    { id: 'd6', title: '6. Xử lý sự cố lộ, mất dữ liệu' },
    { id: 'd7', title: '7. Trách nhiệm người dùng khi cung cấp' },
    { id: 'd8', title: '8. Thỏa thuận xử lý dữ liệu bên thứ ba' },
    { id: 'd9', title: '9. Hiệu lực, sửa đổi & Điều khoản chung' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ───────── HEADER & NAVIGATION ───────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm">
              CV
            </span>
            <span className="text-lg font-bold">
              SmartCV <span className="text-blue-600">Advisor</span>
            </span>
          </Link>

          {/* Center Title Badge */}
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 ring-1 ring-inset ring-blue-700/10">
              Thông tin chung & Pháp lý
            </span>
            <span className="text-xs text-slate-400">Nghị định 13/2023/NĐ-CP</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-blue-600"
            >
              <span>Trang chủ</span>
            </Link>
            <button
              type="button"
              onClick={() => navigate(analysisPath)}
              className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              Phân tích CV ngay
            </button>
          </div>
        </div>
      </header>

      {/* ───────── HERO BANNER ───────── */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-blue-50/60 via-white to-slate-50 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                Bảo vệ dữ liệu & Pháp lý
              </span>
              <span className="text-xs text-slate-500">Cập nhật: Tháng 08/2026</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Thông tin chung về Chính sách & Xử lý Dữ liệu
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              SmartCV Advisor cam kết bảo vệ dữ liệu cá nhân của bạn theo chuẩn mực cao nhất và tuân thủ Nghị định 13/2023/NĐ-CP của Chính phủ Việt Nam về bảo vệ dữ liệu cá nhân.
            </p>
          </div>

          {/* TAB BAR NAVIGATION */}
          <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200 pb-px">
            <button
              type="button"
              onClick={() => handleTabChange('privacy')}
              className={`flex items-center gap-2.5 rounded-t-2xl border-b-2 px-6 py-3.5 text-sm font-bold transition-all ${
                activeTab === 'privacy'
                  ? 'border-blue-600 bg-white text-blue-600 shadow-sm'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-100/60 hover:text-slate-900'
              }`}
            >
              <span>Phần A — Chính sách quyền riêng tư</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">15 mục</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('data-policy')}
              className={`flex items-center gap-2.5 rounded-t-2xl border-b-2 px-6 py-3.5 text-sm font-bold transition-all ${
                activeTab === 'data-policy'
                  ? 'border-blue-600 bg-white text-blue-600 shadow-sm'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-100/60 hover:text-slate-900'
              }`}
            >
              <span>Phần B — Điều khoản xử lý dữ liệu</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">9 mục</span>
            </button>
          </div>
        </div>
      </div>

      {/* ───────── MAIN CONTENT AREA ───────── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* STICKY TABLE OF CONTENTS SIDEBAR */}
          <aside className="hidden lg:col-span-4 lg:block">
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Mục lục nhanh ({activeTab === 'privacy' ? 'Phần A' : 'Phần B'})
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {activeTab === 'privacy' ? '15 điều khoản' : '9 điều khoản'}
                </span>
              </div>
              <nav className="mt-4 max-h-[calc(100vh-220px)] space-y-1 overflow-y-auto pr-1 text-sm">
                {(activeTab === 'privacy' ? privacySections : dataPolicySections).map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => scrollToSection(sec.id)}
                    className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                      activeSectionId === sec.id
                        ? 'bg-blue-50 font-bold text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {sec.title}
                  </button>
                ))}
              </nav>

              <div className="mt-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 text-xs">
                <p className="font-bold text-slate-900">Cần hỗ trợ về quyền dữ liệu?</p>
                <p className="mt-1 text-slate-600">Email bộ phận phụ trách bảo mật:</p>
                <a
                  href="mailto:adminSmartCV@gmail.com"
                  className="mt-2 inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                >
                  adminSmartCV@gmail.com
                </a>
              </div>
            </div>
          </aside>

          {/* MAIN DOCUMENT BODY */}
          <main className="lg:col-span-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 1: PHẦN A — CHÍNH SÁCH QUYỀN RIÊNG TƯ                      */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'privacy' && (
                <div className="space-y-12 text-slate-700">
                  <div className="border-b border-slate-200 pb-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-600">PHẦN A</span>
                    <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                      CHÍNH SÁCH QUYỀN RIÊNG TƯ
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Quy định về việc thu thập, sử dụng, bảo vệ và quyền của người dùng đối với dữ liệu cá nhân trên hệ thống SmartCV Advisor.
                    </p>
                  </div>

                  {/* Section 1 */}
                  <section id="p1" className="scroll-mt-24">
                    <h3 className="text-lg font-bold text-slate-900">1. Giới thiệu chung</h3>
                    <p className="mt-3 leading-7">
                      <strong>SmartCV Advisor</strong> là nền tảng hỗ trợ người dùng tải lên, phân tích và đánh giá CV theo vị trí nghề nghiệp mục tiêu. Hệ thống cung cấp điểm đánh giá, phát hiện các lỗi phổ biến và đề xuất hướng cải thiện CV.
                    </p>
                    <p className="mt-3 leading-7">
                      Chính sách quyền riêng tư này giải thích cách SmartCV Advisor thu thập, sử dụng, lưu trữ, bảo vệ và xóa dữ liệu cá nhân của người dùng trong quá trình sử dụng nền tảng.
                    </p>
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-slate-700">
                      <p className="font-semibold text-blue-900">Đơn vị vận hành trong phạm vi phiên bản thử nghiệm:</p>
                      <p className="mt-1">
                        <strong>Nhóm dự án SmartCV Advisor – Nhóm 9</strong>
                        <br />
                        Khoa Công nghệ Thông tin, Trường Đại học Khoa học Tự nhiên, Đại học Quốc gia Thành phố Hồ Chí Minh.
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        *Khi sản phẩm được vận hành bởi doanh nghiệp hoặc pháp nhân chính thức, thông tin đơn vị vận hành tại mục này sẽ được cập nhật.
                      </p>
                    </div>
                  </section>

                  {/* Section 2 */}
                  <section id="p2" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">2. Phạm vi áp dụng</h3>
                    <p className="mt-3 leading-7">Chính sách này áp dụng đối với:</p>
                    <ul className="mt-2 list-disc space-y-1.5 pl-6 leading-7 text-slate-600">
                      <li>Người truy cập website SmartCV Advisor.</li>
                      <li>Người đăng ký tài khoản.</li>
                      <li>Người tải CV lên hệ thống.</li>
                      <li>Người sử dụng chức năng phân tích CV.</li>
                      <li>Người xem lại lịch sử và kết quả phân tích.</li>
                      <li>Người sử dụng các chức năng quản lý tài khoản hoặc gói dịch vụ.</li>
                    </ul>
                    <p className="mt-3 leading-7 text-slate-500">
                      Chính sách <strong>không áp dụng</strong> đối với các website, ứng dụng hoặc dịch vụ của bên thứ ba mà người dùng truy cập thông qua liên kết ngoài SmartCV Advisor.
                    </p>
                  </section>

                  {/* Section 3 */}
                  <section id="p3" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">3. Dữ liệu cá nhân chúng tôi thu thập</h3>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-600">
                          <tr>
                            <th className="border-b border-slate-200 px-4 py-3 sm:px-6">Nhóm dữ liệu</th>
                            <th className="border-b border-slate-200 px-4 py-3 sm:px-6">Chi tiết</th>
                            <th className="border-b border-slate-200 px-4 py-3 sm:px-6">Thời điểm thu thập</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Thông tin tài khoản</td>
                            <td className="px-4 py-3 sm:px-6">Họ tên, email, mật khẩu (đã mã hóa)</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Khi đăng ký</td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold sm:px-6">Thông tin hồ sơ</td>
                            <td className="px-4 py-3 sm:px-6">Vị trí mục tiêu, trình độ hiện tại, ngành nghề quan tâm</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Khi cập nhật hồ sơ cá nhân</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Nội dung CV</td>
                            <td className="px-4 py-3 sm:px-6">Họ tên, email, số điện thoại, địa chỉ, quá trình học vấn, kinh nghiệm làm việc, kỹ năng, dự án, chứng chỉ và mọi thông tin khác có trong tệp CV bạn tải lên</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Khi tải CV (PDF/DOCX/Ảnh)</td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold sm:px-6">Nội dung mô tả công việc</td>
                            <td className="px-4 py-3 sm:px-6">Nội dung mô tả công việc bạn dán hoặc nhập để so khớp với CV</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Khi sử dụng tính năng Matching</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Dữ liệu sử dụng dịch vụ</td>
                            <td className="px-4 py-3 sm:px-6">Lịch sử phân tích, điểm số CV, lượt sử dụng trợ lý AI, gói dịch vụ đang dùng</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Trong quá trình sử dụng</td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold sm:px-6">Dữ liệu giao dịch</td>
                            <td className="px-4 py-3 sm:px-6">Thông tin thanh toán khi nâng cấp Premium (không lưu trực tiếp số thẻ; xử lý qua cổng thanh toán bên thứ ba)</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Khi thanh toán</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Dữ liệu kỹ thuật</td>
                            <td className="px-4 py-3 sm:px-6">Địa chỉ IP, loại trình duyệt, thiết bị, thời gian truy cập, cookie</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Tự động khi truy cập nền tảng</td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold sm:px-6">Trao đổi hỗ trợ</td>
                            <td className="px-4 py-3 sm:px-6">Nội dung phản hồi, báo lỗi, câu hỏi gửi đến bộ phận hỗ trợ</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Khi bạn liên hệ hỗ trợ</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                      <p className="font-semibold">Khuyến nghị về Dữ liệu nhạy cảm:</p>
                      <p className="mt-1">
                        CV có thể chứa dữ liệu cá nhân <strong>nhạy cảm</strong> tùy nội dung bạn cung cấp (ví dụ ảnh chân dung, tình trạng hôn nhân, tôn giáo nếu bạn tự đưa vào CV). Chúng tôi khuyến nghị bạn <strong>không đưa các thông tin nhạy cảm không cần thiết</strong> vào CV khi tải lên hệ thống.
                      </p>
                    </div>
                  </section>

                  {/* Section 4 */}
                  <section id="p4" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">4. Mục đích thu thập và xử lý dữ liệu</h3>
                    <p className="mt-3 leading-7">Chúng tôi xử lý dữ liệu cá nhân của bạn nhằm các mục đích sau:</p>
                    <ol className="mt-2 list-decimal space-y-2 pl-6 leading-7 text-slate-600">
                      <li>Cung cấp dịch vụ cốt lõi: trích xuất nội dung CV, chấm điểm, so khớp với mô tả công việc, tính điểm phù hợp, xác định từ khóa hoặc kỹ năng còn thiếu và tạo lộ trình nâng cao kỹ năng.</li>
                      <li>Vận hành trợ lý AI hỗ trợ chỉnh sửa nội dung CV theo yêu cầu của bạn.</li>
                      <li>Quản lý tài khoản, xác thực đăng nhập và phân quyền theo gói dịch vụ Free hoặc Premium.</li>
                      <li>Xử lý thanh toán và quản lý gói dịch vụ Premium 30/90 ngày.</li>
                      <li>Gửi thông báo liên quan đến tài khoản, kết quả phân tích, trạng thái gói dịch vụ.</li>
                      <li>Cải thiện chất lượng thuật toán, sửa lỗi, phát triển tính năng mới (<strong>chỉ khi có sự đồng ý riêng của bạn</strong> — xem mục 8).</li>
                      <li>Chăm sóc khách hàng, tiếp nhận và xử lý phản hồi, khiếu nại.</li>
                      <li>Phân tích thống kê nội bộ (ẩn danh hóa) để đo lường hiệu quả sản phẩm.</li>
                      <li>Tuân thủ nghĩa vụ pháp lý khi có yêu cầu từ cơ quan nhà nước có thẩm quyền.</li>
                    </ol>
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
                      Cam kết thương mại: Chúng tôi <strong>không</strong> sử dụng nội dung CV của bạn cho mục đích quảng cáo nhắm mục tiêu hoặc bán cho bên thứ ba vì mục đích thương mại.
                    </div>
                  </section>

                  {/* Section 5 */}
                  <section id="p5" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">5. Cơ sở pháp lý xử lý dữ liệu</h3>
                    <p className="mt-3 leading-7">
                      Theo <strong>Nghị định 13/2023/NĐ-CP</strong>, chúng tôi xử lý dữ liệu cá nhân dựa trên:
                    </p>
                    <ul className="mt-2 list-disc space-y-2 pl-6 leading-7 text-slate-600">
                      <li>
                        <strong>Sự đồng ý của bạn</strong>: được thể hiện rõ ràng khi bạn đánh dấu vào ô xác nhận trước khi tải CV lên hệ thống (như minh họa tại màn hình "Tải CV của bạn lên").
                      </li>
                      <li>
                        <strong>Thực hiện hợp đồng/cung cấp dịch vụ</strong>: mà bạn đã yêu cầu (chấm điểm CV, tính điểm phù hợp...).
                      </li>
                      <li>
                        <strong>Nghĩa vụ pháp lý</strong>: trong các trường hợp bắt buộc theo quy định pháp luật.
                      </li>
                    </ul>
                    <p className="mt-3 leading-7 text-slate-600">
                      Bạn có quyền <strong>rút lại sự đồng ý bất kỳ lúc nào</strong>. Việc rút lại sự đồng ý không ảnh hưởng đến tính hợp pháp của việc xử lý dữ liệu đã thực hiện trước đó, nhưng có thể khiến chúng tôi không thể tiếp tục cung cấp một số hoặc toàn bộ tính năng cho bạn.
                    </p>
                  </section>

                  {/* Section 6 */}
                  <section id="p6" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">6. AI và việc xử lý nội dung CV</h3>
                    <ul className="mt-3 space-y-3 pl-0 leading-7 text-slate-600">
                      <li className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                        <span>CV và mô tả công việc bạn cung cấp được gửi đến nhà cung cấp dịch vụ AI (hiện tại là <strong>OpenAI</strong>) để thực hiện việc trích xuất nội dung, chấm điểm, so khớp và tạo gợi ý chỉnh sửa.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                        <span>Dữ liệu được truyền qua kết nối mã hóa (HTTPS/TLS) và chỉ chứa nội dung cần thiết để thực hiện yêu cầu phân tích.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                        <span><strong>CV của bạn không được sử dụng để huấn luyện lại mô hình AI nếu bạn chưa đưa ra sự đồng ý riêng</strong> cho việc này (đúng theo cam kết minh họa tại màn hình "Dữ liệu & Quyền riêng tư" trong sản phẩm).</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                        <span>Trợ lý AI chỉ đề xuất cách diễn đạt dựa trên thông tin có thật do bạn cung cấp; hệ thống không tự động thêm thông tin sai sự thật vào CV.</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
                        <span>Vì việc phân tích có sử dụng mô hình ngôn ngữ, kết quả (điểm số, gợi ý) mang tính chất <strong>tham khảo</strong>, không đảm bảo tuyệt đối chính xác hoặc đảm bảo kết quả tuyển dụng.</span>
                      </li>
                    </ul>
                  </section>

                  {/* Section 7 */}
                  <section id="p7" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">7. Chia sẻ dữ liệu với bên thứ ba</h3>
                    <p className="mt-3 leading-7">Chúng tôi chỉ chia sẻ dữ liệu cá nhân trong các trường hợp sau:</p>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-600">
                          <tr>
                            <th className="border-b border-slate-200 px-4 py-3 sm:px-6">Bên nhận</th>
                            <th className="border-b border-slate-200 px-4 py-3 sm:px-6">Mục đích</th>
                            <th className="border-b border-slate-200 px-4 py-3 sm:px-6">Loại dữ liệu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Nhà cung cấp dịch vụ AI (OpenAI)</td>
                            <td className="px-4 py-3 sm:px-6">Thực hiện phân tích, chấm điểm, gợi ý nội dung</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Nội dung CV và mô tả công việc</td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold sm:px-6">Nhà cung cấp hạ tầng đám mây, máy chủ và cơ sở dữ liệu (MongoDB Atlas hoặc tương đương)</td>
                            <td className="px-4 py-3 sm:px-6">Lưu trữ, vận hành hệ thống</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Toàn bộ dữ liệu tài khoản, CV</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Cổng thanh toán trung gian</td>
                            <td className="px-4 py-3 sm:px-6">Xử lý giao dịch nâng cấp Premium</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Thông tin thanh toán (không bao gồm số thẻ đầy đủ)</td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold sm:px-6">Đối tác B2B (trường đại học, trung tâm đào tạo) — <em>chỉ trong giai đoạn mở rộng khi có thỏa thuận riêng</em></td>
                            <td className="px-4 py-3 sm:px-6">Hỗ trợ chương trình hướng nghiệp</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Dữ liệu ẩn danh hoặc dữ liệu đã được bạn đồng ý chia sẻ</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Cơ quan nhà nước có thẩm quyền</td>
                            <td className="px-4 py-3 sm:px-6">Tuân thủ yêu cầu pháp lý</td>
                            <td className="px-4 py-3 text-slate-500 sm:px-6">Theo phạm vi yêu cầu hợp pháp</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Chúng tôi yêu cầu các bên thứ ba nêu trên cam kết bảo mật dữ liệu tương đương hoặc cao hơn tiêu chuẩn của SmartCV Advisor thông qua thỏa thuận xử lý dữ liệu (Data Processing Agreement). Chúng tôi <strong>không bán</strong> dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào.
                    </p>
                  </section>

                  {/* Section 8 */}
                  <section id="p8" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">8. Chuyển dữ liệu ra nước ngoài</h3>
                    <p className="mt-3 leading-7">
                      Do sử dụng dịch vụ AI và hạ tầng đám mây có máy chủ đặt ngoài lãnh thổ Việt Nam, dữ liệu cá nhân của bạn có thể được <strong>chuyển ra nước ngoài</strong> để xử lý. Trong trường hợp này, chúng tôi cam kết:
                    </p>
                    <ul className="mt-2 list-disc space-y-1.5 pl-6 leading-7 text-slate-600">
                      <li>Chỉ chuyển dữ liệu cho các đối tác có biện pháp bảo mật phù hợp.</li>
                      <li>Tuân thủ quy định về chuyển dữ liệu cá nhân ra nước ngoài theo Nghị định 13/2023/NĐ-CP, bao gồm việc lập và lưu giữ hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài khi thuộc diện áp dụng.</li>
                    </ul>
                  </section>

                  {/* Section 9 */}
                  <section id="p9" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">9. Thời gian lưu trữ dữ liệu</h3>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-600">
                          <tr>
                            <th className="border-b border-slate-200 px-4 py-3 sm:px-6">Loại dữ liệu</th>
                            <th className="border-b border-slate-200 px-4 py-3 sm:px-6">Thời gian lưu trữ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Thông tin tài khoản</td>
                            <td className="px-4 py-3 sm:px-6">Đến khi bạn yêu cầu xóa tài khoản hoặc tài khoản không hoạt động quá 12 tháng</td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold sm:px-6">Tệp CV đã tải lên</td>
                            <td className="px-4 py-3 sm:px-6">Đến khi bạn chủ động xóa, hoặc tối đa 12 tháng kể từ lần truy cập gần nhất</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Lịch sử phân tích</td>
                            <td className="px-4 py-3 sm:px-6">
                              Người dùng Free và Premium đều xem được toàn bộ lịch sử. Dữ liệu được lưu cùng CV đến khi bạn chủ động xóa CV hoặc hết thời hạn lưu trữ nêu trên.
                            </td>
                          </tr>
                          <tr className="bg-slate-50/50">
                            <td className="px-4 py-3 font-semibold sm:px-6">Dữ liệu giao dịch/thanh toán</td>
                            <td className="px-4 py-3 sm:px-6">Theo thời hạn lưu trữ chứng từ kế toán bắt buộc theo pháp luật Việt Nam</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-semibold sm:px-6">Dữ liệu hỗ trợ khách hàng</td>
                            <td className="px-4 py-3 sm:px-6">6 tháng kể từ khi kết thúc yêu cầu hỗ trợ</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      Sau thời hạn trên, dữ liệu sẽ được xóa hoặc ẩn danh hóa, trừ khi pháp luật yêu cầu lưu trữ lâu hơn.
                    </p>
                  </section>

                  {/* Section 10 */}
                  <section id="p10" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">10. Bảo mật dữ liệu</h3>
                    <p className="mt-3 leading-7">Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức để bảo vệ dữ liệu của bạn, bao gồm:</p>
                    <ul className="mt-2 list-disc space-y-2 pl-6 leading-7 text-slate-600">
                      <li>Mã hóa mật khẩu và dữ liệu nhạy cảm khi lưu trữ.</li>
                      <li>Mã hóa đường truyền (HTTPS/TLS) cho toàn bộ dữ liệu truyền tải giữa trình duyệt và máy chủ.</li>
                      <li>Phân quyền truy cập dữ liệu theo vai trò (người dùng Free, người dùng Premium, quản trị viên); nhân sự nội bộ chỉ được truy cập dữ liệu cần thiết cho công việc.</li>
                      <li>Giám sát, ghi log truy cập hệ thống để phát hiện truy cập bất thường.</li>
                      <li>Sao lưu định kỳ và kế hoạch khôi phục dữ liệu khi có sự cố.</li>
                    </ul>
                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-6 text-slate-700">
                      Mặc dù áp dụng các biện pháp trên, không có hệ thống nào bảo mật tuyệt đối 100%. Trong trường hợp xảy ra sự cố lộ, mất dữ liệu cá nhân, chúng tôi cam kết thông báo cho cơ quan có thẩm quyền và người dùng bị ảnh hưởng theo đúng thời hạn và quy trình quy định tại Nghị định 13/2023/NĐ-CP.
                    </div>
                  </section>

                  {/* Section 11 */}
                  <section id="p11" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">11. Quyền của bạn đối với dữ liệu cá nhân</h3>
                    <p className="mt-3 leading-7">Theo quy định pháp luật Việt Nam, bạn có các quyền sau:</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        { title: 'Quyền được biết', desc: 'Biết về hoạt động xử lý dữ liệu cá nhân của mình.' },
                        { title: 'Quyền đồng ý/không đồng ý', desc: 'Đồng ý hoặc không đồng ý cho phép xử lý dữ liệu cá nhân.' },
                        { title: 'Quyền truy cập', desc: 'Xem, chỉnh sửa thông tin cá nhân qua mục Hồ sơ cá nhân.' },
                        { title: 'Quyền rút lại sự đồng ý', desc: 'Bất kỳ lúc nào đối với việc xử lý dữ liệu đã đồng ý trước đó.' },
                        { title: 'Quyền xóa dữ liệu', desc: 'Tự xóa từng CV tại Dữ liệu & Quyền riêng tư; liên hệ email nếu muốn xóa toàn bộ tài khoản hoặc dữ liệu khác.' },
                        { title: 'Quyền hạn chế xử lý', desc: 'Yêu cầu tạm ngừng xử lý dữ liệu trong một số trường hợp nhất định.' },
                        { title: 'Quyền phản đối', desc: 'Phản đối việc xử lý dữ liệu nhằm mục đích quảng cáo, tiếp thị.' },
                        { title: 'Quyền khiếu nại, tố cáo, khởi kiện', desc: 'Theo quy định pháp luật nếu cho rằng quyền của mình bị vi phạm.' },
                        { title: 'Quyền yêu cầu bồi thường thiệt hại', desc: 'Theo quy định pháp luật nếu có thiệt hại xảy ra do vi phạm bảo vệ dữ liệu.' },
                        { title: 'Quyền tự bảo vệ', desc: 'Theo quy định của Bộ luật Dân sự, Luật An toàn thông tin mạng và các luật liên quan.' },
                      ].map((item, idx) => (
                        <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                          <span className="text-xs font-bold text-blue-600">Quyền #{idx + 1}</span>
                          <p className="font-bold text-slate-900">{item.title}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                      Để thực hiện các quyền trên, vui lòng liên hệ email <strong>adminSmartCV@gmail.com</strong>. Chúng tôi sẽ phản hồi trong vòng <strong>3 ngày làm việc</strong>.
                    </p>
                  </section>

                  {/* Section 12 */}
                  <section id="p12" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">12. Cookie và công nghệ theo dõi</h3>
                    <p className="mt-3 leading-7">SmartCV Advisor sử dụng cookie và công nghệ tương tự để:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-6 leading-7 text-slate-600">
                      <li>Duy trì phiên đăng nhập.</li>
                      <li>Ghi nhớ tùy chọn hiển thị.</li>
                      <li>Phân tích hành vi sử dụng nhằm cải thiện sản phẩm (dữ liệu ẩn danh hóa khi có thể).</li>
                    </ul>
                    <p className="mt-2 text-sm text-slate-500">
                      Bạn có thể tắt cookie thông qua cài đặt trình duyệt, tuy nhiên một số tính năng có thể không hoạt động bình thường nếu tắt cookie.
                    </p>
                  </section>

                  {/* Section 13 */}
                  <section id="p13" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">13. Dữ liệu của người chưa đủ 18 tuổi</h3>
                    <p className="mt-3 leading-7">
                      SmartCV Advisor được thiết kế cho người dùng từ <strong>16 tuổi trở lên</strong> (hoặc độ tuổi tối thiểu theo quy định pháp luật hiện hành). Nếu bạn dưới độ tuổi này, vui lòng không sử dụng dịch vụ hoặc chỉ sử dụng khi có sự đồng ý và giám sát của cha, mẹ hoặc người giám hộ hợp pháp. Nếu phát hiện đã thu thập dữ liệu của người dưới độ tuổi quy định mà không có sự đồng ý hợp lệ, chúng tôi sẽ xóa dữ liệu đó trong thời gian sớm nhất.
                    </p>
                  </section>

                  {/* Section 14 */}
                  <section id="p14" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">14. Thay đổi chính sách</h3>
                    <p className="mt-3 leading-7">
                      Chúng tôi có thể cập nhật Chính sách này theo thời gian để phản ánh thay đổi về sản phẩm hoặc quy định pháp luật. Phiên bản cập nhật sẽ được đăng tải trên nền tảng kèm ngày hiệu lực mới. Với thay đổi quan trọng, chúng tôi sẽ thông báo qua email hoặc thông báo trong ứng dụng trước khi áp dụng.
                    </p>
                  </section>

                  {/* Section 15 */}
                  <section id="p15" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">15. Liên hệ</h3>
                    <p className="mt-3 leading-7">Nếu có câu hỏi, yêu cầu hoặc khiếu nại liên quan đến Chính sách quyền riêng tư này, vui lòng liên hệ:</p>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 leading-relaxed">
                      <p>
                        <strong>Email:</strong>{' '}
                        <a href="mailto:adminSmartCV@gmail.com" className="font-semibold text-blue-600 hover:underline">
                          adminSmartCV@gmail.com
                        </a>
                      </p>
                      <p className="mt-2">
                        <strong>Địa chỉ:</strong> 227 Nguyễn Văn Cừ, Chợ Quán, Thành phố Hồ Chí Minh
                      </p>
                    </div>
                  </section>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 2: PHẦN B — ĐIỀU KHOẢN XỬ LÝ DỮ LIỆU                     */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeTab === 'data-policy' && (
                <div className="space-y-12 text-slate-700">
                  <div className="border-b border-slate-200 pb-6">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">PHẦN B</span>
                    <h2 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                      ĐIỀU KHOẢN XỬ LÝ DỮ LIỆU
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Quy định chi tiết các nguyên tắc, vai trò và quy trình xử lý dữ liệu phát sinh khi phân tích CV và so khớp mô tả công việc.
                    </p>
                  </div>

                  {/* Section B1 */}
                  <section id="d1" className="scroll-mt-24">
                    <h3 className="text-lg font-bold text-slate-900">1. Đối tượng áp dụng</h3>
                    <p className="mt-3 leading-7">Điều khoản này áp dụng riêng cho hoạt động xử lý dữ liệu cá nhân phát sinh khi bạn:</p>
                    <ul className="mt-2 list-disc space-y-1.5 pl-6 leading-7 text-slate-600">
                      <li>Tải CV lên hệ thống để phân tích.</li>
                      <li>Nhập nội dung mô tả công việc để so khớp.</li>
                      <li>Sử dụng trợ lý AI để chỉnh sửa nội dung CV.</li>
                    </ul>
                  </section>

                  {/* Section B2 */}
                  <section id="d2" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">2. Vai trò các bên</h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                          Bên Kiểm soát Dữ liệu
                        </span>
                        <h4 className="mt-3 font-bold text-slate-900">SmartCV Advisor</h4>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          Đóng vai trò <strong>Bên Kiểm soát dữ liệu</strong> (Data Controller) đối với dữ liệu tài khoản và <strong>Bên Kiểm soát và Xử lý dữ liệu</strong> (Data Controller and Processor) đối với nội dung CV/JD bạn cung cấp.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5">
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800">
                          Bên Xử lý Dữ liệu
                        </span>
                        <h4 className="mt-3 font-bold text-slate-900">Nhà cung cấp AI (OpenAI) và hạ tầng đám mây</h4>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                          Đóng vai trò <strong>Bên Xử lý dữ liệu</strong> (Data Processor) theo ủy quyền và chỉ dẫn của SmartCV Advisor, theo thỏa thuận xử lý dữ liệu đã ký kết.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Section B3 */}
                  <section id="d3" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">3. Nguyên tắc xử lý dữ liệu</h3>
                    <p className="mt-3 leading-7">Chúng tôi cam kết xử lý dữ liệu cá nhân của bạn theo 7 nguyên tắc chuẩn mực:</p>
                    <div className="mt-4 space-y-3">
                      {[
                        { num: '1', title: 'Hợp pháp, minh bạch', desc: 'Chỉ xử lý khi có sự đồng ý hoặc cơ sở pháp lý phù hợp, và luôn thông báo rõ mục đích trước khi thu thập.' },
                        { num: '2', title: 'Giới hạn mục đích', desc: 'Chỉ sử dụng dữ liệu cho mục đích đã thông báo, không sử dụng cho mục đích khác nếu chưa có sự đồng ý bổ sung.' },
                        { num: '3', title: 'Tối thiểu hóa dữ liệu', desc: 'Chỉ thu thập dữ liệu cần thiết để cung cấp dịch vụ.' },
                        { num: '4', title: 'Chính xác', desc: 'Tạo điều kiện để bạn cập nhật, chỉnh sửa dữ liệu không chính xác.' },
                        { num: '5', title: 'Giới hạn lưu trữ', desc: 'Không lưu trữ dữ liệu lâu hơn mức cần thiết (xem mục A.9).' },
                        { num: '6', title: 'Bảo mật', desc: 'Áp dụng biện pháp kỹ thuật và tổ chức phù hợp (xem mục A.10).' },
                        { num: '7', title: 'Có trách nhiệm giải trình', desc: 'Có khả năng chứng minh việc tuân thủ các nguyên tắc trên khi được yêu cầu.' },
                      ].map((p) => (
                        <div key={p.num} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                            {p.num}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{p.title}</p>
                            <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{p.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Section B4 */}
                  <section id="d4" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">4. Quy trình xử lý sự đồng ý khi tải CV</h3>
                    <p className="mt-3 leading-7">Trước khi CV được xử lý, hệ thống yêu cầu bạn:</p>
                    <ol className="mt-3 space-y-2.5 pl-0">
                      {[
                        'Đọc thông báo mô tả rõ dữ liệu sẽ được thu thập và mục đích xử lý.',
                        'Chủ động đánh dấu vào ô xác nhận đồng ý cho phép hệ thống xử lý dữ liệu trong CV.',
                        'Chỉ sau khi có xác nhận đồng ý, hệ thống mới cho phép bấm "Xác nhận và tải CV lên".',
                      ].map((step, idx) => (
                        <li key={step} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">
                            {idx + 1}
                          </span>
                          <span className="text-sm leading-6 text-slate-700">{step}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 text-xs italic text-slate-500">
                      *Việc đồng ý phải là hành động chủ động, không được suy đoán từ sự im lặng hoặc mặc định lựa chọn sẵn.
                    </p>
                  </section>

                  {/* Section B5 */}
                  <section id="d5" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">5. Quy trình xóa CV và dữ liệu liên quan</h3>
                    <p className="mt-3 leading-7">
                      Bạn có thể tự xóa từng CV ngay tại <strong>Hồ sơ cá nhân &gt; Dữ liệu & Quyền riêng tư</strong>, không cần quản trị viên phê duyệt.
                      Nếu muốn xóa toàn bộ tài khoản hoặc dữ liệu khác, vui lòng gửi yêu cầu qua email hỗ trợ. Hệ thống sẽ thực hiện theo quy trình sau:
                    </p>
                    <div className="mt-4 space-y-3">
                      {[
                        { step: 'Bước 1', desc: 'Hệ thống xác thực danh tính người yêu cầu.' },
                        { step: 'Bước 2', desc: 'Xóa tệp CV, kết quả phân tích và dữ liệu liên quan khỏi hệ thống lưu trữ chính trong vòng 3 ngày làm việc.' },
                        { step: 'Bước 3', desc: 'Yêu cầu nhà cung cấp AI hoặc hạ tầng đám mây xóa bản sao dữ liệu tạm thời (nếu có) theo thỏa thuận xử lý dữ liệu đã ký.' },
                        { step: 'Bước 4', desc: 'Dữ liệu trong bản sao lưu (backup) sẽ được xóa theo chu kỳ sao lưu định kỳ, tối đa 3 ngày sau đó.' },
                      ].map((st) => (
                        <div key={st.step} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
                          <span className="rounded-xl bg-slate-200 px-3 py-1 font-bold text-slate-800 shrink-0 text-xs">
                            {st.step}
                          </span>
                          <span className="text-slate-700">{st.desc}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Section B6 */}
                  <section id="d6" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">6. Xử lý sự cố lộ, mất dữ liệu</h3>
                    <p className="mt-3 leading-7">Trong trường hợp phát hiện sự cố ảnh hưởng đến dữ liệu cá nhân của người dùng, chúng tôi cam kết:</p>
                    <ul className="mt-2 list-disc space-y-2 pl-6 leading-7 text-slate-600">
                      <li>Đánh giá phạm vi, mức độ ảnh hưởng của sự cố trong thời gian sớm nhất.</li>
                      <li>Áp dụng biện pháp khắc phục, ngăn chặn ngay khi phát hiện.</li>
                      <li>Thông báo cho cơ quan chuyên trách bảo vệ dữ liệu cá nhân và người dùng bị ảnh hưởng theo đúng thời hạn quy định tại <strong>Nghị định 13/2023/NĐ-CP</strong>.</li>
                      <li>Cung cấp hướng dẫn để bạn tự bảo vệ quyền lợi (ví dụ đổi mật khẩu) khi cần thiết.</li>
                    </ul>
                  </section>

                  {/* Section B7 */}
                  <section id="d7" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">7. Trách nhiệm của người dùng khi cung cấp dữ liệu</h3>
                    <p className="mt-3 leading-7">Khi tải CV hoặc nhập mô tả công việc lên hệ thống, bạn cam kết:</p>
                    <ul className="mt-2 list-disc space-y-2 pl-6 leading-7 text-slate-600">
                      <li>Dữ liệu cung cấp là dữ liệu của chính bạn hoặc bạn có quyền hợp pháp để cung cấp.</li>
                      <li>Không tải lên CV chứa dữ liệu cá nhân của người khác mà chưa có sự đồng ý của họ.</li>
                      <li>Không tải lên nội dung vi phạm pháp luật, xâm phạm quyền của bên thứ ba.</li>
                      <li>Tự chịu trách nhiệm về tính chính xác của thông tin trong CV khi sử dụng để ứng tuyển thực tế.</li>
                    </ul>
                  </section>

                  {/* Section B8 */}
                  <section id="d8" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">8. Thỏa thuận xử lý dữ liệu với bên thứ ba</h3>
                    <p className="mt-3 leading-7">
                      Đối với các bên xử lý dữ liệu thay mặt chúng tôi (nhà cung cấp AI, hạ tầng đám mây), SmartCV Advisor cam kết thiết lập thỏa thuận xử lý dữ liệu quy định rõ:
                    </p>
                    <ul className="mt-2 list-disc space-y-2 pl-6 leading-7 text-slate-600">
                      <li>Phạm vi, mục đích và thời hạn xử lý dữ liệu được ủy quyền.</li>
                      <li>Nghĩa vụ bảo mật tương đương hoặc cao hơn cam kết của SmartCV Advisor.</li>
                      <li>Nghĩa vụ hỗ trợ khi SmartCV Advisor cần thực hiện quyền của người dùng (ví dụ xóa dữ liệu).</li>
                      <li>Nghĩa vụ thông báo ngay khi phát hiện sự cố liên quan đến dữ liệu.</li>
                      <li><strong>Cấm sử dụng dữ liệu ngoài phạm vi được ủy quyền</strong>, bao gồm cấm dùng để huấn luyện mô hình AI nếu chưa có sự đồng ý riêng của người dùng.</li>
                    </ul>
                  </section>

                  {/* Section B9 */}
                  <section id="d9" className="scroll-mt-24 border-t border-slate-100 pt-8">
                    <h3 className="text-lg font-bold text-slate-900">9. Hiệu lực và sửa đổi</h3>
                    <p className="mt-3 leading-7">
                      Điều khoản xử lý dữ liệu này là một phần không tách rời của Chính sách quyền riêng tư và Điều khoản sử dụng dịch vụ SmartCV Advisor. Mọi sửa đổi sẽ được thông báo trước khi có hiệu lực theo cách thức nêu tại mục A.14.
                    </p>
                    <div className="mt-6 rounded-2xl border border-slate-300 bg-slate-100/70 p-5 text-xs italic leading-6 text-slate-600">
                      <p className="font-semibold text-slate-800">Ghi chú pháp lý nội bộ:</p>
                      Tài liệu này là bản dự thảo nội bộ, chưa phải văn bản pháp lý cuối cùng. Nhóm SmartCV Advisor cần bổ sung thông tin pháp nhân, xác định thời hạn lưu trữ cụ thể, và tham vấn chuyên gia pháp lý trước khi công bố chính thức cho người dùng.
                    </div>
                  </section>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ───────── FOOTER ───────── */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:px-6 md:flex-row lg:px-8">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">CV</span>
            <span className="font-semibold text-slate-700">SmartCV Advisor</span>
            <span>— Nhóm dự án SmartCV Advisor – Nhóm 9 (FIT HCMUS)</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleTabChange('privacy')}
              className={`hover:text-blue-600 ${activeTab === 'privacy' ? 'font-bold text-blue-600' : ''}`}
            >
              Chính sách quyền riêng tư
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => handleTabChange('data-policy')}
              className={`hover:text-blue-600 ${activeTab === 'data-policy' ? 'font-bold text-blue-600' : ''}`}
            >
              Điều khoản xử lý dữ liệu
            </button>
            <span>·</span>
            <Link to="/" className="hover:text-blue-600">
              Trang chủ
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
