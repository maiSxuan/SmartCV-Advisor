import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { apiService, getApiErrorMessage } from '../services/api';
import type { AdminUserDetail, AdminUserSummary } from '../types';

type UserFilters = {
  search: string;
  accountType: 'all' | 'registered' | 'premium' | 'admin';
  status: 'all' | 'active' | 'locked';
  dateFrom: string;
  dateTo: string;
};

function formatDateTimeParts(value: string | null) {
  if (!value) return null;
  const dateTime = new Date(value);
  if (Number.isNaN(dateTime.getTime())) return null;
  return {
    date: dateTime.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    }),
    time: dateTime.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    }),
  };
}

function DateTimeValue({ value, align = 'left' }: { value: string | null; align?: 'left' | 'right' }) {
  const formatted = formatDateTimeParts(value);
  if (!formatted) return <span>—</span>;
  return (
    <span
      className={`inline-flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}
      title={`${formatted.date} ${formatted.time} (GMT+7)`}
    >
      <span className="font-medium text-slate-600">{formatted.date}</span>
      <span className="mt-0.5 text-xs text-slate-400">{formatted.time} GMT+7</span>
    </span>
  );
}

function accountLabel(value: string) {
  if (value === 'premium') return 'Premium';
  if (value === 'admin') return 'Quản trị viên';
  return 'Người dùng';
}

function AccountPill({ value }: { value: string }) {
  const className =
    value === 'premium'
      ? 'border-purple-200 bg-purple-50 text-purple-700'
      : value === 'admin'
        ? 'border-slate-200 bg-slate-100 text-slate-700'
        : 'border-blue-100 bg-blue-50 text-blue-700';
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>{accountLabel(value)}</span>;
}

function StatusPill({ status }: { status: 'active' | 'locked' }) {
  const active = status === 'active';
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${active ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
      {active ? 'Đang hoạt động' : 'Đã khóa'}
    </span>
  );
}

function dateParam(value: string, endOfDay = false) {
  if (!value) return undefined;
  const vietnamTime = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`);
  return vietnamTime.toISOString();
}

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<UserFilters>({ search: '', accountType: 'all', status: 'all', dateFrom: '', dateTo: '' });
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [lockUser, setLockUser] = useState<AdminUserDetail | null>(null);
  const [unlockUser, setUnlockUser] = useState<AdminUserDetail | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    async function loadUsers() {
      setLoading(true);
      setErrorMessage('');
      try {
        const result = await apiService.getAdminUsers({
          search: filters.search,
          account_type: filters.accountType,
          status: filters.status,
          date_from: dateParam(filters.dateFrom),
          date_to: dateParam(filters.dateTo, true),
          page,
          limit: 20,
        });
        if (!active) return;
        setUsers(result.data);
        setTotal(result.meta.total);
        setHasNext(result.meta.has_next);
      } catch (error) {
        if (active) setErrorMessage(getApiErrorMessage(error));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadUsers();
    return () => {
      active = false;
    };
  }, [filters, page]);

  async function reloadUsers() {
    const result = await apiService.getAdminUsers({
      search: filters.search,
      account_type: filters.accountType,
      status: filters.status,
      date_from: dateParam(filters.dateFrom),
      date_to: dateParam(filters.dateTo, true),
      page,
      limit: 20,
    });
    setUsers(result.data);
    setTotal(result.meta.total);
    setHasNext(result.meta.has_next);
  }

  async function openDetail(userId: string) {
    setErrorMessage('');
    try {
      const result = await apiService.getAdminUser(userId);
      setSelectedUser(result.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  async function confirmLock() {
    if (!lockUser) return;
    setSaving(true);
    try {
      const result = await apiService.lockAdminUser(lockUser.user_id, lockReason);
      setToast(result.meta.message);
      setLockUser(null);
      setLockReason('');
      await reloadUsers();
      await openDetail(lockUser.user_id);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmUnlock() {
    if (!unlockUser) return;
    setSaving(true);
    try {
      const result = await apiService.unlockAdminUser(unlockUser.user_id);
      setToast(result.meta.message);
      setUnlockUser(null);
      await reloadUsers();
      await openDetail(unlockUser.user_id);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout breadcrumb="Người dùng" title="Quản lý người dùng" actions={<span className="text-sm font-semibold text-slate-500">{total} người dùng</span>}>
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px]">
          <input
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            placeholder="Tìm theo họ tên hoặc email..."
            value={filters.search}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, search: event.target.value }));
            }}
          />
          <select
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-600 outline-none focus:border-blue-500"
            value={filters.accountType}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, accountType: event.target.value as UserFilters['accountType'] }));
            }}
          >
            <option value="all">Tất cả loại</option>
            <option value="registered">Người dùng</option>
            <option value="premium">Premium</option>
            <option value="admin">Quản trị viên</option>
          </select>
          <select
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-600 outline-none focus:border-blue-500"
            value={filters.status}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, status: event.target.value as UserFilters['status'] }));
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[160px_160px]">
          <input
            aria-label="Lọc từ ngày"
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, dateFrom: event.target.value }));
            }}
          />
          <input
            aria-label="Lọc đến ngày"
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-blue-500"
            type="date"
            value={filters.dateTo}
            onChange={(event) => {
              setPage(1);
              setFilters((current) => ({ ...current, dateTo: event.target.value }));
            }}
          />
        </div>
      </div>

      {toast && <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{toast}</div>}
      {errorMessage && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{errorMessage}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-4">Họ tên</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Loại tài khoản</th>
              <th className="px-5 py-4">Trạng thái</th>
              <th className="px-5 py-4">Ngày đăng ký</th>
              <th className="px-5 py-4">Đăng nhập gần nhất</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                  Đang tải danh sách người dùng...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-500" colSpan={6}>
                  Không tìm thấy người dùng phù hợp.
                </td>
              </tr>
            )}
            {!loading &&
              users.map((user) => (
                <tr key={user.user_id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => void openDetail(user.user_id)}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 font-bold text-blue-600">{user.full_name.trim()[0]?.toUpperCase() || 'U'}</span>
                      <span className="font-bold text-slate-800">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{user.email}</td>
                  <td className="px-5 py-4">
                    <AccountPill value={user.account_type} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill status={user.status} />
                  </td>
                  <td className="px-5 py-4"><DateTimeValue value={user.registered_at} /></td>
                  <td className="px-5 py-4"><DateTimeValue value={user.last_login_at} /></td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
          <span>
            Hiển thị {users.length}/{total} người dùng (tối đa 20/trang)
          </span>
          <div className="flex gap-2">
            <button className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:text-slate-300" disabled={page === 1} type="button" onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Trước
            </button>
            <button className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:text-slate-300" disabled={!hasNext} type="button" onClick={() => setPage((current) => current + 1)}>
              Sau
            </button>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40">
          <aside className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-bold">Chi tiết người dùng</h2>
              <button className="text-2xl text-slate-400 hover:text-slate-600" type="button" onClick={() => setSelectedUser(null)}>
                ×
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">{selectedUser.full_name.trim()[0]?.toUpperCase() || 'U'}</span>
                <div>
                  <h3 className="text-lg font-bold">{selectedUser.full_name}</h3>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  <div className="mt-2 flex gap-2">
                    <AccountPill value={selectedUser.account_type} />
                    <StatusPill status={selectedUser.status} />
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Số lượt phân tích</span>
                  <strong>{selectedUser.analysis_count} lượt</strong>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Ngày đăng ký</span>
                  <strong><DateTimeValue value={selectedUser.registered_at} align="right" /></strong>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Đăng nhập gần nhất</span>
                  <strong><DateTimeValue value={selectedUser.last_login_at} align="right" /></strong>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-500">Gói hiện tại</span>
                  <strong>{accountLabel(selectedUser.account_type)}</strong>
                </div>
                {selectedUser.lock_reason && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-red-700">
                    <strong>Lý do khóa:</strong> {selectedUser.lock_reason}
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 space-y-3 border-t border-slate-100 bg-white p-6">
              {selectedUser.status === 'locked' ? (
                <button className="h-11 w-full rounded-xl border border-green-200 bg-green-50 font-bold text-green-700 hover:bg-green-100" type="button" onClick={() => setUnlockUser(selectedUser)}>
                  Mở khóa tài khoản
                </button>
              ) : (
                <button className="h-11 w-full rounded-xl border border-red-200 bg-red-50 font-bold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50" disabled={selectedUser.role === 'admin'} type="button" onClick={() => setLockUser(selectedUser)}>
                  Khóa tài khoản
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {lockUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-bold">Khóa tài khoản</h2>
              <button className="text-2xl text-slate-400 hover:text-slate-600" type="button" onClick={() => setLockUser(null)}>
                ×
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                Bạn sắp khóa tài khoản của {lockUser.full_name}. Mọi phiên đăng nhập đang hoạt động sẽ bị kết thúc ngay lập tức.
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-600">Lý do khóa *</span>
                <textarea className="min-h-24 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" placeholder="Nhập lý do khóa tài khoản..." value={lockReason} onChange={(event) => setLockReason(event.target.value)} />
              </label>
            </div>
            <div className="grid gap-3 border-t border-slate-100 px-6 py-5 sm:grid-cols-2">
              <button className="h-11 rounded-xl border border-slate-200 font-semibold text-slate-600" type="button" onClick={() => setLockUser(null)}>
                Hủy
              </button>
              <button className="h-11 rounded-xl bg-red-500 font-bold text-white hover:bg-red-600 disabled:bg-red-200" disabled={saving || !lockReason.trim()} type="button" onClick={confirmLock}>
                Xác nhận khóa
              </button>
            </div>
          </div>
        </div>
      )}

      {unlockUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="text-xl font-bold">Mở khóa tài khoản</h2>
            </div>
            <div className="px-6 py-6 text-slate-600">
              Bạn có chắc chắn muốn mở khóa tài khoản của <strong>{unlockUser.full_name}</strong>?
            </div>
            <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
              <button className="h-11 rounded-xl border border-slate-200 font-semibold text-slate-600" type="button" onClick={() => setUnlockUser(null)}>
                Hủy
              </button>
              <button className="h-11 rounded-xl bg-green-600 font-bold text-white hover:bg-green-700 disabled:bg-green-200" disabled={saving} type="button" onClick={confirmUnlock}>
                Mở khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
