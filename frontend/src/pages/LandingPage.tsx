import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

const freeBenefits = [
  '3 lượt phân tích CV cho một chu kỳ tài khoản',
  'Điểm tổng quan và các tiêu chí đánh giá',
  'Điểm chi tiết theo từng phần CV',
  'Gợi ý cải thiện cơ bản',
  'Xem toàn bộ lịch sử phân tích',
];

const freeLimitations = [
  'Roadmap cải thiện sau đánh giá',
  'Gợi ý chuyên sâu',
];

const premiumBenefits = [
  'Không giới hạn lượt phân tích CV',
  'Roadmap cải thiện sau mỗi lần đánh giá',
  'Xem toàn bộ lịch sử phân tích',
  'Gợi ý cải thiện chi tiết và chuyên sâu',
];

const premiumComingSoon = [
  'Danh sách lỗi chi tiết',
  'Câu mẫu viết lại theo STAR',
  'Sao chép nhanh từng câu mẫu',
  'Nội dung viết lại nâng cao',
  'Matching Score với mô tả công việc',
  'AI Assistant hỗ trợ chỉnh sửa CV',
  'Tải xuống CV đã chỉnh sửa',
];

// Modal nhập email để Smart-route Guest → Register hoặc Login
function EmailCheckModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    try {
      setChecking(true);
      const result = await apiService.checkEmail(email.trim());
      const search = new URLSearchParams({ email: email.trim() });
      if (result.data.exists) {
        // Email đã có tài khoản → đăng nhập
        navigate(`/login?${search.toString()}`);
      } else {
        // Email chưa có → đăng ký
        navigate(`/register?${search.toString()}`);
      }
    } catch {
      // Nếu API lỗi, mặc định chuyển sang trang đăng ký
      const search = new URLSearchParams({ email: email.trim() });
      navigate(`/register?${search.toString()}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Bắt đầu miễn phí</h2>
            <p className="mt-1 text-sm text-slate-500">Nhập email để tiếp tục</p>
          </div>
          <button
            aria-label="Đóng"
            className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            type="button"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Địa chỉ email</span>
            <input
              autoFocus
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="email@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {error && (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            className="h-12 w-full rounded-2xl bg-blue-600 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={!isValidEmail(email) || checking}
            type="submit"
          >
            {checking ? 'Đang kiểm tra...' : 'Tiếp tục →'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Miễn phí · Không cần thẻ tín dụng · Bảo mật dữ liệu
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showEmailModal, setShowEmailModal] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ───────── HEADER ───────── */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm">
              CV
            </span>
            <span className="text-lg font-bold">
              SmartCV <span className="text-blue-600">Advisor</span>
            </span>
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">Cách hoạt động</a>
            <a href="#plans" className="hover:text-blue-600 transition-colors">Gói dịch vụ</a>
            <Link to="/login" className="hover:text-blue-600 transition-colors">Đăng nhập</Link>
          </nav>

          {/* CTA button */}
          <button
            className="h-9 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md active:scale-95"
            type="button"
            onClick={() => setShowEmailModal(true)}
          >
            Phân tích CV miễn phí
          </button>
        </div>
      </header>

      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-white py-20 md:py-28">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-[360px] w-[360px] rounded-full bg-indigo-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              AI-Powered CV Analysis
            </span>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              Biết CV của bạn{' '}
              <span className="relative text-blue-600">
                cần sửa gì
                <svg
                  className="absolute -bottom-1 left-0 w-full"
                  viewBox="0 0 200 8"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M2 6 C50 2, 150 2, 198 6" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>{' '}
              trước khi ứng tuyển.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-500">
              Tải CV, nhận điểm đánh giá theo vị trí mục tiêu và xem các lỗi cần ưu tiên cải thiện.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                className="group inline-flex h-13 items-center gap-2.5 rounded-2xl bg-blue-600 px-8 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
                type="button"
                onClick={() => setShowEmailModal(true)}
              >
                Phân tích CV miễn phí
                <svg viewBox="0 0 20 20" className="h-5 w-5 transition group-hover:translate-x-0.5" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </button>
              <a
                href="#how-it-works"
                className="inline-flex h-13 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                Xem cách hoạt động
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-green-500" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                Miễn phí 3 lượt
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-green-500" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                Không cần thẻ tín dụng
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-green-500" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                Bảo mật dữ liệu
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
              SmartCV Advisor giúp bạn làm gì?
            </h2>
            <p className="mt-3 text-slate-500">Ba bước đơn giản để có một CV chuyên nghiệp hơn</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 16V5m0 0 4 4m-4-4-4 4M5 16v3h14v-3" />
                  </svg>
                ),
                title: 'Tải CV',
                desc: 'Tải lên file PDF, DOC hoặc DOCX — hệ thống tự động xử lý và kiểm tra tính toàn vẹn của tài liệu.',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                step: '02',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2Zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z" />
                  </svg>
                ),
                title: 'Nhận điểm và phát hiện lỗi',
                desc: 'Hệ thống AI chấm điểm CV theo 5 tiêu chí và chỉ ra các lỗi cần ưu tiên sửa trước, giúp bạn tiết kiệm thời gian.',
                color: 'bg-indigo-50 text-indigo-600',
              },
              {
                step: '03',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />
                  </svg>
                ),
                title: 'Xem hướng cải thiện',
                desc: 'Nhận danh sách gợi ý cải thiện CV chi tiết, phù hợp với vị trí mục tiêu để tăng cơ hội được gọi phỏng vấn.',
                color: 'bg-emerald-50 text-emerald-600',
              },
            ].map((item) => (
              <div key={item.step} className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:shadow-lg hover:-translate-y-1">
                <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${item.color}`}>
                  {item.icon}
                </div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-300">{item.step}</p>
                <h3 className="mb-3 text-xl font-bold text-slate-900">{item.title}</h3>
                <p className="leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── 5 CRITERIA ───────── */}
      <section className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
              5 tiêu chí đánh giá CV
            </h2>
            <p className="mt-3 text-slate-500">Phân tích toàn diện từ bố cục đến khả năng được đọc bởi hệ thống ATS</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: 'Bố cục',
                desc: 'Cấu trúc, phần mục, độ rõ ràng',
                color: 'bg-blue-600',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18M9 21V9" />
                  </svg>
                ),
              },
              {
                label: 'Nội dung',
                desc: 'Chất lượng mô tả kinh nghiệm',
                color: 'bg-indigo-500',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M10 13h4M10 17h4M8 9h2" />
                  </svg>
                ),
              },
              {
                label: 'Từ khóa',
                desc: 'Keyword phù hợp với vị trí mục tiêu',
                color: 'bg-violet-500',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                ),
              },
              {
                label: 'Văn phong',
                desc: 'Ngôn ngữ chuyên nghiệp, súc tích',
                color: 'bg-sky-500',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M4 12h10M4 17h6" />
                  </svg>
                ),
              },
              {
                label: 'ATS',
                desc: 'Khả năng được đọc bởi phần mềm ATS',
                color: 'bg-emerald-500',
                icon: (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" />
                  </svg>
                ),
              },
            ].map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${c.color}`}>
                  {c.icon}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{c.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── PRIVACY ───────── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-5">
          <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
              Dữ liệu của bạn được bảo vệ
            </h2>
            <p className="mx-auto mt-4 max-w-lg leading-relaxed text-slate-600">
              CV của bạn chứa thông tin cá nhân quan trọng. Chúng tôi cam kết xử lý có trách nhiệm,
              không dùng để huấn luyện mô hình khi chưa có sự đồng ý, và bạn có quyền xóa dữ liệu bất cứ lúc nào.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-slate-600">
              {[
                'Mã hóa dữ liệu',
                'Không bán dữ liệu',
                'Quyền xóa dữ liệu',
              ].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-blue-500" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── PLANS PREVIEW ───────── */}
      <section id="plans" className="bg-slate-50 py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
              Bắt đầu miễn phí, nâng cấp khi cần
            </h2>
            <p className="mt-3 text-slate-500">Phiên bản Free đã đủ để bắt đầu cải thiện CV của bạn</p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {/* Free */}
            <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">Free</p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-slate-900">₫0</span>
              </div>
              <div className="mt-7 flex-1 space-y-6 text-sm text-slate-600">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Quyền lợi hiện có</p>
                  <ul className="mt-4 space-y-3">
                    {freeBenefits.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-slate-200 pt-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tính năng bị giới hạn</p>
                  <ul className="mt-4 space-y-3 text-slate-500">
                    {freeLimitations.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M16.5 10.5V7a4.5 4.5 0 0 0-9 0v3.5" />
                          <path d="M6.75 10.5h10.5A1.75 1.75 0 0 1 19 12.25v6A1.75 1.75 0 0 1 17.25 20H6.75A1.75 1.75 0 0 1 5 18.25v-6a1.75 1.75 0 0 1 1.75-1.75Z" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                className="mt-8 h-12 w-full rounded-2xl border border-blue-200 bg-blue-50 font-bold text-blue-600 transition hover:bg-blue-100"
                type="button"
                onClick={() => setShowEmailModal(true)}
              >
                Đăng ký miễn phí
              </button>
            </div>

            {/* Premium */}
            <div className="relative flex flex-col rounded-3xl border-2 border-blue-500 bg-white p-8 shadow-xl shadow-blue-100">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white shadow">
                Phổ biến nhất
              </span>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
                Premium — Job Search Pass
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-slate-900">₫199.000</span>
                <span className="text-slate-400">/30 ngày</span>
              </div>
              <div className="mt-7 flex-1 space-y-6 text-sm text-slate-600">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Quyền lợi hiện có</p>
                  <ul className="mt-4 space-y-3">
                    {premiumBenefits.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-slate-200 pt-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Sắp ra mắt</p>
                  <ul className="mt-4 space-y-3">
                    {premiumComingSoon.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-slate-400">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 8v4l3 3" />
                          <circle cx="12" cy="12" r="9" />
                        </svg>
                        <span className="flex-1">{f}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Sắp ra mắt</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                className="mt-8 h-12 w-full rounded-2xl bg-blue-600 font-bold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md"
                type="button"
                onClick={() => setShowEmailModal(true)}
              >
                Xem chi tiết Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="border-t border-slate-100 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-slate-400 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600 text-[10px] font-bold text-white">CV</span>
            <span className="font-semibold text-slate-600">SmartCV Advisor</span>
            <span>— "Elevate Your Career — Beyond Just a Resume."</span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="hover:text-blue-600 transition-colors"
            >
              Phân tích CV miễn phí
            </button>
            <span>·</span>
            <Link to="/login" className="hover:text-blue-600 transition-colors">Đăng nhập</Link>
            <span>·</span>
            <Link to="/register" className="hover:text-blue-600 transition-colors">Đăng ký</Link>
          </div>
        </div>
      </footer>

      {/* Email check modal */}
      {showEmailModal && <EmailCheckModal onClose={() => setShowEmailModal(false)} />}
    </div>
  );
}
