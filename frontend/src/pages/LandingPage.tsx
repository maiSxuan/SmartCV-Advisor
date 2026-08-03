import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FreePricingCard, PremiumPricingCard } from '../components/PricingCards';
import { PREMIUM_PLANS, type PremiumCycle } from '../data/plans';
import { apiService } from '../services/api';
import type { ServicePlan } from '../services/api';


export default function LandingPage() {
  const navigate = useNavigate();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<PremiumCycle>('30');
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([]);
  const [servicePlansLoaded, setServicePlansLoaded] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void apiService.trackPublicAnalyticsEvent('landing_page_view').catch(() => undefined);
    void apiService.getPlans()
      .then((response) => {
        setServicePlans(response.data);
        setServicePlansLoaded(true);
        const availableCycles = (['30', '90'] as PremiumCycle[]).filter((cycle) =>
          response.data.some((plan) => plan.plan_id === `DV_PREMIUM_${cycle}`));
        setSelectedCycle((current) => availableCycles.includes(current) ? current : (availableCycles[0] ?? current));
      })
      .catch(() => undefined);
  }, []);

  const freePlan = servicePlans.find((plan) => plan.plan_id === 'DV_FREE');
  const premiumPlanFor = (cycle: PremiumCycle) => servicePlans.find((plan) => plan.plan_id === `DV_PREMIUM_${cycle}`);
  const premiumCycles = servicePlansLoaded
    ? (['30', '90'] as PremiumCycle[]).filter((cycle) => Boolean(premiumPlanFor(cycle)))
    : (['30', '90'] as PremiumCycle[]);
  const selectedPremiumPlan = premiumPlanFor(selectedCycle);

  const handleCtaClick = (messageVariant: string) => {
    void apiService.trackPublicAnalyticsEvent('cta_clicked', { message_variant: messageVariant }).catch(() => undefined);
    navigate('/register');
  };

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

            {/* Thông tin chung Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsInfoOpen(true)}
              onMouseLeave={() => setIsInfoOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 py-2 hover:text-blue-600 transition-colors"
                onClick={() => setIsInfoOpen((prev) => !prev)}
                aria-expanded={isInfoOpen}
              >
                <span>Thông tin chung</span>
              </button>

              {isInfoOpen && (
                <div className="absolute left-0 top-full z-50 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-slate-900/5">
                  <Link
                    to="/privacy-policy"
                    className="block rounded-xl p-2.5 transition hover:bg-blue-50"
                    onClick={() => setIsInfoOpen(false)}
                  >
                    <p className="text-xs font-bold text-slate-900">Chính sách quyền riêng tư</p>
                    <p className="text-[11px] text-slate-500">Phần A · 15 điều khoản</p>
                  </Link>
                  <Link
                    to="/data-policy"
                    className="block rounded-xl p-2.5 transition hover:bg-indigo-50"
                    onClick={() => setIsInfoOpen(false)}
                  >
                    <p className="text-xs font-bold text-slate-900">Điều khoản xử lý dữ liệu</p>
                    <p className="text-[11px] text-slate-500">Phần B · 9 điều khoản</p>
                  </Link>
                </div>
              )}
            </div>

            <Link to="/login" className="hover:text-blue-600 transition-colors">Đăng nhập</Link>
          </nav>

          {/* CTA button */}
          <button
            className="h-9 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md active:scale-95"
            type="button"
            onClick={() => handleCtaClick('header_free_analysis')}
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
              <span className="text-blue-600">
                cần sửa gì
              </span>{' '}
              trước khi ứng tuyển.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-500">
              Tải CV, nhận điểm đánh giá theo vị trí mục tiêu và xem các lỗi cần ưu tiên cải thiện.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <button
                className="inline-flex h-13 items-center rounded-2xl bg-blue-600 px-8 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
                type="button"
                onClick={() => handleCtaClick('hero_free_analysis')}
              >
                Phân tích CV miễn phí
              </button>
              <a
                href="#how-it-works"
                className="inline-flex h-13 items-center rounded-2xl border border-slate-200 bg-white px-7 text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                Xem cách hoạt động
              </a>
            </div>

            {/* Trust badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
              <Link to="/privacy-policy" className="hover:text-blue-600">
                Chính sách quyền riêng tư
              </Link>
              <span>·</span>
              <Link to="/data-policy" className="hover:text-blue-600">
                Điều khoản xử lý dữ liệu
              </Link>
              <span>·</span>
              <span>Miễn phí 3 lượt</span>
              <span>·</span>
              <span>Không cần thẻ tín dụng</span>
              <span>·</span>
              <span>Bảo mật dữ liệu</span>
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
                title: 'Tải CV',
                desc: 'Tải lên file PDF, DOC hoặc DOCX — hệ thống tự động xử lý và kiểm tra tính toàn vẹn của tài liệu.',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                step: '02',
                title: 'Nhận điểm và phát hiện lỗi',
                desc: 'Hệ thống AI chấm điểm CV theo 5 tiêu chí và chỉ ra các lỗi cần ưu tiên sửa trước, giúp bạn tiết kiệm thời gian.',
                color: 'bg-indigo-50 text-indigo-600',
              },
              {
                step: '03',
                title: 'Xem hướng cải thiện',
                desc: 'Nhận danh sách gợi ý cải thiện CV chi tiết, phù hợp với vị trí mục tiêu để tăng cơ hội được gọi phỏng vấn.',
                color: 'bg-emerald-50 text-emerald-600',
              },
            ].map((item) => (
              <div key={item.step} className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition hover:shadow-lg hover:-translate-y-1">
                <div className={`mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl font-bold ${item.color}`}>
                  {item.step}
                </div>
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
              },
              {
                label: 'Nội dung',
                desc: 'Chất lượng mô tả kinh nghiệm',
                color: 'bg-indigo-500',
              },
              {
                label: 'Từ khóa',
                desc: 'Keyword phù hợp với vị trí mục tiêu',
                color: 'bg-violet-500',
              },
              {
                label: 'Văn phong',
                desc: 'Ngôn ngữ chuyên nghiệp, súc tích',
                color: 'bg-sky-500',
              },
              {
                label: 'ATS',
                desc: 'Khả năng được đọc bởi phần mềm ATS',
                color: 'bg-emerald-500',
              },
            ].map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white ${c.color}`}>
                  {c.label.slice(0, 2).toUpperCase()}
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
            <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
              Dữ liệu của bạn được bảo vệ
            </h2>
            <p className="mx-auto mt-4 max-w-lg leading-relaxed text-slate-600">
              CV của bạn chứa thông tin cá nhân quan trọng. Chúng tôi cam kết xử lý có trách nhiệm,
              không dùng để huấn luyện mô hình khi chưa có sự đồng ý, và bạn có quyền xóa dữ liệu bất cứ lúc nào.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-semibold text-slate-600">
              {[
                'Mã hóa dữ liệu',
                'Không bán dữ liệu',
                'Quyền xóa dữ liệu',
              ].map((t) => (
                <span key={t} className="rounded-xl bg-white px-3 py-1.5 shadow-sm">
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
            {premiumCycles.length > 0 && (
            <div className="mt-6 inline-flex rounded-2xl bg-slate-200/70 p-1.5 shadow-inner shadow-slate-300/50" role="group" aria-label="Chọn thời hạn gói Premium">
              {premiumCycles.map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  aria-pressed={selectedCycle === cycle}
                  onClick={() => setSelectedCycle(cycle)}
                  className={`min-w-24 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
                    selectedCycle === cycle
                      ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-200'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {premiumPlanFor(cycle)?.duration_days
                    ? `${premiumPlanFor(cycle)?.duration_days} ngày`
                    : PREMIUM_PLANS[cycle].durationLabel}
                </button>
              ))}
            </div>
            )}
          </div>

          <div className="mx-auto grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
            {(!servicePlansLoaded || freePlan) && (
              <FreePricingCard plan={freePlan} actionLabel="Đăng ký miễn phí" onAction={() => handleCtaClick('pricing_free')} />
            )}
            {premiumCycles.length > 0 && (
              <PremiumPricingCard
                cycle={selectedCycle}
                plan={selectedPremiumPlan}
                recommended={selectedCycle === '90'}
                actionLabel={`Chọn ${selectedPremiumPlan?.name || PREMIUM_PLANS[selectedCycle].label}`}
                onAction={() => handleCtaClick(`pricing_premium_${selectedCycle}`)}
              />
            )}
          </div>
          {servicePlansLoaded && !freePlan && premiumCycles.length === 0 && (
            <p className="text-center text-sm text-slate-500">Hiện chưa có gói dịch vụ đang hoạt động.</p>
          )}
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
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs sm:gap-5 sm:text-sm">
            <button
              type="button"
              onClick={() => handleCtaClick('footer_free_analysis')}
              className="hover:text-blue-600 transition-colors"
            >
              Phân tích CV miễn phí
            </button>
            <span>·</span>
            <Link to="/login" className="hover:text-blue-600 transition-colors">Đăng nhập</Link>
            <span>·</span>
            <Link to="/register" className="hover:text-blue-600 transition-colors">Đăng ký</Link>
            <span>·</span>
            <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">Chính sách quyền riêng tư</Link>
            <span>·</span>
            <Link to="/data-policy" className="hover:text-blue-600 transition-colors">Điều khoản xử lý dữ liệu</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
