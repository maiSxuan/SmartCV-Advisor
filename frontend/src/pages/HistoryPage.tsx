import { useEffect, useState } from 'react';
import { apiService, getApiErrorMessage } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface HistoryItem {
  analysis_id: string;
  cv_id: string;
  cv_name: string;
  overall_score: number;
  classification?: string;
  role_name?: string;
  created_at: string;
  status: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<HistoryItem | null>(null);
  const [deletingCvId, setDeletingCvId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const result = await apiService.getHistory(50);
        setHistory(result.data || []);
      } catch (error) {
        console.error("Lỗi khi tải lịch sử:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(item => 
    item.cv_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function confirmDeleteCv() {
    if (!deleteCandidate || deletingCvId) return;
    setDeletingCvId(deleteCandidate.cv_id);
    setActionError('');
    setActionMessage('');
    try {
      const result = await apiService.deleteCv(deleteCandidate.cv_id);
      setHistory((current) => current.filter((item) => item.cv_id !== deleteCandidate.cv_id));
      setActionMessage(result.meta.message);
      setDeleteCandidate(null);
    } catch (error) {
      setActionError(getApiErrorMessage(error));
    } finally {
      setDeletingCvId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Lịch sử phân tích</h1>

      {actionMessage && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">
          {actionMessage}
        </div>
      )}
      {actionError && !deleteCandidate && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
          {actionError}
        </div>
      )}

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Tìm theo tên tệp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 rounded-2xl border border-slate-200 pl-4 pr-10 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 font-semibold tracking-wider">
                <th className="px-6 py-5 whitespace-nowrap">TÊN TỆP</th>
                <th className="px-6 py-5 whitespace-nowrap">VỊ TRÍ</th>
                <th className="px-6 py-5 whitespace-nowrap">ĐIỂM</th>
                <th className="px-6 py-5 whitespace-nowrap">XẾP LOẠI</th>
                <th className="px-6 py-5 whitespace-nowrap">NGÀY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Không tìm thấy kết quả phân tích nào.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const dateStr = new Date(item.created_at).toLocaleDateString('vi-VN');
                  
                  const isGood = item.overall_score >= 70;
                  const isAverage = item.overall_score >= 50 && item.overall_score < 70;
                  
                  const scoreColor = isGood ? 'text-blue-600' : isAverage ? 'text-orange-500' : 'text-red-500';
                  const classificationBg = isGood ? 'bg-blue-50 border-blue-200 text-blue-600' : isAverage ? 'bg-orange-50 border-orange-200 text-orange-500' : 'bg-red-50 border-red-200 text-red-500';
                  const classificationText = item.classification || (isGood ? 'Khá' : isAverage ? 'Trung bình' : 'Cần cải thiện');

                  return (
                    <tr key={item.analysis_id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700 truncate max-w-[200px]">{item.cv_name}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {item.role_name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xl font-bold ${scoreColor}`}>
                          {item.overall_score}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-bold ${classificationBg}`}>
                          {classificationText}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-between gap-5 text-slate-500">
                          <span>{dateStr}</span>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/analysis/${item.analysis_id}`)}
                              className="font-bold text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            >
                              Xem kết quả
                            </button>
                            <button
                              type="button"
                              aria-label={`Xóa CV ${item.cv_name}`}
                              disabled={deletingCvId === item.cv_id}
                              onClick={() => {
                                setActionError('');
                                setActionMessage('');
                                setDeleteCandidate(item);
                              }}
                              className="font-bold text-red-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Xóa CV
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteCandidate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4" role="presentation">
          <div
            aria-labelledby="delete-cv-title"
            aria-describedby="delete-cv-description"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <h2 id="delete-cv-title" className="text-xl font-bold text-slate-900">Xóa CV này?</h2>
            <p id="delete-cv-description" className="mt-3 text-sm leading-6 text-slate-600">
              CV <strong className="break-all text-slate-800">{deleteCandidate.cv_name}</strong> cùng kết quả phân tích,
              gợi ý và phản hồi liên quan sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.
            </p>
            {actionError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {actionError}
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={Boolean(deletingCvId)}
                onClick={() => {
                  setDeleteCandidate(null);
                  setActionError('');
                }}
                className="h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Giữ lại
              </button>
              <button
                type="button"
                disabled={Boolean(deletingCvId)}
                onClick={() => void confirmDeleteCv()}
                className="h-11 rounded-xl bg-red-600 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {deletingCvId ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
