import axios from 'axios';
import type {
  AdminCareerRole,
  AdminSkillConfig,
  AdminUserDetail,
  AdminUserSummary,
  AnalysisResult,
  AuthSession,
  AuthUser,
  CareerRole,
  UserProfile,
  UploadedCv,
} from '../types';

const AUTH_STORAGE_KEY = 'smartcv_auth_session';
const ANALYTICS_SESSION_KEY = 'smartcv_analytics_session_id';
const ANALYTICS_ATTRIBUTION_KEY = 'smartcv_analytics_attribution';

export const FEEDBACK_TYPES = [
  'loi_ky_thuat',
  'ket_qua_kho_hieu',
  'goi_y_chua_cu_the',
  'nhan_xet_chua_chinh_xac',
  'quyen_rieng_tu',
  'gop_y_khac',
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export type FeedbackStatus = 'Moi' | 'DangXemXet' | 'DaXuLy' | 'KhongXuLy';

export interface FeedbackPayload {
  analysis_id: string;
  feedback_type: FeedbackType;
  rating: number;
  easy_to_understand: boolean;
  recommendation_specific: boolean;
  useful: boolean;
  inaccurate: boolean;
  want_reanalyze: boolean;
  willing_to_recommend: boolean;
  comment?: string;
}

export interface FeedbackEligibility {
  can_submit: boolean;
  reason: string | null;
  existing_feedback_id?: string | null;
}

export interface AdminFeedbackItem {
  _id: string;
  MaKH: string;
  MaKQ: string | null;
  MaChuKy?: string | null;
  MaGoiDV?: string | null;
  LoaiPhanHoi: FeedbackType;
  DanhGia: number | null;
  CauHoi1: boolean | null;
  CauHoi2: boolean | null;
  CauHoi3: boolean | null;
  CauHoi4: boolean | null;
  CauHoi5: boolean | null;
  CauHoi6: boolean | null;
  BinhLuan: string | null;
  TrangThai: FeedbackStatus;
  NgayTao: string;
  GhiChuNoiBo: string | null;
}

export interface AdminFeedbackFilters {
  feedback_type?: FeedbackType;
  status?: FeedbackStatus;
  rating?: number;
  page?: number;
  limit?: number;
}

export interface AnalyticsBreakdownItem {
  _id?: string;
  name?: string;
  count: number;
}

export interface AdminAnalyticsSummary {
  funnel: {
    landing_page_views: number;
    registrations: number;
    cv_selections: number;
    uploads_completed: number;
    analyses_started: number;
    analyses_completed: number;
    suggestions_viewed: number;
    reanalyses: number;
  };
  drop_off: Array<{ from: string; to: string; count: number; rate: number }>;
  acquisition: {
    sources: AnalyticsBreakdownItem[];
    campaigns: AnalyticsBreakdownItem[];
    message_variants: AnalyticsBreakdownItem[];
  };
  conversion: {
    registration_to_analysis: number;
    registered_to_premium: number;
    registered_count: number;
    premium_count: number;
  };
  role_choices: AnalyticsBreakdownItem[];
  avg_rating: number;
  feedback_count: number;
}

export interface ServicePlan {
  plan_id: string;
  name: string;
  price: number;
  duration_days: number | null;
  analysis_limit: number | null;
  features: string[];
  limited_features: string[];
  coming_soon: string[];
  status?: 'active' | 'inactive';
}

export interface AdminPlan {
  _id: string;
  TenGoi: string;
  Gia: number;
  HanSuDung: number | null;
  SoLuotPhanTich: number;
  QuyenLoi: string;
  SapRaMat: string;
  TrangThai: string;
  NgayCapNhat?: string;
}

export type PublicAnalyticsEventName = 'landing_page_view' | 'cta_clicked';
export type AuthenticatedAnalyticsEventName = 'cv_selected' | 'analysis_restarted';

interface AnalyticsAttribution {
  source?: string;
  campaign?: string;
  message_variant?: string;
  referrer?: string;
}

const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/v1',
});

export function getStoredAuthSession(): AuthSession | null {
  const raw = window.sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function getStoredAuthUser(): AuthUser | null {
  return getStoredAuthSession()?.user ?? null;
}

export function saveAuthSession(session: AuthSession) {
  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function createSessionId(): string {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `scv_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getAnalyticsSessionId(): string {
  const existing = window.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
  if (existing) return existing;
  const sessionId = createSessionId();
  window.sessionStorage.setItem(ANALYTICS_SESSION_KEY, sessionId);
  return sessionId;
}

export function getAnalyticsAttribution(): AnalyticsAttribution {
  const stored = window.sessionStorage.getItem(ANALYTICS_ATTRIBUTION_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as AnalyticsAttribution;
    } catch {
      window.sessionStorage.removeItem(ANALYTICS_ATTRIBUTION_KEY);
    }
  }

  const search = new URLSearchParams(window.location.search);
  const source = search.get('utm_source') ?? search.get('source') ?? undefined;
  const campaign = search.get('utm_campaign') ?? search.get('campaign') ?? undefined;
  const messageVariant = search.get('message_variant') ?? search.get('utm_content') ?? undefined;
  const attribution: AnalyticsAttribution = {
    ...(source ? { source } : {}),
    ...(campaign ? { campaign } : {}),
    ...(messageVariant ? { message_variant: messageVariant } : {}),
    ...(document.referrer ? { referrer: document.referrer } : {}),
  };
  window.sessionStorage.setItem(ANALYTICS_ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
}

apiClient.interceptors.request.use((config) => {
  const session = getStoredAuthSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export const apiService = {
  register: async (payload: {
    fullName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    termsAccepted: boolean;
  }): Promise<{ data: AuthUser; meta: { next_step: string } }> => {
    const attribution = getAnalyticsAttribution();
    const response = await apiClient.post('/auth/register', {
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
      terms_accepted: payload.termsAccepted,
      analytics_session_id: getAnalyticsSessionId(),
      source: attribution.source,
      campaign: attribution.campaign,
      message_variant: attribution.message_variant,
    });
    return response.data;
  },

  login: async (payload: {
    email: string;
    password: string;
    rememberMe: boolean;
  }): Promise<{ data: AuthSession }> => {
    const response = await apiClient.post('/auth/login', {
      email: payload.email,
      password: payload.password,
      remember_me: payload.rememberMe,
    });
    return response.data;
  },

  logout: async (refreshToken?: string | null): Promise<{ data: { message: string } }> => {
    const response = await apiClient.post('/auth/logout', { refresh_token: refreshToken ?? null });
    return response.data;
  },

  checkEmail: async (email: string): Promise<{ data: { exists: boolean } }> => {
    const response = await apiClient.post('/auth/check-email', { email });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<{ data: { message: string } }> => {
    const response = await apiClient.post('/auth/verify-email', { token });
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ data: { message: string } }> => {
    const response = await apiClient.post('/auth/resend-verification', { email });
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ data: { message: string; email_masked: string } }> => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (payload: {
    token: string;
    password: string;
    passwordConfirmation: string;
  }): Promise<{ data: { message: string } }> => {
    const response = await apiClient.post('/auth/reset-password', {
      token: payload.token,
      password: payload.password,
      password_confirmation: payload.passwordConfirmation,
    });
    return response.data;
  },

  getProfile: async (): Promise<{ data: UserProfile }> => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  getQuota: async (): Promise<{
    data: {
      account_type: string;
      current_plan_id: string;
      unlimited: boolean;
      used: number | null;
      limit: number | null;
      remaining: number | null;
      label: string;
      auto_renew: boolean;
      expires_at: string | null;
    };
  }> => {
    const response = await apiClient.get('/users/me/quota');
    return response.data;
  },

  updateProfile: async (payload: {
    fullName: string;
    email: string;
    industryInterest: string;
    targetRole: string;
    currentLevel: string;
    avatarUrl?: string | null;
  }): Promise<{ data: UserProfile; meta: { message: string } }> => {
    const response = await apiClient.patch('/users/me', {
      full_name: payload.fullName,
      email: payload.email,
      industry_interest: payload.industryInterest,
      target_role: payload.targetRole,
      current_level: payload.currentLevel,
      avatar_url: payload.avatarUrl ?? null,
    });
    return response.data;
  },

  requestDataDeletion: async (payload: {
    scope: 'cv_data' | 'all_personal_data';
    reason?: string;
  }): Promise<{ data: UserProfile['data_deletion_requests'][number]; meta: { message: string } }> => {
    const response = await apiClient.post('/users/me/data-deletion-request', {
      scope: payload.scope,
      reason: payload.reason ?? '',
    });
    return response.data;
  },

  getCareerRoles: async (): Promise<{ data: CareerRole[] }> => {
    const response = await apiClient.get('/career-roles');
    return response.data;
  },

  uploadCv: async (payload: {
    file: File;
    consentAccepted: boolean;
    policyVersion?: string;
  }): Promise<{ data: UploadedCv }> => {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('consent_accepted', String(payload.consentAccepted));
    formData.append('policy_version', payload.policyVersion ?? 'cv-processing-policy-v1');

    const response = await apiClient.post('/cvs', formData);
    return response.data;
  },

  deleteCv: async (cvId: string): Promise<{
    data: {
      cv_id: string;
      filename: string | null;
      deleted_at: string;
      cleanup: {
        analyses: number;
        suggestions: number;
        feedback: number;
        analytics_events: number;
        usage_records_anonymized: number;
      };
    };
    meta: { message: string };
  }> => {
    const response = await apiClient.delete(`/cvs/${cvId}`);
    return response.data;
  },

  createAnalysis: async (
    cvId: string,
    careerRoleId: string,
  ): Promise<{ data: AnalysisResult }> => {
    const response = await apiClient.post(`/cvs/${cvId}/analyses`, {
      career_role_id: careerRoleId,
    });
    return response.data;
  },

  getAnalysisResult: async (analysisId: string): Promise<{ data: AnalysisResult; access_level: string }> => {
    const response = await apiClient.get(`/analyses/${analysisId}`);
    return response.data;
  },

  getHistory: async (limit: number = 10) => {
    const response = await apiClient.get(`/analyses?limit=${limit}`);
    return response.data;
  },

  getSuggestions: async (analysisId: string) => {
    const response = await apiClient.get(`/analyses/${analysisId}/suggestions`);
    return response.data;
  },

  getPlans: async (): Promise<{ data: ServicePlan[] }> => {
    const response = await apiClient.get('/service-plans');
    return response.data;
  },

  getAdminCareerRoles: async (params?: {
    search?: string;
    status?: 'all' | 'active' | 'inactive';
  }): Promise<{ data: AdminCareerRole[]; meta: { count: number } }> => {
    const response = await apiClient.get('/admin/career-roles', { params });
    return response.data;
  },

  createAdminCareerRole: async (payload: {
    name: string;
    description: string;
    status: 'active' | 'inactive';
  }): Promise<{ data: AdminCareerRole; meta: { message: string } }> => {
    const response = await apiClient.post('/admin/career-roles', payload);
    return response.data;
  },

  updateAdminCareerRole: async (
    roleId: string,
    payload: { name?: string; description?: string; status?: 'active' | 'inactive' },
  ): Promise<{ data: AdminCareerRole; meta: { message: string } }> => {
    const response = await apiClient.patch(`/admin/career-roles/${roleId}`, payload);
    return response.data;
  },

  updateAdminCareerRoleStatus: async (
    roleId: string,
    status: 'active' | 'inactive',
  ): Promise<{ data: AdminCareerRole; meta: { message: string } }> => {
    const response = await apiClient.patch(`/admin/career-roles/${roleId}/status`, { status });
    return response.data;
  },

  getAdminRoleSkills: async (
    roleId: string,
  ): Promise<{ data: AdminSkillConfig[]; meta: { total_weight: number; count: number; role: AdminCareerRole } }> => {
    const response = await apiClient.get(`/admin/career-roles/${roleId}/skills`);
    return response.data;
  },

  createAdminRoleSkill: async (
    roleId: string,
    payload: {
      skill_name: string;
      skill_group: string;
      required_score: number;
      weight: number;
      importance: number;
      criteria_description: string;
    },
  ): Promise<{ data: AdminSkillConfig; meta: { message: string } }> => {
    const response = await apiClient.post(`/admin/career-roles/${roleId}/skills`, payload);
    return response.data;
  },

  updateAdminRoleSkill: async (
    roleId: string,
    configId: string,
    payload: {
      required_score?: number;
      weight?: number;
      importance?: number;
      criteria_description?: string;
      status?: 'active' | 'inactive';
      skill_group?: string;
    },
  ): Promise<{ data: AdminSkillConfig; meta: { message: string } }> => {
    const response = await apiClient.patch(`/admin/career-roles/${roleId}/skills/${configId}`, payload);
    return response.data;
  },

  bulkUpdateAdminRoleSkills: async (
    roleId: string,
    payload: {
      config_ids: string[];
      required_score?: number;
      weight?: number;
      importance?: number;
      status?: 'active' | 'inactive';
    },
  ): Promise<{ data: AdminSkillConfig[]; meta: { message: string } }> => {
    const response = await apiClient.patch(`/admin/career-roles/${roleId}/skills/bulk`, payload);
    return response.data;
  },

  getAdminUsers: async (params?: {
    search?: string;
    account_type?: 'all' | 'registered' | 'premium' | 'admin';
    status?: 'all' | 'active' | 'locked';
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AdminUserSummary[];
    meta: { total: number; page: number; limit: number; has_next: boolean };
  }> => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  getAdminUser: async (userId: string): Promise<{ data: AdminUserDetail }> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  lockAdminUser: async (userId: string, reason: string): Promise<{ data: AdminUserSummary; meta: { message: string } }> => {
    const response = await apiClient.post(`/admin/users/${userId}/lock`, { reason });
    return response.data;
  },

  unlockAdminUser: async (userId: string): Promise<{ data: AdminUserSummary; meta: { message: string } }> => {
    const response = await apiClient.post(`/admin/users/${userId}/unlock`);
    return response.data;
  },

  changePlan: async (planId: string): Promise<{ data: { plan_id: string; account_type: string }; meta: { message: string } }> => {
    const response = await apiClient.post('/users/me/change-plan', { plan_id: planId });
    return response.data;
  },

  renewPlan: async (): Promise<{ data: { plan_id: string; new_expiry: string }; meta: { message: string } }> => {
    const response = await apiClient.post('/users/me/renew-plan');
    return response.data;
  },

  cancelPlan: async (): Promise<{ data: { account_type: string; expires_at: string; auto_renew: boolean }; meta: { message: string } }> => {
    const response = await apiClient.post('/users/me/cancel-plan');
    return response.data;
  },

  submitFeedback: async (payload: FeedbackPayload): Promise<{ data: AdminFeedbackItem }> => {
    const response = await apiClient.post('/feedback', payload);
    return response.data;
  },

  getFeedbackEligibility: async (analysisId: string): Promise<{ data: FeedbackEligibility }> => {
    const response = await apiClient.get('/feedback/eligibility', { params: { analysis_id: analysisId } });
    return response.data;
  },

  getAdminFeedback: async (params?: AdminFeedbackFilters): Promise<{
    data: AdminFeedbackItem[];
    meta?: { total: number; page: number; limit: number; has_next: boolean };
  }> => {
    const response = await apiClient.get('/feedback', { params });
    return response.data;
  },

  updateAdminFeedback: async (
    feedbackId: string,
    payload: Partial<{ feedback_type: FeedbackType; status: FeedbackStatus; note: string | null }>,
  ): Promise<{ data: AdminFeedbackItem | { feedback_id: string } }> => {
    const response = await apiClient.patch(`/feedback/${feedbackId}`, payload);
    return response.data;
  },

  getAdminAnalytics: async (params?: {
    date_from?: string;
    date_to?: string;
  }): Promise<{ data: AdminAnalyticsSummary }> => {
    const response = await apiClient.get('/admin/analytics', { params });
    return response.data;
  },

  trackPublicAnalyticsEvent: async (
    eventName: PublicAnalyticsEventName,
    overrides?: Partial<AnalyticsAttribution & { path: string }>,
  ): Promise<void> => {
    const response = await apiClient.post('/analytics/events/public', {
      event_name: eventName,
      session_id: getAnalyticsSessionId(),
      ...getAnalyticsAttribution(),
      path: `${window.location.pathname}${window.location.search}`,
      ...overrides,
    });
    return response.data;
  },

  trackAnalyticsEvent: async (
    eventName: AuthenticatedAnalyticsEventName,
    metadata?: Record<string, unknown>,
  ): Promise<void> => {
    const response = await apiClient.post('/analytics/events', {
      event_name: eventName,
      session_id: getAnalyticsSessionId(),
      ...(metadata ? { metadata } : {}),
    });
    return response.data;
  },

  getAdminPlans: async (): Promise<{ data: AdminPlan[] }> => {
    const response = await apiClient.get('/admin/plans');
    return response.data;
  },

  upsertAdminPlan: async (payload: {
    plan_id: string;
    name: string;
    price: number;
    duration_days: number;
    analysis_limit: number;
    features: string[];
    coming_soon: string[];
    status: string;
  }): Promise<{ data: AdminPlan }> => {
    const response = await apiClient.post('/admin/plans', payload);
    return response.data;
  },
};

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Không thể kết nối máy chủ tại http://127.0.0.1:8000. Vui lòng kiểm tra backend đang chạy rồi thử lại.';
    }
    const detail = error.response?.data?.detail;
    if (typeof detail?.message === 'string') {
      return typeof detail?.hint === 'string' ? `${detail.message} ${detail.hint}` : detail.message;
    }
    if (typeof detail === 'string') {
      return detail;
    }
    if (error.response.status === 503) {
      return 'Dịch vụ đang tạm thời chưa sẵn sàng. Vui lòng chờ ít phút rồi thử lại.';
    }
    return `Yêu cầu không thành công (HTTP ${error.response.status}). Vui lòng thử lại.`;
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

export function getApiErrorCode(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  const detail = error.response?.data?.detail;
  return typeof detail?.code === 'string' ? detail.code : null;
}
