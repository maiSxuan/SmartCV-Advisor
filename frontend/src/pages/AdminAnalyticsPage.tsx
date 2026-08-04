import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { apiService, getApiErrorMessage } from '../services/api';
import type { AdminAnalyticsSummary, AnalyticsBreakdownItem } from '../services/api';

const funnelLabels: Record<keyof AdminAnalyticsSummary['funnel'], string> = {
  landing_page_views: 'Truy cập Landing Page',
  registrations: 'Đăng ký',
  cv_selections: 'Chọn CV',
  uploads_completed: 'Upload thành công',
  analyses_started: 'Bắt đầu phân tích',
  analyses_completed: 'Hoàn thành phân tích',
  suggestions_viewed: 'Xem gợi ý',
  reanalyses: 'Phân tích lại',
};

const eventLabels: Record<string, string> = {
  landing_page_view: 'Landing Page',
  landing_page_views: 'Landing Page',
  registration: 'Đăng ký',
  registrations: 'Đăng ký',
  cv_selected: 'Chọn CV',
  cv_selections: 'Chọn CV',
  upload_completed: 'Upload thành công',
  uploads_completed: 'Upload thành công',
  analysis_started: 'Bắt đầu phân tích',
  analyses_started: 'Bắt đầu phân tích',
  analysis_completed: 'Hoàn thành phân tích',
  analyses_completed: 'Hoàn thành phân tích',
  suggestion_viewed: 'Xem gợi ý',
  suggestions_viewed: 'Xem gợi ý',
};

function formatPercent(value: number | null | undefined): string {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function itemName(item: AnalyticsBreakdownItem): string {
  return item.name || item._id || 'Không xác định';
}

function BreakdownList({ title, items }: { title: string; items: AnalyticsBreakdownItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      {items.length ? (
        <ul className="mt-4 space-y-2 text-sm">
          {items.map((item, index) => (
            <li key={`${itemName(item)}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-slate-600">
              <span className="truncate pr-3">{itemName(item)}</span>
              <span className="font-semibold text-slate-900">{item.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-400">Chưa có dữ liệu.</p>
      )}
    </section>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiService.getAdminAnalytics();
        setData(response.data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const funnelEntries = data
    ? (Object.keys(funnelLabels) as Array<keyof AdminAnalyticsSummary['funnel']>).map((key) => ({
        key,
        label: funnelLabels[key],
        value: data.funnel?.[key] ?? 0,
      }))
    : [];

  return (
    <AdminLayout breadcrumb="Thống kê" title="Thống kê sử dụng & funnel">
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Đang tải thống kê...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Funnel MVP</h2>
                <p className="text-sm text-slate-500">Toàn bộ hành trình từ Landing Page đến phân tích lại.</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {funnelEntries.map((item, index) => (
                <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{index + 1}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-400">Sự kiện</span>
                  </div>
                  <p className="mt-4 text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{item.value.toLocaleString('vi-VN')}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Tỷ lệ rời bỏ từng bước</h2>
              {data.drop_off?.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <tr><th className="pb-3">Từ</th><th className="pb-3">Đến</th><th className="pb-3 text-right">Rời bỏ</th><th className="pb-3 text-right">Tỷ lệ</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {data.drop_off.map((item, index) => (
                        <tr key={`${item.from}-${item.to}-${index}`}>
                          <td className="py-3 font-medium text-slate-800">{eventLabels[item.from] ?? item.from}</td>
                          <td className="py-3">{eventLabels[item.to] ?? item.to}</td>
                          <td className="py-3 text-right font-semibold">{item.count}</td>
                          <td className="py-3 text-right font-semibold text-red-600">{formatPercent(item.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">Chưa đủ dữ liệu để tính tỷ lệ rời bỏ.</p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Chuyển đổi</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl bg-blue-50 p-4">
                  <p className="text-sm text-blue-700">Đăng ký → phân tích</p>
                  <p className="mt-2 text-3xl font-bold text-blue-700">{formatPercent(data.conversion?.registration_to_analysis)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">Registered → Premium</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700">{formatPercent(data.conversion?.registered_to_premium)}</p>
                  <p className="mt-2 text-xs text-emerald-700">{data.conversion?.premium_count ?? 0} Premium / {data.conversion?.registered_count ?? 0} Registered</p>
                </div>
              </div>
            </section>
          </div>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Nguồn truy cập & thông điệp</h2>
            <div className="grid gap-4 lg:grid-cols-3">
              <BreakdownList title="Nguồn truy cập" items={data.acquisition?.sources ?? []} />
              <BreakdownList title="Campaign" items={data.acquisition?.campaigns ?? []} />
              <BreakdownList title="Message variant" items={data.acquisition?.message_variants ?? []} />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Vai trò được chọn nhiều</h2>
              <div className="mt-4">
                <BreakdownList title="Vai trò mục tiêu" items={data.role_choices ?? []} />
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Mức độ hài lòng</h2>
              <p className="mt-4 text-5xl font-bold text-blue-600">{Number(data.avg_rating ?? 0).toFixed(1)}<span className="text-xl text-slate-400"> / 5</span></p>
              <p className="mt-3 text-sm text-slate-500">Tổng phản hồi: {data.feedback_count ?? 0}</p>
            </section>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Chưa có dữ liệu thống kê.</div>
      )}
    </AdminLayout>
  );
}
