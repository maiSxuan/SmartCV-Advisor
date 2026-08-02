import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, Link } from 'react-router-dom';
import AdminCareerRolesPage from './pages/AdminCareerRolesPage';
import AdminSkillScoresPage from './pages/AdminSkillScoresPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AnalysisResultPage from './pages/AnalysisResultPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import GuidePage from './pages/GuidePage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';
import PlansPage from './pages/PlansPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LoginPage from './pages/LoginPage';
import UploadCvPage from './pages/UploadCvPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import DataPolicyPage from './pages/DataPolicyPage';
import GeneralInfoPage from './pages/GeneralInfoPage';
import { apiService, clearAuthSession, getStoredAuthSession, getStoredAuthUser } from './services/api';

const navigationItems = [
  { label: 'Tổng quan', path: '/', icon: 'grid' },
  { label: 'Phân tích CV', path: '/upload', icon: 'upload' },
  { label: 'Lịch sử phân tích', path: '/history', icon: 'clock' },
  { label: 'Gói dịch vụ', path: '/plans', icon: 'card' },
  { label: 'Hồ sơ cá nhân', path: '/profile', icon: 'user' },
  { label: 'Hướng dẫn', path: '/guide', icon: 'guide' },
];

function NavIcon({ icon }: { icon: string }) {
  if (icon === 'upload') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path d="M12 16V5m0 0 4 4m-4-4-4 4M5 16v3h14v-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === 'clock') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path d="M12 7v5l3 2M5 5v5h5M5.6 14a7 7 0 1 0 1.8-6.6L5 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === 'card') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path d="M4 7h16v10H4zM4 10h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === 'user') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === 'guide') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path d="M12 17h.01M12 13a3 3 0 1 0-3-3M5 4h14v16H5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number | null; limit: number | null; unlimited: boolean; current_plan_id?: string; expiry?: string | null } | null>(null);
  const storedUser = getStoredAuthUser();
  const displayName = storedUser?.full_name ?? 'Người dùng';
  const isPremium = quota?.unlimited === true;
  const displayPlan = isPremium ? 'Gói Premium' : 'Gói Free';
  const initial = (displayName.trim()[0] || 'T').toUpperCase();
  const isAnalysisFlow = location.pathname.startsWith('/upload') || location.pathname.startsWith('/analysis');
  const pageTitle = isAnalysisFlow
    ? 'Phân tích CV'
    : location.pathname === '/plans'
      ? 'Gói dịch vụ'
      : location.pathname === '/profile'
        ? 'Hồ sơ cá nhân'
        : location.pathname === '/guide'
          ? 'Hướng dẫn'
          : 'Tổng quan';

  // Refresh quota mỗi khi navigate sang trang mới
  useEffect(() => {
    if (storedUser) {
      apiService.getQuota()
        .then(res => setQuota(res.data))
        .catch(console.error);
    }
  }, [location.pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    const session = getStoredAuthSession();
    try {
      await apiService.logout(session?.refresh_token);
    } catch {
      // Local logout still clears sensitive browser state if the network request fails.
    } finally {
      clearAuthSession();
      setLoggingOut(false);
      setShowLogoutDialog(false);
      navigate('/login');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <Link to="/" className="flex h-20 items-center gap-3 border-b border-slate-200 px-7">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white">CV</span>
          <span className="text-xl font-bold">
            SmartCV <span className="text-blue-600">Advisor</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-2 px-4 py-6">
          {navigationItems.map((item) => {
            const active =
              item.path === '/upload'
                ? isAnalysisFlow
                : item.path === location.pathname;
            return (
              <Link
                key={`${item.label}-${item.path}`}
                to={item.path}
                className={[
                  'flex min-h-12 items-center gap-3 rounded-2xl px-4 font-medium transition',
                  active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
                ].join(' ')}
              >
                <NavIcon icon={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-4 border-t border-slate-200 p-4">
          {!isPremium ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 text-sm text-slate-500">
                Còn <span className="font-bold text-slate-900">{quota ? `${quota.remaining}/${quota.limit} lượt` : '... lượt'}</span> phân tích
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: quota?.limit ? `${(1 - (quota.remaining || 0) / quota.limit) * 100}%` : '0%' }} />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-blue-500 bg-blue-600 p-4 text-sm text-white shadow-sm">
              <p className="font-bold">Premium — Job Search Pass</p>
              <p className="mt-1 text-blue-100">
                {quota?.current_plan_id === 'DV_PREMIUM_90' ? '90 ngày' : '30 ngày'}
              </p>
            </div>
          )}
          <div className="flex items-center gap-3 px-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 font-bold text-blue-600">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-400">{displayPlan}</p>
            </div>
            <button
              aria-label="Đăng xuất"
              className="rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              type="button"
              onClick={() => setShowLogoutDialog(true)}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
            {/* <Link to="/" className="hover:text-blue-600">
              Trang chủ
            </Link> */}
            {/* <span>/</span> */}
            <span className="text-slate-700">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-bold text-blue-600">{initial}</span>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/upload" element={<UploadCvPage />} />
          <Route path="/analysis/:id" element={<AnalysisResultPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/general-info" element={<GeneralInfoPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/data-policy" element={<DataPolicyPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<DataPolicyPage />} />
          <Route path="*" element={<UploadCvPage />} />
        </Routes>
      </div>

      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/35 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Bạn có chắc chắn muốn đăng xuất không?</h2>
            <p className="mt-3 leading-6 text-slate-500">
              Phiên làm việc hiện tại sẽ kết thúc và dữ liệu xác thực lưu trên trình duyệt sẽ được xóa.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                className="h-12 rounded-2xl border border-slate-200 font-semibold text-slate-600 hover:border-slate-300"
                type="button"
                onClick={() => setShowLogoutDialog(false)}
              >
                Hủy
              </button>
              <button
                className="h-12 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700 disabled:bg-blue-300"
                disabled={loggingOut}
                type="button"
                onClick={handleLogout}
              >
                {loggingOut ? 'Đang đăng xuất...' : 'Xác nhận đăng xuất'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const storedUser = getStoredAuthUser();
  const authPath = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ].includes(location.pathname);
  const isPolicyPath = [
    '/general-info',
    '/privacy-policy',
    '/data-policy',
    '/terms',
    '/privacy',
  ].includes(location.pathname);
  const adminPath = location.pathname.startsWith('/admin');

  if (isPolicyPath) {
    return (
      <Routes>
        <Route path="/general-info" element={<GeneralInfoPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/data-policy" element={<DataPolicyPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<DataPolicyPage />} />
      </Routes>
    );
  }

  if (authPath) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/general-info" element={<GeneralInfoPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/data-policy" element={<DataPolicyPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<DataPolicyPage />} />
      </Routes>
    );
  }

  if (storedUser?.role === 'admin' || adminPath) {
    if (storedUser?.role !== 'admin') {
      return (
        <Routes>
          <Route path="*" element={<Navigate replace to="/login" />} />
        </Routes>
      );
    }
    return (
      <Routes>
        <Route path="/admin/roles" element={<AdminCareerRolesPage />} />
        <Route path="/admin/skills" element={<AdminSkillScoresPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="*" element={<Navigate replace to="/admin/roles" />} />
      </Routes>
    );
  }

  // Guest (chưa đăng nhập): hiển thị Landing Page tại '/', redirect về '/' cho mọi route khác
  if (!storedUser) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/general-info" element={<GeneralInfoPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/data-policy" element={<DataPolicyPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<DataPolicyPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    );
  }

  return <AppShell />;
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
