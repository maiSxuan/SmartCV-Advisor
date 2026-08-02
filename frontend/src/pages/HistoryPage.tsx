import { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface HistoryItem {
  analysis_id: string;
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

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Lịch sử phân tích</h1>

      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Tìm theo tên file..." 
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
                <th className="px-6 py-5 whitespace-nowrap">TÊN FILE</th>
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
                        <div className="flex items-center justify-between gap-4 text-slate-500">
                          <span>{dateStr}</span>
                          <button
                            onClick={() => navigate(`/analysis/${item.analysis_id}`)}
                            className="font-bold text-blue-600 hover:underline"
                          >
                            Xem
                          </button>
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
    </div>
  );
}