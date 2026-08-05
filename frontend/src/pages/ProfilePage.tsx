import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChangeEvent, FormEvent } from 'react';
import type { UploadedCvSummary, UserProfile } from '../types';
import { apiService, getApiErrorMessage } from '../services/api';

type ProfileTab = 'personal' | 'privacy';

function formatDate(value: string | null | undefined) {
  if (!value) return 'Chưa có dữ liệu';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function getInitial(name: string) {
  return (name.trim()[0] || 'U').toUpperCase();
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    industryInterest: '',
    targetRole: '',
    currentLevel: '',
    avatarUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cvToDelete, setCvToDelete] = useState<UploadedCvSummary | null>(null);
  const [deletingCvId, setDeletingCvId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const accountBadge = useMemo(() => {
    if (!profile) return 'Gói Free';
    return profile.account_type === 'premium' ? 'Gói Premium' : 'Gói Free';
  }, [profile]);

  function applyLoadedProfile(nextProfile: UserProfile) {
    setProfile(nextProfile);
    setForm({
      fullName: nextProfile.full_name,
      email: nextProfile.email,
      industryInterest: nextProfile.industry_interest,
      targetRole: nextProfile.target_role,
      currentLevel: nextProfile.current_level,
      avatarUrl: nextProfile.avatar_url ?? '',
    });
  }

  async function loadProfile() {
    setLoading(true);
    setErrorMessage('');
    try {
      const result = await apiService.getProfile();
      applyLoadedProfile(result.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    apiService
      .getProfile()
      .then((result) => {
        if (!active) return;
        applyLoadedProfile(result.data);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(getApiErrorMessage(error));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Định dạng ảnh đại diện không hợp lệ.');
      return;
    }
    if (file.size > 700 * 1024) {
      setErrorMessage('Dung lượng ảnh đại diện quá lớn.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, avatarUrl: String(reader.result ?? '') }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage('');
    setErrorMessage('');
    try {
      const result = await apiService.updateProfile(form);
      setProfile(result.data);
      setEditing(false);
      setStatusMessage(result.meta.message);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCv() {
    if (!cvToDelete || deletingCvId) return;
    setDeletingCvId(cvToDelete.cv_id);
    setStatusMessage('');
    setErrorMessage('');
    try {
      const result = await apiService.deleteCv(cvToDelete.cv_id);
      setStatusMessage(result.meta.message);
      setCvToDelete(null);
      await loadProfile();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setDeletingCvId(null);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200" />
        <div className="mt-8 h-[420px] animate-pulse rounded-3xl bg-white shadow-sm" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-600">
          {errorMessage || 'Không thể tải hồ sơ cá nhân.'}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="text-3xl font-bold tracking-normal">Hồ sơ cá nhân</h1>

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex border-b border-slate-200">
          <button
            className={[
              'min-h-14 px-7 font-semibold transition',
              activeTab === 'personal' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800',
            ].join(' ')}
            type="button"
            onClick={() => setActiveTab('personal')}
          >
            Thông tin cá nhân
          </button>
          <button
            className={[
              'min-h-14 px-7 font-semibold transition',
              activeTab === 'privacy' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800',
            ].join(' ')}
            type="button"
            onClick={() => setActiveTab('privacy')}
          >
            Dữ liệu & Quyền riêng tư
          </button>
        </div>

        {statusMessage && (
          <div className="mx-7 mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {statusMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mx-7 mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="p-7">
            <div className="flex flex-col gap-5 border-b border-slate-100 pb-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                {form.avatarUrl ? (
                  <img alt="" className="h-20 w-20 rounded-full object-cover" src={form.avatarUrl} />
                ) : (
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-blue-100 text-3xl font-bold text-blue-600">
                    {getInitial(profile.full_name)}
                  </span>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                  <p className="mt-1 text-slate-500">{profile.email}</p>
                  <span className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-600">
                    {accountBadge}
                  </span>
                </div>
              </div>

              <button
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                type="button"
                onClick={() => setEditing(true)}
              >
                Chỉnh sửa thông tin
              </button>
            </div>

            <form className="mt-7" onSubmit={handleSave}>
              <div className="grid gap-6 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-medium text-slate-700">Họ và tên</span>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:text-slate-500"
                    disabled={!editing}
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block font-medium text-slate-700">Email</span>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 outline-none"
                    disabled
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block font-medium text-slate-700">Vị trí mục tiêu</span>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:text-slate-500"
                    disabled={!editing}
                    placeholder="Lập trình viên Frontend"
                    value={form.targetRole}
                    onChange={(event) => setForm((current) => ({ ...current, targetRole: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block font-medium text-slate-700">Trình độ hiện tại</span>
                  <select
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:text-slate-500"
                    disabled={!editing}
                    value={form.currentLevel}
                    onChange={(event) => setForm((current) => ({ ...current, currentLevel: event.target.value }))}
                  >
                    <option value="">Chưa chọn</option>
                    <option value="Student">Sinh viên</option>
                    <option value="Fresher">Mới bắt đầu</option>
                    <option value="Junior">Cấp độ cơ bản</option>
                    <option value="Mid-level">Cấp độ trung cấp</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block font-medium text-slate-700">Ngành nghề quan tâm</span>
                  <input
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:text-slate-500"
                    disabled={!editing}
                    placeholder="IT - Phần mềm"
                    value={form.industryInterest}
                    onChange={(event) => setForm((current) => ({ ...current, industryInterest: event.target.value }))}
                  />
                </label>
                <label className={['block', editing ? '' : 'opacity-60'].join(' ')}>
                  <span className="mb-2 block font-medium text-slate-700">Ảnh đại diện</span>
                  <input
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-600"
                    disabled={!editing}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>

              {editing && (
                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="h-12 rounded-2xl border border-slate-200 px-8 font-semibold text-slate-600 hover:border-slate-300"
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setForm({
                        fullName: profile.full_name,
                        email: profile.email,
                        industryInterest: profile.industry_interest,
                        targetRole: profile.target_role,
                        currentLevel: profile.current_level,
                        avatarUrl: profile.avatar_url ?? '',
                      });
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    className="h-12 rounded-2xl bg-blue-600 px-8 font-bold text-white hover:bg-blue-700 disabled:bg-blue-300"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="p-7">
            <div className="flex flex-col gap-3 rounded-3xl border border-blue-100 bg-blue-50 px-5 py-4 text-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">Cam kết bảo mật & Quyền riêng tư</p>
                <p className="text-sm text-slate-600">CV của bạn không được dùng để huấn luyện mô hình nếu chưa có sự đồng ý riêng của bạn.</p>
              </div>
              <Link
                to="/general-info"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-blue-600 shadow-sm transition hover:bg-blue-50"
              >
                <span>Xem chi tiết chính sách</span>
                <span>→</span>
              </Link>
            </div>

            <h2 className="mt-7 text-xl font-bold">Tệp CV đã tải lên</h2>
            <div className="mt-4 grid gap-3">
              {profile.uploaded_cvs.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-6 text-slate-500">
                  Bạn chưa tải CV nào lên hệ thống.
                </div>
              ) : (
                profile.uploaded_cvs.map((cv) => (
                  <div key={cv.cv_id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-800" title={cv.filename}>{cv.filename}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {formatDate(cv.uploaded_at)} · {cv.target_role_name ?? cv.target_role_id ?? 'Chưa chọn vị trí'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={deletingCvId === cv.cv_id}
                      onClick={() => {
                        setStatusMessage('');
                        setErrorMessage('');
                        setCvToDelete(cv);
                      }}
                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Xóa CV
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        )}
      </section>

      {cvToDelete && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 px-4" role="presentation">
          <div
            aria-labelledby="profile-delete-cv-title"
            aria-describedby="profile-delete-cv-description"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <h2 id="profile-delete-cv-title" className="text-xl font-bold text-slate-900">Xóa CV này?</h2>
            <p id="profile-delete-cv-description" className="mt-3 leading-6 text-slate-500">
              CV <strong className="break-all text-slate-700">{cvToDelete.filename}</strong> cùng kết quả phân tích,
              gợi ý và phản hồi liên quan sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.
            </p>
            {errorMessage && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                {errorMessage}
              </div>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                className="h-12 rounded-2xl border border-slate-200 font-semibold text-slate-600 hover:border-slate-300"
                disabled={Boolean(deletingCvId)}
                type="button"
                onClick={() => setCvToDelete(null)}
              >
                Giữ lại
              </button>
              <button
                className="h-12 rounded-2xl bg-red-600 font-bold text-white hover:bg-red-700 disabled:bg-red-300"
                disabled={Boolean(deletingCvId)}
                type="button"
                onClick={() => void handleDeleteCv()}
              >
                {deletingCvId ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
