import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { apiService, getApiErrorMessage } from '../services/api';
import type { AdminFeedbackItem, FeedbackStatus, FeedbackType } from '../services/api';

const feedbackTypes: Array<{ value: FeedbackType; label: string }> = [
  { value: 'loi_ky_thuat', label: 'Lỗi kỹ thuật' },
  { value: 'ket_qua_kho_hieu', label: 'Kết quả khó hiểu' },
  { value: 'goi_y_chua_cu_the', label: 'Gợi ý chưa cụ thể' },
  { value: 'nhan_xet_chua_chinh_xac', label: 'Nhận xét chưa chính xác' },
  { value: 'quyen_rieng_tu', label: 'Quyền riêng tư' },
  { value: 'gop_y_khac', label: 'Góp ý khác' },
];

const feedbackStatuses: Array<{ value: FeedbackStatus; label: string }> = [
  { value: 'Moi', label: 'Mới' },
  { value: 'DangXemXet', label: 'Đang xem xét' },
  { value: 'DaXuLy', label: 'Đã xử lý' },
  { value: 'KhongXuLy', label: 'Không xử lý' },
];

const feedbackQuestions: Array<{ key: keyof Pick<AdminFeedbackItem, 'CauHoi1' | 'CauHoi2' | 'CauHoi3' | 'CauHoi4' | 'CauHoi6'>; label: string }> = [
  { key: 'CauHoi1', label: 'Kết quả dễ hiểu' },
  { key: 'CauHoi2', label: 'Gợi ý đủ cụ thể' },
  { key: 'CauHoi3', label: 'Kết quả hữu ích' },
  { key: 'CauHoi4', label: 'Có nhận xét chưa chính xác' },
  { key: 'CauHoi6', label: 'Sẵn sàng giới thiệu' },
];

interface FeedbackDraft {
  feedback_type: FeedbackType;
  status: FeedbackStatus;
  note: string;
}

interface FeedbackFilters {
  feedback_type: '' | FeedbackType;
  status: '' | FeedbackStatus;
  rating: '' | '1' | '2' | '3' | '4' | '5';
  page: number;
  limit: number;
}

function booleanLabel(value: boolean | null | undefined): string {
  if (value === true) return 'Có';
  if (value === false) return 'Không';
  return '—';
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<AdminFeedbackItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FeedbackDraft>>({});
  const [filters, setFilters] = useState<FeedbackFilters>({ feedback_type: '', status: '', rating: '', page: 1, limit: 10 });
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, has_next: false });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getAdminFeedback({
        feedback_type: filters.feedback_type || undefined,
        status: filters.status || undefined,
        rating: filters.rating ? Number(filters.rating) : undefined,
        page: filters.page,
        limit: filters.limit,
      });
      setItems(response.data);
      setDrafts(Object.fromEntries(response.data.map((item) => [item._id, {
        feedback_type: item.LoaiPhanHoi,
        status: item.TrangThai,
        note: item.GhiChuNoiBo ?? '',
      }])));
      setMeta(response.meta ?? {
        total: response.data.length,
        page: filters.page,
        limit: filters.limit,
        has_next: response.data.length === filters.limit,
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const updateDraft = (feedbackId: string, patch: Partial<FeedbackDraft>) => {
    setDrafts((current) => ({
      ...current,
      [feedbackId]: { ...current[feedbackId], ...patch },
    }));
  };

  const saveFeedback = async (item: AdminFeedbackItem) => {
    const draft = drafts[item._id];
    if (!draft) return;

    const payload: Partial<{ feedback_type: FeedbackType; status: FeedbackStatus; note: string | null }> = {};
    if (draft.feedback_type !== item.LoaiPhanHoi) payload.feedback_type = draft.feedback_type;
    if (draft.status !== item.TrangThai) payload.status = draft.status;
    if (draft.note !== (item.GhiChuNoiBo ?? '')) payload.note = draft.note.trim() || null;

    if (Object.keys(payload).length === 0) {
      setNotice('Phản hồi này chưa có thay đổi cần lưu.');
      return;
    }

    setSavingId(item._id);
    setError('');
    setNotice('');
    try {
      await apiService.updateAdminFeedback(item._id, payload);
      setNotice(`Đã cập nhật phản hồi ${item._id}.`);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingId('');
    }
  };

  const setFilter = <K extends keyof FeedbackFilters>(key: K, value: FeedbackFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, ...(key === 'page' ? {} : { page: 1 }) }));
  };

  return (
    <AdminLayout breadcrumb="Phản hồi" title="Quản lý phản hồi & báo lỗi">
      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="text-sm font-medium text-slate-600">
          Loại phản hồi
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={filters.feedback_type} onChange={(event) => setFilter('feedback_type', event.target.value as FeedbackFilters['feedback_type'])}>
            <option value="">Tất cả</option>
            {feedbackTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-600">
          Trạng thái
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={filters.status} onChange={(event) => setFilter('status', event.target.value as FeedbackFilters['status'])}>
            <option value="">Tất cả</option>
            {feedbackStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-600">
          Điểm đánh giá
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={filters.rating} onChange={(event) => setFilter('rating', event.target.value as FeedbackFilters['rating'])}>
            <option value="">Tất cả</option>
            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-600">
          Số dòng
          <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={filters.limit} onChange={(event) => setFilter('limit', Number(event.target.value))}>
            {[10, 20, 50].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div>}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Đang tải phản hồi...</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Không có phản hồi phù hợp với bộ lọc.</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const draft = drafts[item._id];
            return (
              <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {feedbackTypes.find((option) => option.value === item.LoaiPhanHoi)?.label ?? item.LoaiPhanHoi}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(item.NgayTao)}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Khách hàng: <span className="font-medium text-slate-700">{item.MaKH}</span>
                      {' · '}
                      {item.MaKQ ? (
                        <Link className="font-semibold text-blue-600 hover:underline" to={`/admin/analysis/${item.MaKQ}`}>Xem analysis {item.MaKQ}</Link>
                      ) : 'Không gắn analysis'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-amber-600">Đánh giá: {item.DanhGia ?? '—'} / 5</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.BinhLuan || 'Không có bình luận.'}</p>

                    <details className="mt-4 rounded-xl bg-slate-50 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-700">Xem câu trả lời chi tiết</summary>
                      <dl className="mt-3 grid gap-3 md:grid-cols-2">
                        {feedbackQuestions.map((question) => (
                          <div key={question.key} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <dt className="text-xs text-slate-500">{question.label}</dt>
                            <dd className="mt-1 text-sm font-semibold text-slate-800">{booleanLabel(item[question.key])}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  </div>

                  {draft && (
                    <div className="w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 xl:w-96">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-semibold text-slate-500">
                          Phân loại
                          <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm" value={draft.feedback_type} onChange={(event) => updateDraft(item._id, { feedback_type: event.target.value as FeedbackType })}>
                            {feedbackTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-semibold text-slate-500">
                          Trạng thái
                          <select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm" value={draft.status} onChange={(event) => updateDraft(item._id, { status: event.target.value as FeedbackStatus })}>
                            {feedbackStatuses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>
                      </div>
                      <label className="block text-xs font-semibold text-slate-500">
                        Ghi chú nội bộ
                        <textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700" placeholder="Chỉ quản trị viên nhìn thấy ghi chú này" value={draft.note} onChange={(event) => updateDraft(item._id, { note: event.target.value })} />
                      </label>
                      <button type="button" disabled={savingId === item._id} onClick={() => void saveFeedback(item)} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-blue-300">
                        {savingId === item._id ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <span>Trang {meta.page} · {meta.total} phản hồi</span>
          <div className="flex gap-2">
            <button type="button" disabled={filters.page <= 1} onClick={() => setFilter('page', Math.max(1, filters.page - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Trước</button>
            <button type="button" disabled={!meta.has_next} onClick={() => setFilter('page', filters.page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40">Sau</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
