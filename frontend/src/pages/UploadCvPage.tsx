import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService, getApiErrorMessage } from '../services/api';
import type { CareerRole, UploadedCv } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp', 'bmp'];

type FlowStep = 'upload' | 'role' | 'confirm' | 'analyzing';

const stepItems = [
  { key: 'upload', number: 1, label: 'Tải CV' },
  { key: 'role', number: 2, label: 'Chọn vị trí' },
  { key: 'confirm', number: 3, label: 'Xác nhận' },
  { key: 'result', number: 4, label: 'Kết quả' },
];

function getStepIndex(step: FlowStep) {
  if (step === 'upload') return 0;
  if (step === 'role') return 1;
  return 2;
}

function formatLocalFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function getFileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function validateLocalFile(file: File) {
  const extension = getFileExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'Hệ thống chỉ hỗ trợ PDF, DOC, DOCX hoặc ảnh PNG/JPG/JPEG/WEBP/BMP.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Dung lượng file quá lớn. Giới hạn hiện tại là 5 MB.';
  }
  return '';
}

function Stepper({ step }: { step: FlowStep }) {
  const activeIndex = getStepIndex(step);

  return (
    <div className="mx-auto flex max-w-xl items-center justify-center gap-4">
      {stepItems.map((item, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <div key={item.key} className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <div
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold',
                  isDone ? 'border-blue-600 bg-blue-600 text-white' : '',
                  isActive ? 'border-blue-600 bg-white text-blue-600' : '',
                  !isDone && !isActive ? 'border-slate-200 bg-white text-slate-400' : '',
                ].join(' ')}
              >
                {item.number}
              </div>
              <span className={isDone || isActive ? 'text-sm font-medium text-blue-600' : 'text-sm text-slate-400'}>
                {item.label}
              </span>
            </div>
            {index < stepItems.length - 1 && (
              <div className={index < activeIndex ? 'h-px w-16 bg-blue-600' : 'h-px w-16 bg-slate-200'} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div
      className="grid h-28 w-28 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#2563eb ${value * 3.6}deg, #e2e8f0 0deg)`,
      }}
      aria-label={`Tiến trình ${value}%`}
    >
      <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-2xl font-bold text-blue-600">
        {value}%
      </div>
    </div>
  );
}

export default function UploadCvPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<FlowStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedCv, setUploadedCv] = useState<UploadedCv | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [roles, setRoles] = useState<CareerRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [roleError, setRoleError] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [progress, setProgress] = useState(0);
  const [quotaLabel, setQuotaLabel] = useState<string>('...');
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const selectedRole = roles.find((role) => role.role_id === selectedRoleId) ?? null;
  const fileIsReady = Boolean(selectedFile && !fileError);
  const canUpload = fileIsReady && consentAccepted && !uploading;

  useEffect(() => {
    const loadRoles = async () => {
      setRolesLoading(true);
      setRoleError('');
      try {
        const result = await apiService.getCareerRoles();
        setRoles(result.data);
        setSelectedRoleId((current) => current || result.data[0]?.role_id || '');
      } catch (error) {
        setRoleError(getApiErrorMessage(error));
      } finally {
        setRolesLoading(false);
      }
    };
    const loadQuota = async () => {
      try {
        const result = await apiService.getQuota();
        setQuotaLabel(result.data.label);
        setQuotaExceeded(!result.data.unlimited && (result.data.remaining ?? 1) <= 0);
      } catch {
        setQuotaLabel('...');
      }
    };
    loadRoles();
    loadQuota();
  }, []);

  useEffect(() => {
    if (!analyzing) return undefined;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current < 20) return current + 8;
        if (current < 45) return current + 5;
        if (current < 75) return current + 3;
        if (current < 92) return current + 1;
        return current;
      });
    }, 380);
    return () => window.clearInterval(timer);
  }, [analyzing]);

  const filteredRoles = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return roles;
    return roles.filter((role) => {
      const text = `${role.name} ${role.description}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [roles, searchTerm]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const validationMessage = validateLocalFile(file);
    setSelectedFile(file);
    setFileError(validationMessage);
    setUploadedCv(null);
    if (!validationMessage) {
      void apiService.trackAnalyticsEvent('cv_selected', {
        file_type: file.type || 'unknown',
        file_size_bytes: file.size,
      }).catch(() => undefined);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setFileError('');
    try {
      const result = await apiService.uploadCv({
        file: selectedFile,
        consentAccepted,
      });
      setUploadedCv(result.data);
      setStep('role');
    } catch (error) {
      setFileError(getApiErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleCreateAnalysis = async () => {
    if (!uploadedCv || !selectedRole) return;
    setAnalyzing(true);
    setAnalysisError('');
    setProgress(8);
    try {
      const result = await apiService.createAnalysis(uploadedCv.cv_id, selectedRole.role_id);
      setProgress(100);
      window.setTimeout(() => {
        navigate(`/analysis/${result.data.analysis_id}`);
      }, 400);
    } catch (error) {
      setAnalysisError(getApiErrorMessage(error));
      setAnalyzing(false);
      setProgress(0);
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    setUploadedCv(null);
    setFileError('');
    setConsentAccepted(false);
    setStep('upload');
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <Stepper step={step} />

      <section className="mt-9">
        {step === 'upload' && (
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-950">Tải CV của bạn lên</h1>
            <p className="mt-2 text-slate-500">PDF, DOC, DOCX hoặc ảnh PNG/JPG/WEBP — tối đa 5 MB</p>

            {quotaExceeded ? (
              <div className="mt-7 flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 px-6 text-center">
                <p className="text-lg font-bold text-amber-800">Bạn đã dùng hết lượt phân tích</p>
                <p className="mt-2 text-sm text-amber-700">
                  Gói Free giới hạn tối đa 3 lượt phân tích mỗi chu kỳ.<br />
                  Nâng cấp lên Premium để phân tích không giới hạn.
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-purple-700"
                  onClick={() => window.location.href = '/plans'}
                >
                  Xem gói Premium
                </button>
              </div>
            ) : (
              <>
                <div
                  className={[
                    'mt-7 flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition',
                    fileError ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30',
                  ].join(' ')}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files[0]);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.bmp"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                  />

                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
                    CV
                  </div>
                  <p className="mt-5 font-semibold text-slate-700">Kéo thả CV vào đây</p>
                  <p className="mt-2 text-sm text-slate-400">hoặc</p>
                  <button
                    type="button"
                    className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Chọn tệp CV
                  </button>
                  <p className="mt-4 text-sm text-slate-400">PDF, DOC, DOCX, PNG, JPG, WEBP, BMP · Tối đa 5 MB</p>
                </div>

                {selectedFile && (
                  <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                      <p className="text-sm text-slate-500">
                        {getFileExtension(selectedFile.name).toUpperCase()} · {formatLocalFileSize(selectedFile.size)} ·{' '}
                        {fileError ? 'Chưa hợp lệ' : 'Đã kiểm tra phía trình duyệt'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white"
                      onClick={resetFile}
                    >
                      Chọn tệp khác
                    </button>
                  </div>
                )}

                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-sm leading-6 text-slate-600">
                    CV có thể chứa thông tin cá nhân như họ tên, email, số điện thoại, học vấn và kinh nghiệm làm việc.
                    Hệ thống cần xử lý các dữ liệu này để thực hiện phân tích và đưa ra đề xuất cải thiện CV.
                  </p>
                  <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={consentAccepted}
                      onChange={(event) => setConsentAccepted(event.target.checked)}
                    />
                    <span>
                      Tôi đồng ý cho phép hệ thống xử lý dữ liệu trong CV nhằm phục vụ việc phân tích và đưa ra đề xuất.{' '}
                      <Link className="font-semibold text-blue-600 hover:underline" to="/privacy-policy" target="_blank" rel="noopener noreferrer">
                        Chính sách quyền riêng tư
                      </Link>{' '}
                      ·{' '}
                      <Link className="font-semibold text-blue-600 hover:underline" to="/data-policy" target="_blank" rel="noopener noreferrer">
                        Điều khoản xử lý dữ liệu
                      </Link>
                    </span>
                  </label>
                  {!consentAccepted && (
                    <p className="mt-3 text-sm font-medium text-amber-600">
                      Bạn cần đồng ý với chính sách xử lý dữ liệu CV để tiếp tục.
                    </p>
                  )}
                </div>

                {fileError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {fileError}
                  </div>
                )}

                <button
                  type="button"
                  className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  disabled={!canUpload}
                  onClick={handleUpload}
                >
                  {uploading ? 'Đang tải CV lên...' : 'Xác nhận và tải CV lên'}
                </button>
              </>
            )}
          </div>
        )}

        {step === 'role' && (
          <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-950">Bạn muốn đánh giá CV cho vị trí nào?</h1>
            <p className="mt-2 text-slate-500">Chọn vị trí mục tiêu để nhận phân tích phù hợp nhất.</p>

            <input
              className="mt-7 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              placeholder="Tìm vị trí..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            {rolesLoading && <p className="mt-6 text-sm text-slate-500">Đang tải danh mục vị trí...</p>}
            {roleError && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {roleError}
              </div>
            )}

            {!rolesLoading && filteredRoles.length === 0 && (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-500">
                Không tìm thấy vị trí IT phù hợp.
              </div>
            )}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {filteredRoles.map((role) => {
                const selected = selectedRoleId === role.role_id;
                return (
                  <button
                    key={role.role_id}
                    type="button"
                    className={[
                      'flex min-h-24 items-center gap-4 rounded-2xl border p-5 text-left transition',
                      selected
                        ? 'border-blue-600 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30',
                    ].join(' ')}
                    onClick={() => setSelectedRoleId(role.role_id)}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                      {role.icon_label ?? 'IT'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">{role.name}</span>
                      <span className="mt-1 block text-sm leading-5 text-slate-500">{role.description}</span>
                    </span>
                    {selected && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-lg">Đã chọn</span>}
                  </button>
                );
              })}
            </div>

            {selectedRole && (
              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="font-semibold text-blue-700">Vị trí đã chọn: {selectedRole.name}</p>
                <p className="mt-2 text-sm leading-6 text-blue-700">{selectedRole.description}</p>
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-5 py-4 font-semibold text-slate-600 transition hover:bg-slate-50"
                onClick={() => setStep('upload')}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                disabled={!selectedRole}
                onClick={() => setStep('confirm')}
              >
                Xác nhận vị trí
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && !analyzing && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-600">
              CV
            </div>
            <h1 className="mt-6 text-center text-2xl font-bold text-slate-950">Xác nhận trước khi phân tích</h1>

            <div className="mt-7 divide-y divide-slate-100">
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-slate-500">Tệp CV</span>
                <span className="text-right font-semibold text-slate-900">{uploadedCv?.filename}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-slate-500">Dung lượng</span>
                <span className="font-semibold text-slate-900">{uploadedCv?.size_label}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-slate-500">Vị trí mục tiêu</span>
                <span className="text-right font-semibold text-slate-900">{selectedRole?.name}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-slate-500">Lượt phân tích còn lại</span>
                <span className={`font-semibold ${quotaExceeded ? 'text-red-600' : 'text-slate-900'}`}>{quotaLabel}</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Kết quả bạn sẽ nhận được</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>Điểm tổng quan và điểm 5 tiêu chí</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>Danh sách lỗi phổ biến cần cải thiện</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>Gợi ý hành động theo thứ tự ưu tiên</span>
                </li>
              </ul>
            </div>

            {quotaExceeded && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                Bạn đã dùng hết lượt phân tích. Nâng cấp Premium để tiếp tục.
              </div>
            )}

            {analysisError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {analysisError}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-5 py-4 font-semibold text-slate-600 transition hover:bg-slate-50"
                onClick={() => setStep('role')}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                disabled={quotaExceeded}
                onClick={handleCreateAnalysis}
              >
                Bắt đầu phân tích
              </button>
            </div>
          </div>
        )}

        {(step === 'analyzing' || analyzing) && (
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="flex justify-center">
              <ProgressRing value={progress} />
            </div>
            <h1 className="mt-8 text-2xl font-bold text-slate-950">Đang phân tích CV của bạn</h1>
            <p className="mt-3 text-slate-500">Quá trình này thường mất dưới 30 giây.</p>
            <div className="mx-auto mt-8 max-w-sm space-y-4 text-left">
              {[
                { label: 'Đang đọc nội dung CV...', done: progress >= 20 },
                { label: 'Đang nhận diện các phần trong CV...', done: progress >= 45 },
                { label: 'Đang đánh giá theo vị trí mục tiêu...', done: progress >= 75 },
                { label: 'Đang tổng hợp điểm và lỗi...', done: progress >= 100 },
              ].map((item, index) => (
                <div key={item.label} className={['flex items-center gap-2.5', item.done ? 'font-medium text-green-600' : index === 2 ? 'font-medium text-blue-600' : 'text-slate-400'].join(' ')}>
                  <span className={['h-2 w-2 rounded-full', item.done ? 'bg-green-500' : index === 2 ? 'bg-blue-500' : 'bg-slate-300'].join(' ')} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
