import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { apiService, getApiErrorMessage } from '../services/api';
import type { AdminCareerRole, AdminSkillConfig } from '../types';

type SkillDraft = Pick<AdminSkillConfig, 'required_score' | 'weight' | 'importance' | 'criteria_description' | 'status' | 'skill_group'>;

const importanceOptions = [
  { value: 3, label: 'Kỹ năng cốt lõi' },
  { value: 2, label: 'Quan trọng' },
  { value: 1, label: 'Nên có' },
  { value: 0, label: 'Không tính điểm' },
];

function toDraft(skill: AdminSkillConfig): SkillDraft {
  return {
    required_score: skill.required_score,
    weight: skill.weight,
    importance: skill.importance,
    criteria_description: skill.criteria_description,
    status: skill.status,
    skill_group: skill.skill_group,
  };
}

function isDraftChanged(skill: AdminSkillConfig, draft: SkillDraft) {
  return (
    skill.required_score !== draft.required_score ||
    skill.weight !== draft.weight ||
    skill.importance !== draft.importance ||
    skill.criteria_description !== draft.criteria_description ||
    skill.status !== draft.status ||
    skill.skill_group !== draft.skill_group
  );
}

function StatusPill({ status }: { status: 'active' | 'inactive' }) {
  const active = status === 'active';
  return (
    <span
      className={[
        'inline-flex min-w-20 justify-center rounded-full border px-3 py-1 text-xs font-semibold',
        active ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-slate-50 text-slate-500',
      ].join(' ')}
    >
      {active ? 'Hoạt động' : 'Đã xóa'}
    </span>
  );
}

export default function AdminSkillScoresPage() {
  const [roles, setRoles] = useState<AdminCareerRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [skills, setSkills] = useState<AdminSkillConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SkillDraft>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [deleteSkill, setDeleteSkill] = useState<AdminSkillConfig | null>(null);
  const [addForm, setAddForm] = useState({
    skill_name: '',
    skill_group: '',
    required_score: 70,
    weight: 10,
    importance: 2,
    criteria_description: '',
  });
  const [bulkForm, setBulkForm] = useState({ required_score: '', weight: '', importance: '', status: '' });

  const selectedRole = roles.find((role) => role.role_id === selectedRoleId) ?? null;
  const activeDrafts = Object.values(drafts).filter((draft) => draft.status === 'active');
  const totalWeight = activeDrafts.reduce((sum, draft) => sum + Number(draft.weight || 0), 0);
  const changedIds = useMemo(
    () => skills.filter((skill) => drafts[skill.config_id] && isDraftChanged(skill, drafts[skill.config_id])).map((skill) => skill.config_id),
    [drafts, skills],
  );
  const allVisibleSelected = skills.length > 0 && skills.every((skill) => selectedIds.includes(skill.config_id));

  useEffect(() => {
    let active = true;
    async function loadRoles() {
      try {
        const result = await apiService.getAdminCareerRoles({ status: 'all' });
        if (!active) return;
        setRoles(result.data);
        setSelectedRoleId((current) => current || result.data[0]?.role_id || '');
      } catch (error) {
        if (active) setErrorMessage(getApiErrorMessage(error));
      }
    }
    void loadRoles();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedRoleId) return;
    let active = true;
    async function loadSkills() {
      setLoading(true);
      setErrorMessage('');
      try {
        const result = await apiService.getAdminRoleSkills(selectedRoleId);
        if (!active) return;
        setSkills(result.data);
        setDrafts(Object.fromEntries(result.data.map((skill) => [skill.config_id, toDraft(skill)])));
        setSelectedIds([]);
      } catch (error) {
        if (active) setErrorMessage(getApiErrorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadSkills();
    return () => {
      active = false;
    };
  }, [selectedRoleId]);

  async function reloadSkills() {
    if (!selectedRoleId) return;
    const result = await apiService.getAdminRoleSkills(selectedRoleId);
    setSkills(result.data);
    setDrafts(Object.fromEntries(result.data.map((skill) => [skill.config_id, toDraft(skill)])));
    setSelectedIds([]);
  }

  function updateDraft(configId: string, next: Partial<SkillDraft>) {
    setDrafts((current) => ({
      ...current,
      [configId]: {
        ...current[configId],
        ...next,
      },
    }));
  }

  function toggleSelected(configId: string) {
    setSelectedIds((current) => (current.includes(configId) ? current.filter((id) => id !== configId) : [...current, configId]));
  }

  async function saveInlineChanges() {
    if (!selectedRoleId || totalWeight > 100) return;
    setSaving(true);
    setErrorMessage('');
    try {
      for (const configId of changedIds) {
        await apiService.updateAdminRoleSkill(selectedRoleId, configId, drafts[configId]);
      }
      setToast('Cập nhật điểm số kỹ năng thành công.');
      await reloadSkills();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function addSkill() {
    if (!selectedRoleId) return;
    setSaving(true);
    setErrorMessage('');
    try {
      const result = await apiService.createAdminRoleSkill(selectedRoleId, addForm);
      setToast(result.meta.message);
      setAddModalOpen(false);
      setAddForm({ skill_name: '', skill_group: '', required_score: 70, weight: 10, importance: 2, criteria_description: '' });
      await reloadSkills();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function applyBulkUpdate() {
    if (!selectedRoleId) return;
    const payload: {
      config_ids: string[];
      required_score?: number;
      weight?: number;
      importance?: number;
      status?: 'active' | 'inactive';
    } = { config_ids: selectedIds };
    if (bulkForm.required_score.trim()) payload.required_score = Number(bulkForm.required_score);
    if (bulkForm.weight.trim()) payload.weight = Number(bulkForm.weight);
    if (bulkForm.importance.trim()) payload.importance = Number(bulkForm.importance);
    if (bulkForm.status === 'active' || bulkForm.status === 'inactive') payload.status = bulkForm.status;

    setSaving(true);
    setErrorMessage('');
    try {
      const result = await apiService.bulkUpdateAdminRoleSkills(selectedRoleId, payload);
      setToast(result.meta.message);
      setBulkModalOpen(false);
      setBulkForm({ required_score: '', weight: '', importance: '', status: '' });
      await reloadSkills();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteSkill() {
    if (!selectedRoleId || !deleteSkill) return;
    setSaving(true);
    try {
      const result = await apiService.updateAdminRoleSkill(selectedRoleId, deleteSkill.config_id, { status: 'inactive' });
      setToast(result.meta.message);
      setDeleteSkill(null);
      await reloadSkills();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout
      breadcrumb="Kỹ năng & Điểm số"
      title="Quản lý kỹ năng & điểm số"
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            className="h-11 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600 disabled:bg-orange-200"
            disabled={selectedIds.length === 0}
            type="button"
            onClick={() => setBulkModalOpen(true)}
          >
            Chỉnh sửa hàng loạt ({selectedIds.length})
          </button>
          <button className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700" type="button" onClick={() => setAddModalOpen(true)}>
            + Thêm kỹ năng
          </button>
        </div>
      }
    >
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            Vị trí IT:
            <select
              className="h-10 min-w-56 rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
            >
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <span className="text-sm text-slate-500">{skills.filter((skill) => drafts[skill.config_id]?.status === 'active').length} kỹ năng</span>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm font-semibold text-slate-500">
            <span>Tổng trọng số</span>
            <span className={totalWeight > 100 ? 'text-red-600' : 'text-green-600'}>{Math.round(totalWeight * 100) / 100}/100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={['h-full rounded-full', totalWeight > 100 ? 'bg-red-500' : 'bg-green-500'].join(' ')} style={{ width: `${Math.min(100, totalWeight)}%` }} />
          </div>
          {totalWeight > 100 && <p className="mt-3 text-sm font-semibold text-red-600">Tổng trọng số các kỹ năng không được vượt quá 100%.</p>}
        </div>
      </div>

      {toast && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{toast}</div>}
      {errorMessage && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{errorMessage}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="w-12 px-4 py-4">
                <input
                  aria-label="Chọn tất cả kỹ năng"
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => setSelectedIds(event.target.checked ? skills.map((skill) => skill.config_id) : [])}
                />
              </th>
              <th className="px-4 py-4">Tên kỹ năng</th>
              <th className="px-4 py-4">Nhóm kỹ năng</th>
              <th className="px-4 py-4">Điểm yêu cầu</th>
              <th className="px-4 py-4">Trọng số (%)</th>
              <th className="px-4 py-4">Mức độ quan trọng</th>
              <th className="px-4 py-4">Trạng thái</th>
              <th className="px-4 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                  Đang tải cấu hình kỹ năng...
                </td>
              </tr>
            )}
            {!loading && skills.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={8}>
                  Vị trí này chưa có kỹ năng nào.
                </td>
              </tr>
            )}
            {!loading &&
              skills.map((skill) => {
                const draft = drafts[skill.config_id] ?? toDraft(skill);
                return (
                  <tr key={skill.config_id} className={draft.status === 'inactive' ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50/70'}>
                    <td className="px-4 py-4">
                      <input aria-label={`Chọn ${skill.skill_name}`} type="checkbox" checked={selectedIds.includes(skill.config_id)} onChange={() => toggleSelected(skill.config_id)} />
                    </td>
                    <td className="px-4 py-4 font-bold text-slate-800">{skill.skill_name}</td>
                    <td className="px-4 py-4">
                      <input
                        className="h-9 w-32 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                        value={draft.skill_group}
                        onChange={(event) => updateDraft(skill.config_id, { skill_group: event.target.value })}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="h-9 w-24 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                        min={0}
                        max={100}
                        type="number"
                        value={draft.required_score}
                        onChange={(event) => updateDraft(skill.config_id, { required_score: Number(event.target.value) })}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <input
                        className="h-9 w-24 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                        min={0}
                        max={100}
                        type="number"
                        value={draft.weight}
                        onChange={(event) => updateDraft(skill.config_id, { weight: Number(event.target.value) })}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="h-9 w-40 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                        value={draft.importance}
                        onChange={(event) => updateDraft(skill.config_id, { importance: Number(event.target.value) as 0 | 1 | 2 | 3 })}
                      >
                        {importanceOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={draft.status} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="font-semibold text-red-500 hover:text-red-600" type="button" onClick={() => setDeleteSkill(skill)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button className="h-11 rounded-xl border border-slate-200 px-6 font-semibold text-slate-400" type="button" onClick={reloadSkills}>
          Hủy
        </button>
        <button
          className="h-11 rounded-xl bg-blue-600 px-6 font-bold text-white hover:bg-blue-700 disabled:bg-blue-300"
          disabled={changedIds.length === 0 || totalWeight > 100 || saving}
          type="button"
          onClick={saveInlineChanges}
        >
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>

      {addModalOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-bold">Thêm kỹ năng mới</h2>
              <button className="text-2xl text-slate-400 hover:text-slate-600" type="button" onClick={() => setAddModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Tên kỹ năng</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="Nhập tên kỹ năng..." value={addForm.skill_name} onChange={(event) => setAddForm((current) => ({ ...current, skill_name: event.target.value }))} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-600">Nhóm kỹ năng</span>
                  <input className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={addForm.skill_group} onChange={(event) => setAddForm((current) => ({ ...current, skill_group: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-600">Mức độ quan trọng</span>
                  <select className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={addForm.importance} onChange={(event) => setAddForm((current) => ({ ...current, importance: Number(event.target.value) }))}>
                    {importanceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-600">Điểm yêu cầu (0–100)</span>
                  <input className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" min={0} max={100} type="number" value={addForm.required_score} onChange={(event) => setAddForm((current) => ({ ...current, required_score: Number(event.target.value) }))} />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-600">Trọng số (%)</span>
                  <input className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" min={0} max={100} type="number" value={addForm.weight} onChange={(event) => setAddForm((current) => ({ ...current, weight: Number(event.target.value) }))} />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Mô tả tiêu chí đánh giá</span>
                <textarea className="min-h-20 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" value={addForm.criteria_description} onChange={(event) => setAddForm((current) => ({ ...current, criteria_description: event.target.value }))} />
              </label>
              {totalWeight + addForm.weight > 100 && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
                  Tổng trọng số sẽ vượt 100%. Bạn vẫn cần điều chỉnh trước khi lưu.
                </div>
              )}
            </div>
            <div className="grid gap-3 border-t border-slate-100 px-6 py-5 sm:grid-cols-2">
              <button className="h-11 rounded-xl border border-slate-200 font-semibold text-slate-600" type="button" onClick={() => setAddModalOpen(false)}>
                Hủy
              </button>
              <button className="h-11 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 disabled:bg-blue-300" disabled={saving || !addForm.skill_name.trim() || !addForm.skill_group.trim()} type="button" onClick={addSkill}>
                Thêm kỹ năng
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkModalOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-bold">Chỉnh sửa hàng loạt — {selectedIds.length} kỹ năng</h2>
              <button className="text-2xl text-slate-400 hover:text-slate-600" type="button" onClick={() => setBulkModalOpen(false)}>
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                Áp dụng thay đổi cho {selectedIds.length} kỹ năng đã chọn. Để trống các trường không muốn thay đổi.
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input className="h-11 rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" placeholder="Điểm yêu cầu mới" type="number" value={bulkForm.required_score} onChange={(event) => setBulkForm((current) => ({ ...current, required_score: event.target.value }))} />
                <input className="h-11 rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" placeholder="Trọng số mới (%)" type="number" value={bulkForm.weight} onChange={(event) => setBulkForm((current) => ({ ...current, weight: event.target.value }))} />
              </div>
              <select className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={bulkForm.importance} onChange={(event) => setBulkForm((current) => ({ ...current, importance: event.target.value }))}>
                <option value="">Mức độ quan trọng mới</option>
                {importanceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select className="h-11 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={bulkForm.status} onChange={(event) => setBulkForm((current) => ({ ...current, status: event.target.value }))}>
                <option value="">Trạng thái mới</option>
                <option value="active">Hoạt động</option>
                <option value="inactive">Đã xóa</option>
              </select>
            </div>
            <div className="grid gap-3 border-t border-slate-100 px-6 py-5 sm:grid-cols-2">
              <button className="h-11 rounded-xl border border-slate-200 font-semibold text-slate-600" type="button" onClick={() => setBulkModalOpen(false)}>
                Hủy
              </button>
              <button className="h-11 rounded-xl bg-orange-500 font-bold text-white hover:bg-orange-600 disabled:bg-orange-200" disabled={saving} type="button" onClick={applyBulkUpdate}>
                Áp dụng thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteSkill && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-bold">Xóa kỹ năng</h2>
            </div>
            <div className="px-6 py-6 text-slate-600">
              Bạn có chắc chắn muốn xóa kỹ năng <strong>{deleteSkill.skill_name}</strong> khỏi role {selectedRole?.name}? Thao tác này chỉ ngưng sử dụng kỹ năng cho các phân tích mới.
            </div>
            <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
              <button className="h-11 rounded-xl border border-slate-200 font-semibold text-slate-600" type="button" onClick={() => setDeleteSkill(null)}>
                Hủy
              </button>
              <button className="h-11 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600 disabled:bg-red-200" disabled={saving} type="button" onClick={confirmDeleteSkill}>
                Xóa kỹ năng
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
