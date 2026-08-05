import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { apiService, getApiErrorMessage } from '../services/api';

type VerificationState = 'waiting' | 'verifying' | 'verified' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';
  const [state, setState] = useState<VerificationState>(token ? 'verifying' : 'waiting');
  const [message, setMessage] = useState(
    token ? 'Đang xác thực địa chỉ email...' : 'Liên kết xác thực đã được gửi đến email của bạn.',
  );
  const [resending, setResending] = useState(false);
  const verificationStarted = useRef(false);

  useEffect(() => {
    if (!token || verificationStarted.current) return;
    verificationStarted.current = true;
    void apiService.verifyEmail(token)
      .then((response) => {
        setState('verified');
        setMessage(response.data.message || 'Xác thực email thành công.');
      })
      .catch((error) => {
        setState('error');
        setMessage(getApiErrorMessage(error));
      });
  }, [token]);

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    try {
      const response = await apiService.resendVerification(email);
      setState('waiting');
      setMessage(response.data.message || 'Đã gửi lại liên kết xác thực. Vui lòng kiểm tra hộp thư.');
    } catch (error) {
      setState('error');
      setMessage(getApiErrorMessage(error));
    } finally {
      setResending(false);
    }
  }

  const success = state === 'waiting' || state === 'verified';

  return (
    <AuthLayout title="Xác thực email" subtitle="Hoàn tất xác thực để bảo vệ tài khoản SmartCV Advisor">
      <div
        className={`rounded-2xl border px-5 py-4 text-sm font-medium leading-6 ${
          success
            ? 'border-green-200 bg-green-50 text-green-700'
            : state === 'verifying'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-red-200 bg-red-50 text-red-700'
        }`}
      >
        {message}
      </div>

      {email && state !== 'verified' && (
        <div className="mt-5 text-center text-sm text-slate-500">
          <p>Chưa nhận được email? Kiểm tra thư rác hoặc gửi lại liên kết.</p>
          <button
            type="button"
            disabled={resending}
            onClick={handleResend}
            className="mt-3 font-bold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-blue-300"
          >
            {resending ? 'Đang gửi lại...' : 'Gửi lại email xác thực'}
          </button>
        </div>
      )}

      <Link
        className="mt-6 flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-5 font-bold text-white transition hover:bg-blue-700"
        to={`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`}
      >
        {state === 'verified' ? 'Đăng nhập ngay' : 'Quay lại đăng nhập'}
      </Link>
    </AuthLayout>
  );
}
