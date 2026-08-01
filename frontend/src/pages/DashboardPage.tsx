import { useEffect, useState } from 'react';
import { apiService, getStoredAuthUser } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface HistoryItem {
  analysis_id: string;
  cv_name: string;
  overall_score: number;
  created_at: string;
  status: string;
}

interface QuotaInfo {
  account_type: string;
  current_plan_id: string;
  unlimited: boolean;
  used: number | null;
  limit: number | null;
  remaining: number | null;
  label: string;
}

export default function DashboardPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const storedUser = getStoredAuthUser();
  const firstName = storedUser?.full_name?.split(' ').pop() || 'bạn';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyRes, quotaRes] = await Promise.all([
          apiService.getHistory(10),
          apiService.getQuota()
        ]);
        setHistory(historyRes.data || []);
        setQuota(quotaRes.data);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu tổng quan:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center mt-20 text-slate-500">Đang tải dữ liệu...</div>;

  const todayStr = new Date().toLocaleDateString('vi-VN');

  // Stats calculations
  const totalAnalyzed = quota?.used || 0;
  const maxScoreItem = history.length > 0 ? history.reduce((max, item) => item.overall_score > max.overall_score ? item : max, history[0]) : null;
  const lastAnalyzedDate = history.length > 0 ? new Date(history[0].created_at).toLocaleDateString('vi-VN') : 'Chưa có';
  const quotaExceeded = quota !== null && !quota.unlimited && (quota.remaining ?? 1) <= 0;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 pb-20">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Xin chào, {firstName} 👋</h1>
        <p className="text-slate-500">
          Hôm nay là {todayStr} — Bạn còn <span className="font-bold text-blue-600">{quota?.unlimited ? 'không giới hạn' : `${quota?.remaining}/${quota?.limit} lượt`}</span>
        </p>
      </div>

      {/* Blue Banner */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-3xl bg-blue-600 p-8 shadow-lg shadow-blue-600/20 text-white">
        <div>
          <h2 className="text-2xl font-bold mb-2">Phân tích CV mới</h2>
          <p className="text-blue-100">Tải CV lên để nhận điểm số và các gợi ý cải thiện ngay.</p>
        </div>
        <button
          onClick={() => !quotaExceeded && navigate('/upload')}
          disabled={quotaExceeded}
          title={quotaExceeded ? 'Bạn đã hết lượt phân tích. Nâng cấp Premium để tiếp tục.' : undefined}
          className={`mt-6 sm:mt-0 flex items-center gap-2 rounded-2xl px-6 py-3.5 font-bold transition active:scale-95 ${quotaExceeded
            ? 'bg-white/50 text-blue-300 cursor-not-allowed'
            : 'bg-white text-blue-600 hover:bg-slate-50'
            }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {quotaExceeded ? 'Hết lượt phân tích' : 'Tải CV lên'}
        </button>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {/* Card 1 */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900">{totalAnalyzed}</h3>
          <p className="mt-1 font-semibold text-slate-700">Lượt phân tích</p>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900">
            {quota?.unlimited ? '∞' : `${quota?.remaining}/${quota?.limit}`}
          </h3>
          <p className="mt-1 font-semibold text-slate-700">Lượt còn lại</p>
          <p className="text-sm text-slate-400">{quota?.account_type === 'premium' ? 'Gói Premium' : 'Gói Free'}</p>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900">{maxScoreItem?.overall_score || 0}</h3>
          <p className="mt-1 font-semibold text-slate-700">Điểm cao nhất</p>
          <p className="text-sm text-slate-400 truncate">Frontend Developer</p>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900">
            {lastAnalyzedDate === todayStr ? 'Hôm nay' : (lastAnalyzedDate.split('/')[0] || '-')}
          </h3>
          <p className="mt-1 font-semibold text-slate-700">Lần phân tích gần nhất</p>
          <p className="text-sm text-slate-400">{lastAnalyzedDate}</p>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Phân tích gần đây</h2>
          {/* We omit Xem tất cả if this page is essentially the history view */}
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="text-blue-600 font-medium hover:underline cursor-pointer text-sm"
          >
            Xem tất cả
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Bạn chưa có kết quả phân tích nào.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.slice(0, 3).map((item) => {
              const dateStr = new Date(item.created_at).toLocaleDateString('vi-VN');
              const isGood = item.overall_score >= 70;
              const isAverage = item.overall_score >= 50 && item.overall_score < 70;

              const scoreColor = isGood ? 'text-blue-600' : isAverage ? 'text-orange-500' : 'text-red-500';
              const scoreText = isGood ? 'Khá' : isAverage ? 'Trung bình' : 'Cần cải thiện';

              return (
                <div key={item.analysis_id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-500">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg truncate max-w-[200px] sm:max-w-xs">{item.cv_name}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">Frontend Developer · {dateStr}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className={`font-extrabold text-2xl ${scoreColor}`}>{item.overall_score}</p>
                      <p className="text-xs font-medium text-slate-400">{scoreText}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/analysis/${item.analysis_id}`)}
                      className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition"
                    >
                      Xem kết quả
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upgrade Banner for Free Users */}
      {quota?.account_type !== 'premium' && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-purple-50 rounded-3xl border border-purple-100 p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-purple-200 text-purple-600">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Nâng cấp Premium để mở khóa gợi ý chi tiết</h3>
              <p className="text-sm text-slate-500 mt-1">Câu mẫu viết lại, phân tích chuyên sâu và nhiều hơn nữa.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/plans')}
            className="w-full sm:w-auto whitespace-nowrap rounded-2xl bg-purple-600 px-6 py-3.5 font-bold text-white hover:bg-purple-700 transition"
          >
            Xem Premium
          </button>
        </div>
      )}
    </div>
  );
}