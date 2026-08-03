import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { apiService, getApiErrorMessage } from '../services/api';
import type { AdminPlan } from '../services/api';

function parseFeatureList(value: string): string[] {
  return value
    .split(/[;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    await Promise.resolve();
    try {
      setError('');
      const response = await apiService.getAdminPlans();
      setPlans(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const update = (id: string, field: keyof AdminPlan, value: string | number | null) => {
    setPlans((current) => current.map((plan) => plan._id === id ? { ...plan, [field]: value } : plan));
  };

  const save = async (plan: AdminPlan) => {
    try {
      setSaving(plan._id);
      setError('');
      await apiService.upsertAdminPlan({
        plan_id: plan._id,
        name: plan.TenGoi,
        price: Number(plan.Gia),
        duration_days: plan.HanSuDung === null ? null : Number(plan.HanSuDung),
        analysis_limit: Number(plan.SoLuotPhanTich),
        features: parseFeatureList(plan.QuyenLoi),
        coming_soon: parseFeatureList(plan.SapRaMat),
        status: plan.TrangThai,
      });
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving('');
    }
  };

  return (
    <AdminLayout breadcrumb="Gói dịch vụ" title="Quản lý cấu hình gói">
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Đang tải cấu hình...</div> : (
        <div className="grid gap-5 xl:grid-cols-2">
          {plans.map((plan) => (
            <section key={plan._id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between"><h2 className="font-semibold text-slate-900">{plan._id}</h2><select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={plan.TrangThai} onChange={(e) => update(plan._id, 'TrangThai', e.target.value)}><option value="active">Hoạt động</option><option value="inactive">Ngừng hoạt động</option></select></div>
              <label className="block text-sm text-slate-600">Tên gói<input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={plan.TenGoi} onChange={(e) => update(plan._id, 'TenGoi', e.target.value)} /></label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-sm text-slate-600">Giá<input type="number" min="0" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={plan.Gia} onChange={(e) => update(plan._id, 'Gia', Number(e.target.value))} /></label>
                <label className="text-sm text-slate-600">Thời hạn (ngày)<input type="number" min="0" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={plan.HanSuDung ?? ''} onChange={(e) => update(plan._id, 'HanSuDung', e.target.value === '' ? null : Number(e.target.value))} /></label>
                <label className="text-sm text-slate-600">Lượt phân tích<input type="number" min="-1" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={plan.SoLuotPhanTich} onChange={(e) => update(plan._id, 'SoLuotPhanTich', Number(e.target.value))} /></label>
              </div>
              <label className="block text-sm text-slate-600">Quyền lợi (phân cách bằng dấu ;)<textarea className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" value={plan.QuyenLoi} onChange={(e) => update(plan._id, 'QuyenLoi', e.target.value)} /></label>
              <label className="block text-sm text-slate-600">Tính năng sắp ra mắt (mỗi dòng hoặc phân cách bằng dấu ;)<textarea className="mt-1 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Ví dụ: AI Assistant; Matching Score với mô tả công việc" value={plan.SapRaMat} onChange={(e) => update(plan._id, 'SapRaMat', e.target.value)} /></label>
              <div className="flex items-center justify-between"><span className="text-xs text-slate-400">Cập nhật: {plan.NgayCapNhat ? new Date(plan.NgayCapNhat).toLocaleString('vi-VN') : '—'}</span><button type="button" disabled={saving === plan._id} onClick={() => void save(plan)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving === plan._id ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
            </section>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
