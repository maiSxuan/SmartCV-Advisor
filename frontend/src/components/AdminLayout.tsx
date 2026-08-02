import { Link, NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { apiService, clearAuthSession, getStoredAuthSession, getStoredAuthUser } from '../services/api';

const adminNavItems = [
  { label: 'Vị trí IT', path: '/admin/roles' },
  { label: 'Kỹ năng & Điểm số', path: '/admin/skills' },
  { label: 'Người dùng', path: '/admin/users' },
];

export default function AdminLayout({
  breadcrumb,
  title,
  actions,
  children,
}: {
  breadcrumb: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const user = getStoredAuthUser();
  const initial = (user?.full_name?.trim()[0] || 'A').toUpperCase();

  async function handleLogout() {
    const session = getStoredAuthSession();
    try {
      await apiService.logout(session?.refresh_token);
    } catch {
      // Local cleanup still completes the admin logout flow.
    } finally {
      clearAuthSession();
      navigate('/login');
    }
  }

  return (
    <div className="min-h-screen bg-[#eef3f8] text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-60 bg-[#111a2e] text-slate-300 lg:flex lg:flex-col">
        <Link to="/admin/roles" className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <span className="font-bold text-white">SmartCV Admin</span>
        </Link>

        <nav className="flex-1 space-y-3 px-3 py-5">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                [
                  'flex min-h-11 items-center rounded-xl px-3 text-sm font-medium transition',
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"
            type="button"
            onClick={handleLogout}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold text-slate-900">Bảng điều khiển quản trị</span>
            <span className="text-slate-300">›</span>
            <span className="text-slate-500">{breadcrumb}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">{initial}</span>
            <span className="text-sm font-semibold text-slate-700">Quản trị viên</span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
