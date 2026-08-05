import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { apiService, getApiErrorMessage } from '../services/api';
import type { AdminAnalyticsSummary, AnalyticsBreakdownItem } from '../services/api';

type FunnelKey = keyof AdminAnalyticsSummary['funnel'];
type DateRange = { from: string; to: string };

const funnelSteps: Array<{ key: FunnelKey; label: string; description: string }> = [
  { key: 'landing_page_views', label: 'Truy cập trang chủ', description: 'Lượt mở trang giới thiệu SmartCV.' },
  { key: 'registrations', label: 'Hoàn tất đăng ký', description: 'Lượt tạo tài khoản thành công.' },
  { key: 'cv_selections', label: 'Chọn CV', description: 'Người dùng duy nhất đã chọn CV để xử lý.' },
  { key: 'uploads_completed', label: 'Tải CV thành công', description: 'Lượt CV được hệ thống tiếp nhận thành công.' },
  { key: 'analyses_started', label: 'Bắt đầu phân tích', description: 'Lượt quy trình phân tích được khởi chạy.' },
  { key: 'analyses_completed', label: 'Hoàn thành phân tích', description: 'Lượt tạo kết quả phân tích thành công.' },
  { key: 'suggestions_viewed', label: 'Xem gợi ý cải thiện', description: 'Lượt mở phần gợi ý cải thiện CV.' },
];

const eventLabels: Record<string, string> = {
  landing_page_view: 'Truy cập trang chủ',
  landing_page_views: 'Truy cập trang chủ',
  registration: 'Hoàn tất đăng ký',
  registrations: 'Hoàn tất đăng ký',
  cv_selected: 'Chọn CV',
  cv_selections: 'Chọn CV',
  upload_completed: 'Tải CV thành công',
  uploads_completed: 'Tải CV thành công',
  analysis_started: 'Bắt đầu phân tích',
  analyses_started: 'Bắt đầu phân tích',
  analysis_completed: 'Hoàn thành phân tích',
  analyses_completed: 'Hoàn thành phân tích',
  suggestion_viewed: 'Xem gợi ý cải thiện',
  suggestions_viewed: 'Xem gợi ý cải thiện',
};

function formatNumber(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('vi-VN');
}

function formatPercent(value: number | null | undefined): string {
  const safeValue = Math.min(100, Math.max(0, Number(value ?? 0)));
  return `${safeValue.toFixed(1)}%`;
}

function itemName(item: AnalyticsBreakdownItem): string {
  return item.name || item._id || 'Không xác định';
}

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toApiDate(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`).toISOString();
}

function rangeLabel(range: DateRange): string {
  if (!range.from && !range.to) return 'Toàn bộ thời gian';
  const formatter = new Intl.DateTimeFormat('vi-VN');
  const from = range.from ? formatter.format(new Date(`${range.from}T00:00:00`)) : 'trước đây';
  const to = range.to ? formatter.format(new Date(`${range.to}T00:00:00`)) : 'hiện tại';
  return `${from} – ${to}`;
}

function InfoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 10.5v6M12 7.5h.01" />
    </svg>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
  progress,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'slate' | 'blue' | 'emerald' | 'amber';
  progress?: number;
}) {
  const tones = {
    slate: { border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600', bar: 'bg-slate-600' },
    blue: { border: 'border-blue-200', badge: 'bg-blue-50 text-blue-700', bar: 'bg-blue-600' },
    emerald: { border: 'border-emerald-200', badge: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-600' },
    amber: { border: 'border-amber-200', badge: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
  }[tone];

  return (
    <article className={`flex min-h-52 flex-col rounded-2xl border bg-white p-5 shadow-sm ${tones.border}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-5 text-slate-700">{label}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tones.badge}`}>Chỉ số</span>
      </div>
      <p className="mt-5 text-4xl font-bold tracking-tight text-slate-950">{value}</p>
      {progress !== undefined && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`Mức chuyển đổi ${formatPercent(progress)}`}>
          <div className={`h-full rounded-full ${tones.bar}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      <p className="mt-auto pt-4 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function BreakdownCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: AnalyticsBreakdownItem[];
}) {
  const maximum = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{description}</p>
      {items.length ? (
        <ol className="mt-5 space-y-4">
          {items.map((item, index) => {
            const name = itemName(item);
            const width = Math.max(4, (item.count / maximum) * 100);
            return (
              <li key={`${name}-${index}`}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-slate-700" title={name}>{name}</span>
                  <span className="shrink-0 font-bold tabular-nums text-slate-950">{formatNumber(item.count)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`${name}: ${formatNumber(item.count)} lượt`}>
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${width}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Chưa có dữ liệu trong khoảng thời gian này.
        </div>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Đang tải dữ liệu thống kê</span>
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-slate-200" />)}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [draftRange, setDraftRange] = useState<DateRange>({ from: '', to: '' });
  const [activeRange, setActiveRange] = useState<DateRange>({ from: '', to: '' });

  const fetchAnalytics = useCallback(async (range: DateRange) => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getAdminAnalytics({
        date_from: toApiDate(range.from),
        date_to: toApiDate(range.to, true),
      });
      setData(response.data);
      setActiveRange(range);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAnalytics({ from: '', to: '' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAnalytics]);

  const funnelEntries = useMemo(() => funnelSteps.map((step) => ({
    ...step,
    value: data?.funnel?.[step.key] ?? 0,
  })), [data]);

  const maximumFunnelValue = Math.max(...funnelEntries.map((item) => item.value), 1);
  const topDropOff = useMemo(() => {
    const rows = data?.drop_off ?? [];
    return rows.reduce<(typeof rows)[number] | null>((highest, item) => (
      !highest || item.rate > highest.rate ? item : highest
    ), null);
  }, [data]);

  const applyRange = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draftRange.from && draftRange.to && draftRange.from > draftRange.to) {
      setFilterError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.');
      return;
    }
    setFilterError('');
    void fetchAnalytics(draftRange);
  };

  const applyPreset = (days: number | null) => {
    const range = days === null
      ? { from: '', to: '' }
      : (() => {
          const to = new Date();
          const from = new Date();
          from.setDate(from.getDate() - days + 1);
          return { from: dateInputValue(from), to: dateInputValue(to) };
        })();
    setDraftRange(range);
    setFilterError('');
    void fetchAnalytics(range);
  };

  return (
    <AdminLayout breadcrumb="Thống kê" title="Thống kê sử dụng & phễu chuyển đổi">
      <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-5">
        <div className="flex gap-3 text-blue-800">
          <InfoIcon />
          <div>
            <h2 className="font-bold text-slate-950">Màn hình này giúp Admin hiểu điều gì?</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
              Theo dõi hành trình từ lúc người dùng vào trang chủ đến khi nhận kết quả CV, nhận biết bước bị rời bỏ nhiều và đánh giá hiệu quả nâng cấp Premium.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={applyRange} className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Lọc thống kê theo thời gian">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Khoảng thời gian đang xem</p>
            <p className="mt-1 text-sm text-blue-700">{rangeLabel(activeRange)}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1" aria-label="Chọn nhanh khoảng thời gian">
              {[{ label: '7 ngày', days: 7 }, { label: '30 ngày', days: 30 }, { label: '90 ngày', days: 90 }].map((preset) => (
                <button key={preset.days} type="button" onClick={() => applyPreset(preset.days)} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="text-xs font-semibold text-slate-600">
              Từ ngày
              <input type="date" value={draftRange.from} max={draftRange.to || undefined} onChange={(event) => setDraftRange((current) => ({ ...current, from: event.target.value }))} className="mt-1 block min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Đến ngày
              <input type="date" value={draftRange.to} min={draftRange.from || undefined} onChange={(event) => setDraftRange((current) => ({ ...current, to: event.target.value }))} className="mt-1 block min-h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </label>
            <button type="submit" disabled={loading} className="min-h-10 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-wait disabled:bg-blue-300">
              Áp dụng
            </button>
            <button type="button" disabled={loading} onClick={() => applyPreset(null)} className="min-h-10 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
              Xem tất cả
            </button>
          </div>
        </div>
        {filterError && <p className="mt-3 text-sm font-medium text-red-600" role="alert">{filterError}</p>}
      </form>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6" role="alert">
          <p className="font-bold text-red-800">Không thể tải dữ liệu thống kê</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => void fetchAnalytics(activeRange)} className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">Thử lại</button>
        </div>
      ) : data ? (
        <div className="space-y-8">
          <section aria-labelledby="overview-heading">
            <div id="overview-heading"><SectionHeading title="Tổng quan nhanh" description="Bốn chỉ số quan trọng nhất để đánh giá mức sử dụng, khả năng tạo giá trị và mức hài lòng." /></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Tổng lượt hoàn tất đăng ký"
                value={formatNumber(data.funnel.registrations)}
                detail="Số sự kiện tạo tài khoản thành công trong khoảng thời gian đã chọn."
                tone="slate"
              />
              <MetricCard
                label="Tỷ lệ hoàn thành phân tích CV trên tổng lượt đăng ký"
                value={formatPercent(data.conversion.registration_to_analysis)}
                detail={`${formatNumber(data.funnel.analyses_completed)} lượt hoàn thành phân tích / ${formatNumber(data.conversion.registered_count)} lượt đăng ký`}
                tone="blue"
                progress={data.conversion.registration_to_analysis}
              />
              <MetricCard
                label="Tỷ lệ nâng cấp Premium trên tổng lượt đăng ký"
                value={formatPercent(data.conversion.registered_to_premium)}
                detail={`${formatNumber(data.conversion.premium_count)} lượt nâng cấp Premium / ${formatNumber(data.conversion.registered_count)} lượt đăng ký`}
                tone="emerald"
                progress={data.conversion.registered_to_premium}
              />
              <MetricCard
                label="Điểm hài lòng trung bình"
                value={`${Number(data.avg_rating ?? 0).toFixed(1)} / 5`}
                detail={`Tính từ ${formatNumber(data.feedback_count)} phản hồi của người dùng.`}
                tone="amber"
                progress={(Number(data.avg_rating ?? 0) / 5) * 100}
              />
            </div>
          </section>

          <section className={`rounded-2xl border p-5 ${topDropOff && topDropOff.rate > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`} aria-labelledby="attention-heading">
            <div className="flex gap-3">
              <InfoIcon />
              <div>
                <h2 id="attention-heading" className="font-bold text-slate-950">Điểm cần chú ý</h2>
                {topDropOff && topDropOff.rate > 0 ? (
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Mức giảm lớn nhất nằm giữa <strong>{eventLabels[topDropOff.from] ?? topDropOff.from}</strong> và <strong>{eventLabels[topDropOff.to] ?? topDropOff.to}</strong>: giảm {formatNumber(topDropOff.count)} lượt ({formatPercent(topDropOff.rate)}). Nên ưu tiên kiểm tra nội dung và trải nghiệm tại bước chuyển tiếp này.
                  </p>
                ) : (
                  <p className="mt-1 text-sm leading-6 text-slate-700">Chưa có mức giảm nào đủ dữ liệu để cảnh báo trong khoảng thời gian này.</p>
                )}
              </div>
            </div>
          </section>

          <section aria-labelledby="funnel-heading">
            <div id="funnel-heading"><SectionHeading title="Hành trình sử dụng sản phẩm" description="Mỗi hàng là một bước. Thanh dài hơn biểu thị số lượt lớn hơn trong cùng khoảng thời gian; riêng “Chọn CV” là số người dùng duy nhất." /></div>
            <ol className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {funnelEntries.map((item, index) => {
                const width = item.value > 0 ? Math.max(3, (item.value / maximumFunnelValue) * 100) : 0;
                return (
                  <li key={item.key} className="grid gap-4 border-b border-slate-100 p-4 last:border-b-0 md:grid-cols-[minmax(240px,0.9fr)_minmax(300px,1.4fr)] md:items-center">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-700" aria-hidden="true">{index + 1}</span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{item.label}</h3>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.description}</p>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex items-baseline justify-between gap-4">
                        <span className="text-xs font-medium text-slate-500">Số lượt ghi nhận</span>
                        <strong className="text-xl tabular-nums text-slate-950">{formatNumber(item.value)}</strong>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`${item.label}: ${formatNumber(item.value)}`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="dropoff-heading">
            <div id="dropoff-heading"><SectionHeading title="Mức giảm giữa từng bước" description="Cho biết tổng số giảm và tỷ lệ giảm khi so sánh hai bước liền nhau. Tỷ lệ cao là tín hiệu cần điều tra, không tự động đồng nghĩa với lỗi hệ thống." /></div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {data.drop_off.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <caption className="sr-only">Mức giảm số lượt giữa các bước trong hành trình sử dụng</caption>
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th scope="col" className="px-5 py-3">Bước trước</th>
                        <th scope="col" className="px-5 py-3">Bước tiếp theo</th>
                        <th scope="col" className="px-5 py-3 text-right">Số lượt giảm</th>
                        <th scope="col" className="px-5 py-3 text-right">Tỷ lệ giảm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.drop_off.map((item, index) => {
                        const isHighest = topDropOff === item && item.rate > 0;
                        return (
                          <tr key={`${item.from}-${item.to}-${index}`} className={isHighest ? 'bg-amber-50/70' : ''}>
                            <td className="px-5 py-4 font-semibold text-slate-800">{eventLabels[item.from] ?? item.from}</td>
                            <td className="px-5 py-4 text-slate-600">{eventLabels[item.to] ?? item.to}</td>
                            <td className="px-5 py-4 text-right font-bold tabular-nums text-slate-900">{formatNumber(item.count)}</td>
                            <td className="px-5 py-4 text-right">
                              <span className={`inline-flex min-w-20 justify-center rounded-full px-3 py-1 font-bold ${isHighest ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>
                                {formatPercent(item.rate)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-8 text-center text-sm text-slate-500">Chưa đủ dữ liệu để tính mức giảm giữa các bước.</p>
              )}
            </div>
          </section>

          <section aria-labelledby="acquisition-heading">
            <div id="acquisition-heading"><SectionHeading title="Người dùng đến từ đâu?" description="Dùng nhóm thông tin này để so sánh kênh tiếp cận và nội dung marketing đang tạo ra nhiều tương tác." /></div>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <BreakdownCard title="Nguồn truy cập" description="Kênh đưa người dùng đến trang chủ, ví dụ Google hoặc mạng xã hội." items={data.acquisition.sources} />
              <BreakdownCard title="Chiến dịch marketing" description="Tên chiến dịch gắn với lượt truy cập trang chủ." items={data.acquisition.campaigns} />
              <BreakdownCard title="Biến thể thông điệp" description="Phiên bản nội dung gắn với lượt nhấn nút kêu gọi hành động." items={data.acquisition.message_variants} />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-label="Nhu cầu vai trò và mức độ hài lòng">
            <BreakdownCard title="Vai trò IT được quan tâm" description="Vai trò mục tiêu được ghi nhận khi người dùng bắt đầu phân tích CV." items={data.role_choices} />
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-950">Mức độ hài lòng</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Điểm trung bình từ phản hồi đã gửi trong khoảng thời gian đang xem.</p>
              <div className="mt-7 flex items-end gap-3">
                <strong className="text-6xl tracking-tight text-slate-950">{Number(data.avg_rating ?? 0).toFixed(1)}</strong>
                <span className="pb-2 text-lg font-semibold text-slate-400">/ 5 điểm</span>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`Điểm hài lòng ${Number(data.avg_rating ?? 0).toFixed(1)} trên 5`}>
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, Math.max(0, (Number(data.avg_rating ?? 0) / 5) * 100))}%` }} />
              </div>
              <p className="mt-4 text-sm text-slate-600"><strong className="text-slate-900">{formatNumber(data.feedback_count)}</strong> phản hồi được ghi nhận.</p>
            </article>
          </section>

          <details className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer list-none font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              Cách hiểu số liệu và giới hạn của báo cáo
              <span className="float-right text-blue-600 group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-600 md:grid-cols-3">
              <p><strong className="block text-slate-900">Số lượt không luôn là số người</strong>Phần lớn các bước đếm sự kiện. Một người có thể tạo nhiều lượt; riêng “Chọn CV” được đếm theo người dùng duy nhất.</p>
              <p><strong className="block text-slate-900">Tỷ lệ luôn từ 0% đến 100%</strong>Tỷ lệ chuyển đổi được giới hạn tối đa 100% để tránh kết quả vượt ngưỡng khi số sự kiện ở tử số lớn hơn lượt đăng ký.</p>
              <p><strong className="block text-slate-900">Không chứa nội dung CV</strong>Báo cáo sử dụng sự kiện sản phẩm và điểm phản hồi, không lấy nội dung CV thô hoặc thông tin cá nhân trích xuất từ CV.</p>
            </div>
          </details>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Chưa có dữ liệu thống kê.</div>
      )}
    </AdminLayout>
  );
}
