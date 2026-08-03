import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import PasswordChecklist from '../components/PasswordChecklist';
import { apiService, getApiErrorMessage } from '../services/api';
import { isStrongPassword } from '../utils/password';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const formIsValid = useMemo(
    () => token.length > 0 && isStrongPassword(password) && password === passwordConfirmation,
    [password, passwordConfirmation, token],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    if (!formIsValid) {
      setErrorMessage('Vui lòng kiểm tra lại mật khẩu mới.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await apiService.resetPassword({ token, password, passwordConfirmation });
      setStatusMessage(result.data.message);
      window.setTimeout(() => navigate(`/login?email=${encodeURIComponent(email)}`), 900);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Tạo mật khẩu mới" subtitle="Mật khẩu mới cần đủ mạnh để bảo vệ dữ liệu CV của bạn">
      {!token && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block font-medium text-slate-700">Mật khẩu mới</span>
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
          <span className="mb-2 block font-medium text-slate-700">Xác nhận mật khẩu mới</span>
          <input
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            placeholder="••••••••"
            type={showPassword ? 'text' : 'password'}
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
          />
        </label>

        {statusMessage && (
          <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {statusMessage}
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
          {submitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link className="font-bold text-blue-600 hover:text-blue-700" to="/login">
          Quay lại đăng nhập
        </Link>
      </div>
    </AuthLayout>
  );
}
