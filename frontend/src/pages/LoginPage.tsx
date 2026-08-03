import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { apiService, getApiErrorMessage, saveAuthSession } from '../services/api';

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const justRegistered = searchParams.get('registered') === '1';
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formIsValid = useMemo(() => isValidEmail(email) && password.length > 0, [email, password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    if (!formIsValid) {
      setErrorMessage('Vui lòng nhập email và mật khẩu hợp lệ.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await apiService.login({ email, password, rememberMe });
      saveAuthSession(result.data);
      navigate(result.data.user.role === 'admin' ? '/admin/roles' : '/upload');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Đăng nhập" subtitle="Chào mừng trở lại SmartCV Advisor">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block font-medium text-slate-700">Email</span>
          <input
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="email@example.com"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-2 flex items-center justify-between font-medium text-slate-700">
            Mật khẩu
            <Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" to="/forgot-password">
              Quên mật khẩu?
            </Link>
          </span>
          <div className="relative">
            <input
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-12 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="••••••••"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              className="absolute inset-y-0 right-3 text-xs font-semibold text-slate-400 hover:text-blue-600"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <input
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          Ghi nhớ đăng nhập
        </label>

        {justRegistered && !errorMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Đăng ký thành công. Bạn có thể đăng nhập ngay.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {errorMessage}
          </div>
        )}

        <button
          className="h-12 w-full rounded-2xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          disabled={!formIsValid || submitting}
          type="submit"
        >
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-slate-500">
        Chưa có tài khoản?
        <Link className="ml-1 font-bold text-blue-600 hover:text-blue-700" to="/register">
          Đăng ký ngay
        </Link>
      </div>
    </AuthLayout>
  );
}
