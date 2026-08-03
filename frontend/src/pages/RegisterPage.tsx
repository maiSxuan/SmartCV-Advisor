import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordChecklist from '../components/PasswordChecklist';
import { apiService, getApiErrorMessage } from '../services/api';
import { isStrongPassword } from '../utils/password';

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formIsValid = useMemo(
    () =>
      fullName.trim().length > 0 &&
      isValidEmail(email) &&
      isStrongPassword(password) &&
      password === passwordConfirmation &&
      termsAccepted,
    [email, fullName, password, passwordConfirmation, termsAccepted],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    if (!formIsValid) {
      setErrorMessage('Vui lòng kiểm tra lại thông tin đăng ký.');
      return;
    }

    try {
      setSubmitting(true);
      await apiService.register({
        fullName,
        email,
        password,
        passwordConfirmation,
        termsAccepted,
      });
      const search = new URLSearchParams({ email, registered: '1' });
      navigate(`/login?${search.toString()}`);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Tạo tài khoản SmartCV Advisor" subtitle="Phân tích CV miễn phí ngay hôm nay">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block font-medium text-slate-700">Họ và tên</span>
          <input
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="Nguyễn Văn A"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>

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
          <span className="mb-2 block font-medium text-slate-700">Mật khẩu</span>
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
          <PasswordChecklist password={password} />
        </label>

        <label className="block">
          <span className="mb-2 block font-medium text-slate-700">Xác nhận mật khẩu</span>
          <input
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="••••••••"
            type={showPassword ? 'text' : 'password'}
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
          {passwordConfirmation && password !== passwordConfirmation && (
            <p className="mt-2 text-sm font-medium text-red-600">Mật khẩu xác nhận không khớp.</p>
          )}
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
          />
          <span>
            Tôi đồng ý với{' '}
            <Link className="font-semibold text-blue-600 hover:text-blue-700 underline" to="/data-policy" target="_blank" rel="noopener noreferrer">
              Điều khoản xử lý dữ liệu
            </Link>{' '}
            và{' '}
            <Link className="font-semibold text-blue-600 hover:text-blue-700 underline" to="/privacy-policy" target="_blank" rel="noopener noreferrer">
              Chính sách quyền riêng tư
            </Link>
          </span>
        </label>

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
          {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center text-slate-500">
        Đã có tài khoản?
        <Link className="ml-1 font-bold text-blue-600 hover:text-blue-700" to="/login">
          Đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
}
