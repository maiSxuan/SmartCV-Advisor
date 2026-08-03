import { useState, useEffect, useRef } from 'react';
import { apiService, getApiErrorMessage } from '../services/api';

// ─────────────────────── Types ───────────────────────
type PlanAction = 'upgrade-30' | 'upgrade-90' | 'renew' | 'cancel' | null;
type PayStep = 'method' | 'details' | 'processing' | 'done';
type PayMethod = 'bank' | 'momo' | 'vnpay';

interface QuotaData {
  unlimited: boolean;
  current_plan_id: string;
  account_type: string;
  remaining: number | null;
  used: number;
  limit: number | null;
  label: string;
}

// ─────────────────────── Constants ───────────────────────
const PLAN_INFO: Record<string, { label: string; price: number; days: number }> = {
  'upgrade-30': { label: 'Premium 30 ngày', price: 199000, days: 30 },
  'upgrade-90': { label: 'Premium 90 ngày', price: 389000, days: 90 },
  'renew-30':   { label: 'Gia hạn Premium 30 ngày', price: 199000, days: 30 },
  'renew-90':   { label: 'Gia hạn Premium 90 ngày', price: 389000, days: 90 },
};

const METHODS: { id: PayMethod; name: string; desc: string }[] = [
  { id: 'bank',  name: 'Chuyển khoản ngân hàng', desc: 'Vietcombank / MB Bank / Techcombank' },
  { id: 'momo',  name: 'Ví MoMo',               desc: 'Quét mã QR hoặc nhập SĐT' },
  { id: 'vnpay', name: 'VNPay',                  desc: 'ATM nội địa / Thẻ quốc tế' },
];

const FAKE_BANK = {
  bank: 'Vietcombank',
  account: '1234 5678 9012 3456',
  owner: 'CONG TY TNHH SMARTCV',
  branch: 'Chi nhánh TP.HCM',
};

// ─────────────────────── Indicators ───────────────────────
const CheckIcon = ({ cls = 'bg-emerald-500' }: { cls?: string }) => (
  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cls}`} />
);
const ClockIcon = ({ cls = 'bg-slate-300' }: { cls?: string }) => (
  <span className={`h-2 w-2 shrink-0 rounded-full ${cls}`} />
);
const LockIcon = ({ cls = 'text-slate-400' }: { cls?: string }) => (
  <svg className={`h-5 w-5 shrink-0 ${cls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 10.5V7a4.5 4.5 0 00-9 0v3.5m-.75 0h10.5A1.75 1.75 0 0119 12.25v6A1.75 1.75 0 0117.25 20H6.75A1.75 1.75 0 015 18.25v-6a1.75 1.75 0 011.75-1.75z" />
  </svg>
);

// ─────────────────────── Payment Modal ───────────────────────
function PaymentModal({
  action,
  currentPlanId,
  onSuccess,
  onClose,
}: {
  action: PlanAction;
  currentPlanId: string;
  onSuccess: (msg: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<PayStep>('method');
  const [method, setMethod] = useState<PayMethod>('bank');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!action || action === 'cancel') return null;

  const renewCycle = currentPlanId === 'DV_PREMIUM_90' ? '90' : '30';
  const planKey = action === 'renew' ? `renew-${renewCycle}` : action;
  const info = PLAN_INFO[planKey] ?? PLAN_INFO['upgrade-30'];
  const priceStr = info.price.toLocaleString('vi-VN') + 'đ';

  const startProcessing = () => {
    setStep('processing');
    setProgress(0);
    let p = 0;
    timerRef.current = setInterval(() => {
      p += Math.random() * 18 + 6;
      if (p >= 100) {
        p = 100;
        clearInterval(timerRef.current!);
        // Gọi backend sau khi "processing" xong
        (async () => {
          try {
            if (action === 'upgrade-30') {
              await apiService.changePlan('DV_PREMIUM_30');
              onSuccess('Nâng cấp Premium 30 ngày thành công!');
            } else if (action === 'upgrade-90') {
              await apiService.changePlan('DV_PREMIUM_90');
              onSuccess('Nâng cấp Premium 90 ngày thành công!');
            } else if (action === 'renew') {
              const res = await apiService.renewPlan();
              onSuccess('Gia hạn thành công! Hạn mới: ' + new Date(res.data.new_expiry).toLocaleDateString('vi-VN'));
            }
            setStep('done');
          } catch (err) {
            setError(getApiErrorMessage(err));
            setStep('details');
          }
        })();
      }
      setProgress(Math.min(p, 100));
    }, 120);
  };

  const getPaymentDetails = () => {
    const ref = 'SCV' + Date.now().toString().slice(-8);
    if (method === 'bank') return (
      <div className="space-y-3 rounded-2xl bg-slate-50 p-5 text-sm">
        <div className="flex justify-between"><span className="text-slate-500">Ngân hàng</span><span className="font-bold text-slate-900">{FAKE_BANK.bank}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Số tài khoản</span>
          <span className="font-mono font-bold text-slate-900 tracking-wider">{FAKE_BANK.account}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Chủ tài khoản</span><span className="font-bold text-slate-900">{FAKE_BANK.owner}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Chi nhánh</span><span className="font-bold text-slate-900">{FAKE_BANK.branch}</span></div>
        <div className="mt-2 border-t border-slate-200 pt-3 flex justify-between">
          <span className="text-slate-500">Số tiền</span><span className="text-xl font-extrabold text-blue-600">{priceStr}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Nội dung CK</span>
          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">{ref} {info.label.toUpperCase()}</span></div>
      </div>
    );
    if (method === 'momo') return (
      <div className="space-y-3 text-sm">
        <div className="mx-auto h-32 w-full rounded-2xl bg-pink-50 border border-pink-200 flex flex-col items-center justify-center gap-1 p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-pink-700">Ví MoMo</span>
          <span className="text-sm font-semibold text-pink-900">Quét mã QR MoMo (mô phỏng)</span>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">SĐT MoMo</span><span className="font-bold text-slate-900">0901 234 567</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Số tiền</span><span className="font-extrabold text-pink-600">{priceStr}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Mô tả</span><span className="font-mono text-sm text-pink-800">{ref}</span></div>
        </div>
      </div>
    );
    // vnpay
    return (
      <div className="space-y-3 text-sm">
        <div className="mx-auto h-32 w-full rounded-2xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center gap-1 p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Cổng VNPay</span>
          <span className="text-sm font-semibold text-blue-900">Cổng thanh toán VNPay (mô phỏng)</span>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">Cổng thanh toán</span><span className="font-bold text-slate-900">VNPay</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Số tiền</span><span className="font-extrabold text-indigo-600">{priceStr}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Mã giao dịch</span><span className="font-mono text-sm text-indigo-800">{ref}</span></div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {step === 'method' ? 'Chọn phương thức' : step === 'details' ? 'Thông tin thanh toán' : step === 'processing' ? 'Đang xử lý' : 'Hoàn tất'}
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">{info.label}</h2>
          </div>
          {step !== 'processing' && (
            <button onClick={onClose} className="rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">Đóng</button>
          )}
        </div>

        <div className="px-6 py-5">
          {/* Step: method */}
          {step === 'method' && (
            <div className="space-y-4">
              {/* Order summary */}
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-500 mb-2">Đơn hàng</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{info.label}</span>
                  <span className="text-xl font-extrabold text-blue-600">{priceStr}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Hiệu lực {info.days} ngày kể từ ngày kích hoạt</p>
              </div>

              <p className="text-sm font-semibold text-slate-700">Chọn phương thức thanh toán</p>
              <div className="space-y-2">
                {METHODS.map(m => (
                  <button key={m.id} onClick={() => setMethod(m.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${method === m.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                    <div>
                      <p className="font-semibold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.desc}</p>
                    </div>
                    {method === m.id && <span className="text-xs font-bold text-blue-600">Đã chọn</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep('details')}
                className="mt-2 w-full rounded-2xl bg-blue-600 py-3.5 font-bold text-white transition hover:bg-blue-700 active:scale-95">
                Tiếp theo
              </button>
            </div>
          )}

          {/* Step: details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <button onClick={() => setStep('method')} className="text-blue-600 hover:underline">← Quay lại</button>
                <span>·</span>
                <span>{METHODS.find(m => m.id === method)?.name}</span>
              </div>
              {getPaymentDetails()}
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
              <button onClick={startProcessing}
                className="w-full rounded-2xl bg-emerald-600 py-3.5 font-bold text-white transition hover:bg-emerald-700 active:scale-95">
                Xác nhận đã thanh toán
              </button>
              <p className="text-center text-xs text-slate-400">Hệ thống sẽ xác minh và kích hoạt gói trong vài giây.</p>
            </div>
          )}

          {/* Step: processing */}
          {step === 'processing' && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="w-full">
                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Đang xử lý</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-600 transition-all duration-150" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <p className="text-center font-semibold text-slate-800">Đang xác minh thanh toán...</p>
              <p className="text-center text-sm text-slate-500">Vui lòng không đóng cửa sổ này.</p>
              <div className="w-full space-y-2 text-sm text-slate-500">
                {[
                  { label: 'Xác nhận giao dịch', done: progress >= 30 },
                  { label: 'Kích hoạt gói dịch vụ', done: progress >= 65 },
                  { label: 'Cập nhật tài khoản', done: progress >= 90 },
                ].map(s => (
                  <div key={s.label} className={`flex items-center gap-2 ${s.done ? 'text-emerald-600 font-medium' : ''}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <h3 className="text-xl font-bold text-slate-900">Thanh toán thành công!</h3>
              <p className="text-sm text-slate-500">Gói <strong>{info.label}</strong> đã được kích hoạt cho tài khoản của bạn.</p>
              <button onClick={onClose}
                className="mt-2 w-full rounded-2xl bg-blue-600 py-3.5 font-bold text-white transition hover:bg-blue-700">
                Về trang gói dịch vụ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Cancel Modal ───────────────────────
function CancelModal({ onConfirm, onCancel, loading, error }: {
  onConfirm: () => void; onCancel: () => void; loading: boolean; error: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Hủy gói Premium</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Tài khoản sẽ về gói <strong>Free</strong> ngay lập tức. Bạn sẽ bị giới hạn còn 3 lượt phân tích tổng cộng.
          Hành động này không thể hoàn tác.
        </p>
        {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 rounded-2xl border border-slate-200 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50">
            Giữ gói Premium
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 rounded-2xl bg-red-600 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-50">
            {loading ? 'Đang hủy...' : 'Xác nhận hủy'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Plan Cards ───────────────────────
const FREE_FEATURES = [
  '3 lượt phân tích CV cho một chu kỳ tài khoản',
  'Điểm tổng quan và các tiêu chí đánh giá',
  'Điểm chi tiết theo từng phần CV',
  'Gợi ý cải thiện cơ bản',
  'Xem toàn bộ lịch sử phân tích',
];

const FREE_LIMITATIONS = [
  'Roadmap cải thiện sau đánh giá',
  'Gợi ý chuyên sâu',
];

const PREMIUM_FEATURES = [
  'Không giới hạn lượt phân tích CV',
  'Roadmap cải thiện sau mỗi lần đánh giá',
  'Xem toàn bộ lịch sử phân tích',
  'Gợi ý cải thiện chi tiết và chuyên sâu',
];

const PREMIUM_COMING_SOON = [
  'Danh sách lỗi chi tiết',
  'Câu mẫu viết lại theo STAR',
  'Sao chép nhanh từng câu mẫu',
  'Nội dung viết lại nâng cao',
  'Matching Score với mô tả công việc',
  'AI Assistant hỗ trợ chỉnh sửa CV',
  'Tải xuống CV đã chỉnh sửa',
];

function FreeCard() {
  return (
    <div className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="absolute right-6 top-6 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Gói hiện tại</div>
      <h3 className="text-xl font-bold text-slate-900">Free</h3>
      <div className="mt-4"><span className="text-5xl font-extrabold tracking-tight text-slate-900">đ0</span></div>
      <p className="mt-2 text-sm font-medium text-slate-400">Mãi mãi miễn phí</p>
      <div className="mb-8 mt-8 flex-1 space-y-6 text-sm font-medium">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Quyền lợi hiện có</p>
          <ul className="mt-4 space-y-4 text-slate-700">
            {FREE_FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3"><CheckIcon /><span>{f}</span></li>
            ))}
          </ul>
        </div>
        <div className="border-t border-slate-200 pt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tính năng bị giới hạn</p>
          <ul className="mt-4 space-y-4 text-slate-500">
            {FREE_LIMITATIONS.map((f, i) => (
              <li key={i} className="flex items-start gap-3"><LockIcon /><span>{f}</span></li>
            ))}
          </ul>
        </div>
      </div>
      <button disabled className="w-full rounded-2xl bg-slate-50 py-3.5 font-bold text-slate-400 cursor-not-allowed opacity-80">Gói hiện tại của bạn</button>
    </div>
  );
}

function CurrentPremiumCard({ cycle, onRenew, onCancel }: { cycle: '30' | '90'; onRenew: () => void; onCancel: () => void }) {
  return (
    <div className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="absolute right-6 top-6 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">Gói hiện tại</div>
      <h3 className="pr-20 text-xl font-bold text-slate-900">Premium — Job Search Pass</h3>
      <div className="mt-4"><span className="text-5xl font-extrabold tracking-tight text-slate-900">đ{cycle === '30' ? '199.000' : '389.000'}</span></div>
      <p className="mt-2 text-sm font-medium text-slate-400">{cycle === '30' ? '30 ngày' : '90 ngày'}</p>
      <div className="mt-8 flex-1 space-y-6 text-sm font-medium">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Quyền lợi hiện có</p>
          <ul className="mt-4 space-y-4 text-slate-700">
            {PREMIUM_FEATURES.map((f, i) => <li key={i} className="flex items-start gap-3"><CheckIcon /><span>{f}</span></li>)}
          </ul>
        </div>
        <div className="border-t border-slate-200 pt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sắp ra mắt</p>
          <ul className="mt-4 space-y-4">
            {PREMIUM_COMING_SOON.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-500">
                <ClockIcon /><span className="flex-1">{f}</span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">Sắp ra mắt</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <button onClick={onRenew} className="w-full rounded-2xl bg-emerald-600 py-3.5 font-bold text-white transition hover:bg-emerald-700 active:scale-95">Gia hạn gói hiện tại</button>
        <button onClick={onCancel} className="w-full rounded-2xl border border-red-200 py-3.5 font-semibold text-red-600 transition hover:bg-red-50 active:scale-95">Hủy gói Premium</button>
      </div>
    </div>
  );
}

function UpgradePremiumCard({ cycle, recommended, onUpgrade }: { cycle: '30' | '90'; recommended?: boolean; onUpgrade: () => void }) {
  return (
    <div className={`relative flex flex-col rounded-3xl p-8 shadow-xl ${recommended ? 'bg-blue-600 shadow-blue-600/20' : 'bg-blue-500 shadow-blue-500/20'}`}>
      {recommended && <div className="absolute right-6 top-6 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">Đề xuất</div>}
      <h3 className="pr-20 text-xl font-bold text-white">Premium — Job Search Pass</h3>
      <div className="mt-4"><span className="text-5xl font-extrabold tracking-tight text-white">đ{cycle === '30' ? '199.000' : '389.000'}</span></div>
      <p className="mt-2 text-sm font-medium text-blue-200">{cycle === '30' ? '30 ngày' : '90 ngày'}</p>
      <div className="mt-8 flex-1 space-y-6 text-sm font-medium">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Quyền lợi hiện có</p>
          <ul className="mt-4 space-y-4 text-white">
            {PREMIUM_FEATURES.map((f, i) => <li key={i} className="flex items-start gap-3"><CheckIcon cls="text-white" /><span>{f}</span></li>)}
          </ul>
        </div>
        <div className="border-t border-blue-500/50 pt-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-100">Sắp ra mắt</p>
          <ul className="mt-4 space-y-4">
            {PREMIUM_COMING_SOON.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-blue-100">
                <ClockIcon cls="text-blue-100" /><span className="flex-1">{f}</span>
                <span className="rounded-full border border-blue-400/30 bg-blue-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-blue-100">Sắp ra mắt</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button onClick={onUpgrade} className="mt-8 w-full rounded-2xl bg-white py-3.5 font-bold text-blue-600 transition hover:bg-slate-50 hover:shadow-lg active:scale-95">Nâng cấp Premium</button>
    </div>
  );
}

// ─────────────────────── Main Page ───────────────────────
export default function PlansPage() {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payAction, setPayAction] = useState<PlanAction>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentPlanId = quota?.current_plan_id ?? 'DV_FREE';

  const refreshQuota = async () => {
    const result = await apiService.getQuota();
    setQuota(result.data as QuotaData);
  };

  useEffect(() => { refreshQuota().finally(() => setIsLoading(false)); }, []);

  const handlePaySuccess = async (msg: string) => {
    setSuccessMsg(msg);
    await refreshQuota();
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    setCancelError('');
    try {
      await apiService.cancelPlan();
      setShowCancel(false);
      setSuccessMsg('Đã hủy gói Premium. Tài khoản về gói Free.');
      await refreshQuota();
    } catch (err) {
      setCancelError(getApiErrorMessage(err));
    } finally {
      setCancelLoading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-20 text-slate-400">Đang tải gói dịch vụ...</div>;

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      {successMsg && (
        <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <span className="text-sm font-semibold text-emerald-700">{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-xs font-bold text-emerald-600 hover:text-emerald-800">Đóng</button>
        </div>
      )}

      <div className="mb-12 text-center">
        <h1 className="mb-4 text-2xl font-medium text-slate-500">
          {currentPlanId === 'DV_FREE' ? 'Bắt đầu miễn phí, nâng cấp khi bạn cần thêm sức mạnh'
            : currentPlanId === 'DV_PREMIUM_30' ? 'Nâng cấp lên gói 90 ngày để tiết kiệm hơn'
            : 'Sử dụng công cụ AI mạnh mẽ nhất để nâng tầm CV của bạn'}
        </h1>
      </div>

      {/* Free: 3 cards — Free (current) + Premium 30 + Premium 90 */}
      {currentPlanId === 'DV_FREE' && (
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          <FreeCard />
          <UpgradePremiumCard cycle="30" recommended={false} onUpgrade={() => setPayAction('upgrade-30')} />
          <UpgradePremiumCard cycle="90" recommended onUpgrade={() => setPayAction('upgrade-90')} />
        </div>
      )}

      {/* Premium 30: card hiện tại (gia hạn/hủy) + card 90 để nâng cấp */}
      {currentPlanId === 'DV_PREMIUM_30' && (
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <CurrentPremiumCard cycle="30" onRenew={() => setPayAction('renew')} onCancel={() => { setCancelError(''); setShowCancel(true); }} />
          <UpgradePremiumCard cycle="90" recommended onUpgrade={() => setPayAction('upgrade-90')} />
        </div>
      )}

      {/* Premium 90: chỉ 1 card với gia hạn/hủy */}
      {currentPlanId === 'DV_PREMIUM_90' && (
        <div className="mx-auto max-w-md">
          <CurrentPremiumCard cycle="90" onRenew={() => setPayAction('renew')} onCancel={() => { setCancelError(''); setShowCancel(true); }} />
        </div>
      )}

      <p className="mt-10 text-center text-xs text-slate-400">Thanh toán bảo mật. Gói được kích hoạt ngay sau khi xác nhận.</p>

      {payAction && payAction !== 'cancel' && (
        <PaymentModal
          action={payAction}
          currentPlanId={currentPlanId}
          onSuccess={handlePaySuccess}
          onClose={() => setPayAction(null)}
        />
      )}
      {showCancel && (
        <CancelModal
          onConfirm={handleCancel}
          onCancel={() => setShowCancel(false)}
          loading={cancelLoading}
          error={cancelError}
        />
      )}
    </div>
  );
}
