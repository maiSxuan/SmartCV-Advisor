import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FreePricingCard, PremiumPricingCard } from '../components/PricingCards';
import { sectionScoreGuides } from '../constants/scoring';
import { formatPlanDuration, PREMIUM_PLANS, type PremiumCycle } from '../data/plans';
import { apiService, getStoredAuthUser } from '../services/api';
import type { ServicePlan } from '../services/api';

const analysisSteps = [
  {
    step: 'Bước 01',
    time: '~1 phút',
    title: 'Tải CV lên',
    description: 'Tải tệp CV ở định dạng PDF, DOC hoặc DOCX. Dung lượng tối đa 5 MB.',
    checks: [
      'Đảm bảo tệp không bị khóa hoặc mã hóa bằng mật khẩu.',
      'Ưu tiên định dạng PDF để đảm bảo hệ thống đọc đúng bố cục.',
      'Đọc và đồng ý chính sách xử lý dữ liệu trước khi tiếp tục.',
    ],
    tone: 'blue',
  },
  {
    step: 'Bước 02',
    time: '~30 giây',
    title: 'Chọn vị trí mục tiêu',
    description: 'Chọn vị trí IT bạn đang muốn ứng tuyển để hệ thống đồng bộ bộ tiêu chí phù hợp.',
    checks: [
      'Chọn đúng vị trí để nhận kết quả chính xác nhất.',
      'Bạn có thể phân tích lại với vị trí khác bằng cách tạo phân tích mới.',
      'Các vị trí hiện có: Frontend, Backend, Full-stack, Data Analyst, UI/UX, QA/QC.',
    ],
    tone: 'violet',
  },
  {
    step: 'Bước 03',
    time: '~30 giây',
    title: 'Hệ thống phân tích CV',
    description: 'Hệ thống đọc nội dung CV, nhận diện từng phần, chấm điểm và tổng hợp kết quả.',
    checks: [
      'Quá trình thường tối đa 30 giây',
      'Khi phân tích CV vui lòng không tắt trình duyệt hoặc chuyển tab',
      'Hệ thống phát hiện mâu thuẫn thời gian để hiển thị cảnh báo kiểm tra.',
      'Kết quả dựa trên tiêu chuẩn vị trí, không phải đánh giá tuyệt đối năng lực.',
    ],
    tone: 'purple',
  },
  {
    step: 'Bước 04',
    time: 'Tự do',
    title: 'Xem kết quả và gợi ý',
    description: 'Xem điểm tổng, điểm từng phần, danh sách lỗi ưu tiên và các gợi ý cải thiện cụ thể.',
    checks: [
      'Tập trung vào lỗi màu đỏ cần ưu tiên trước.',
      'Dùng thẻ gợi ý cải thiện để biết hành động cụ thể cần làm.',
      'Người dùng Premium xem được lộ trình cải thiện và gợi ý chuyên sâu.',
    ],
    tone: 'green',
  },
];

const cvCriteria = [
  {
    title: 'Bố cục',
    description: 'Cấu trúc CV có rõ ràng, dễ đọc, phân mục hợp lý và không lộn xộn không?',
    className: 'border-blue-100 bg-blue-50',
  },
  {
    title: 'Nội dung',
    description: 'Thông tin mô tả công việc, dự án, kỹ năng có cụ thể và có giá trị không?',
    className: 'border-indigo-100 bg-indigo-50',
  },
  {
    title: 'Từ khóa',
    description: 'CV có chứa các từ khóa quan trọng của vị trí mục tiêu để ATS nhận diện không?',
    className: 'border-amber-100 bg-amber-50',
  },
  {
    title: 'Văn phong',
    description: 'Cách viết có chuyên nghiệp, nhất quán, không dài dòng và bắt đầu bằng động từ không?',
    className: 'border-violet-100 bg-violet-50',
  },
  {
    title: 'ATS',
    description: 'CV có thể được đọc và phân tích bởi phần mềm tuyển dụng tự động không?',
    className: 'border-emerald-100 bg-emerald-50',
  },
];

const faqs = [
  {
    question: 'CV của tôi có được lưu lại không?',
    answer: 'CV được lưu trong tài khoản để bạn xem lại lịch sử phân tích. Bạn có thể xóa trực tiếp từng CV tại Hồ sơ cá nhân > Dữ liệu & Quyền riêng tư.',
  },
  {
    question: 'Điểm CV được tính như thế nào?',
    answer: 'Điểm tổng được tổng hợp từ 6 phần chính: giới thiệu, học vấn, kinh nghiệm, dự án, kỹ năng kỹ thuật và chứng chỉ.',
  },
  {
    question: 'Tôi có thể phân tích CV bao nhiêu lần?',
    answer: 'Số lượt phân tích phụ thuộc vào cấu hình gói hiện tại. Vui lòng xem phần so sánh gói phía trên hoặc trang Gói dịch vụ để biết thông tin mới nhất.',
  },
  {
    question: 'Kết quả phân tích có chính xác 100% không?',
    answer: 'Kết quả là công cụ tham khảo để cải thiện CV, không thay thế quyết định tuyển dụng hoặc đánh giá chuyên môn cuối cùng.',
  },
  {
    question: 'Tôi nên bắt đầu từ đâu sau khi xem kết quả?',
    answer: 'Ưu tiên lỗi nghiêm trọng, bổ sung bằng chứng kỹ năng trong phần dự án hoặc kinh nghiệm, sau đó rà lại bố cục và ATS.',
  },
];

function toneClass(tone: string) {
  return {
    blue: 'bg-blue-600',
    violet: 'bg-indigo-600',
    purple: 'bg-purple-600',
    green: 'bg-emerald-600',
  }[tone] ?? 'bg-blue-600';
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500">
      <path d="m5 10 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function GuidePage() {
  const navigate = useNavigate();
  const [selectedCycle, setSelectedCycle] = useState<PremiumCycle>('30');
  const [servicePlans, setServicePlans] = useState<ServicePlan[]>([]);
  const [servicePlansLoaded, setServicePlansLoaded] = useState(false);

  useEffect(() => {
    void apiService.getPlans()
      .then((response) => {
        setServicePlans(response.data);
        setServicePlansLoaded(true);
        const availableCycles = (['30', '90'] as PremiumCycle[]).filter((cycle) =>
          response.data.some((plan) => plan.plan_id === `DV_PREMIUM_${cycle}`));
        setSelectedCycle((current) => availableCycles.includes(current) ? current : (availableCycles[0] ?? current));
      })
      .catch(() => setServicePlansLoaded(true));
  }, []);

  const freePlan = servicePlans.find((plan) => plan.plan_id === 'DV_FREE');
  const premiumPlanFor = (cycle: PremiumCycle) => servicePlans.find((plan) => plan.plan_id === `DV_PREMIUM_${cycle}`);
  const premiumCycles = servicePlansLoaded
    ? (['30', '90'] as PremiumCycle[]).filter((cycle) => Boolean(premiumPlanFor(cycle)))
    : (['30', '90'] as PremiumCycle[]);
  const selectedPremiumPlan = premiumPlanFor(selectedCycle);
  const currentUser = getStoredAuthUser();
  const analysisPath = currentUser && currentUser.role !== 'admin'
    ? '/upload'
    : currentUser?.role === 'admin' ? '/admin/roles' : '/register';

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-sm">
        <div className="inline-flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-blue-100">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
              <path d="M12 8v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Hướng dẫn sử dụng
        </div>
        <h1 className="mt-6 max-w-3xl text-3xl font-extrabold tracking-normal">SmartCV Advisor hoạt động như thế nào?</h1>
        <p className="mt-3 max-w-3xl leading-7 text-blue-100">
          Chỉ cần 4 bước đơn giản để biết CV của bạn đang đạt bao nhiêu điểm, mắc lỗi gì và cần cải thiện gì trước khi ứng tuyển.
        </p>
        <Link
          to={analysisPath}
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-white px-5 font-bold text-blue-600 shadow-sm transition hover:bg-blue-50"
        >
          Bắt đầu phân tích CV
        </Link>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-slate-950">4 bước phân tích CV</h2>
        <div className="mt-5 space-y-4">
          {analysisSteps.map((item) => (
            <article key={item.step} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex gap-5">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white ${toneClass(item.tone)}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
                    <path d="M12 5v10m0-10 4 4m-4-4-4 4M5 16v3h14v-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <span>{item.step}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 normal-case tracking-normal text-slate-400">{item.time}</span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-slate-950">{item.title}</h3>
                  <p className="mt-2 leading-6 text-slate-500">{item.description}</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-500">
                    {item.checks.map((check) => (
                      <li key={check} className="flex gap-2">
                        <CheckIcon />
                        <span>{check}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-slate-950">5 tiêu chí đánh giá CV</h2>
        <p className="mt-2 leading-6 text-slate-500">Hệ thống chấm điểm CV theo nhiều tiêu chí, mỗi tiêu chí có trọng số riêng tùy vị trí mục tiêu.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {cvCriteria.map((criterion) => (
            <article key={criterion.title} className={`rounded-2xl border p-5 ${criterion.className}`}>
              <h3 className="font-bold text-slate-950">{criterion.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{criterion.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-slate-950">Tiêu chí tham chiếu cho 6 phần CV</h2>
        <p className="mt-2 leading-6 text-slate-500">Các mốc dưới đây là thang tham chiếu hệ thống dùng để chấm điểm từng phần trong CV.</p>
        <div className="mt-5 space-y-4">
          {sectionScoreGuides.map((guide) => (
            <details key={guide.section} className="group rounded-2xl border border-blue-100 bg-blue-50/70 p-5 open:bg-blue-50">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-blue-700">Tiêu chí đánh giá</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-950">{guide.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{guide.summary}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-blue-700">Tối đa {guide.maxScore}đ</span>
              </summary>
              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)]">
                <div>
                  <h4 className="font-bold text-blue-800">Thang chấm điểm</h4>
                  <ol className="mt-3 space-y-2 text-sm leading-6 text-blue-900">
                    {guide.criteria.map((criterion, index) => (
                      <li key={criterion} className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-blue-700">{index + 1}</span>
                        <span>{criterion}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h4 className="font-bold text-blue-800">Điểm thành phần</h4>
                  <div className="mt-3 space-y-3">
                    {guide.subScores.map((subScore) => (
                      <div key={subScore.label} className="rounded-xl bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-800">{subScore.label}</p>
                          <span className="shrink-0 text-sm font-bold text-blue-700">{subScore.maxScore}đ</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{subScore.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-slate-950">Phân biệt gói Free và Premium</h2>
        <p className="mt-2 leading-6 text-slate-500">
          Thông tin dưới đây được đồng bộ trực tiếp từ cấu hình gói dịch vụ hiện tại.
        </p>

        {premiumCycles.length > 0 && (
          <div className="mt-5 flex justify-center">
            <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 shadow-inner shadow-slate-200/60" role="group" aria-label="Chọn thời hạn gói Premium">
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
                  {formatPlanDuration(
                    premiumPlanFor(cycle)?.duration_days,
                    PREMIUM_PLANS[cycle].durationLabel,
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto mt-5 grid max-w-4xl items-stretch gap-6 md:grid-cols-2">
          {(!servicePlansLoaded || freePlan) && (
            <FreePricingCard
              plan={freePlan}
              actionLabel="Xem gói dịch vụ"
              onAction={() => navigate('/plans')}
            />
          )}
          {premiumCycles.length > 0 && (
            <PremiumPricingCard
              cycle={selectedCycle}
              plan={selectedPremiumPlan}
              recommended={selectedCycle === '90'}
              actionLabel="Xem gói Premium"
              onAction={() => navigate('/plans')}
            />
          )}
        </div>
        {servicePlansLoaded && !freePlan && premiumCycles.length === 0 && (
          <p className="mt-5 text-center text-sm text-slate-500">Hiện chưa có gói dịch vụ đang hoạt động.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-slate-950">Câu hỏi thường gặp</h2>
        <div className="mt-5 space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <summary className="cursor-pointer list-none font-semibold text-slate-700">{faq.question}</summary>
              <p className="mt-3 leading-6 text-slate-500">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-4 rounded-3xl bg-slate-950 p-7 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sẵn sàng phân tích CV?</h2>
          <p className="mt-2 text-slate-300">Tải CV lên và nhận kết quả trong vòng 30 giây.</p>
        </div>
        <Link to={analysisPath} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 font-bold text-white transition hover:bg-blue-500">
          Phân tích CV ngay
        </Link>
      </section>
    </main>
  );
}

export default GuidePage;
