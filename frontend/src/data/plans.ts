export type PremiumCycle = '30' | '90';

export function formatPlanDuration(
  durationDays: number | null | undefined,
  fallbackLabel: string,
  supportsUnlimited = false,
): string {
  if (durationDays === -1) {
    return supportsUnlimited ? 'Không giới hạn thời hạn' : fallbackLabel;
  }
  return typeof durationDays === 'number' && durationDays > 0
    ? `${durationDays} ngày`
    : fallbackLabel;
}

export const FREE_FEATURES = [
  '3 lượt phân tích CV cho một chu kỳ tài khoản',
  'Điểm tổng quan và các tiêu chí đánh giá',
  'Điểm chi tiết theo từng phần CV',
  'Gợi ý cải thiện cơ bản',
  'Xem toàn bộ lịch sử phân tích',
];

export const FREE_LIMITATIONS = [
  'Lộ trình cải thiện sau đánh giá',
  'Gợi ý chuyên sâu',
];

export const PREMIUM_PLANS: Record<PremiumCycle, {
  label: string;
  price: number;
  durationLabel: string;
  matchingScoreLimit: number;
  aiAssistantLimit: number;
}> = {
  '30': {
    label: 'Premium 30 ngày',
    price: 199000,
    durationLabel: '30 ngày',
    matchingScoreLimit: 10,
    aiAssistantLimit: 20,
  },
  '90': {
    label: 'Premium 90 ngày',
    price: 389000,
    durationLabel: '90 ngày',
    matchingScoreLimit: 40,
    aiAssistantLimit: 80,
  },
};

export const PREMIUM_FEATURES = [
  'Không giới hạn lượt phân tích CV',
  'Lộ trình cải thiện sau mỗi lần đánh giá',
  'Xem toàn bộ lịch sử phân tích',
  'Gợi ý cải thiện chi tiết và chuyên sâu',
];

export const PREMIUM_COMING_SOON = [
  'Danh sách lỗi chi tiết',
  'Câu mẫu viết lại theo STAR',
  'Sao chép nhanh từng câu mẫu',
  'Nội dung viết lại nâng cao',
  'Điểm phù hợp với mô tả công việc',
  'Trợ lý AI hỗ trợ chỉnh sửa CV',
  'Tải xuống CV đã chỉnh sửa',
];

export function getPremiumComingSoon(): string[] {
  return [...PREMIUM_COMING_SOON];
}

export function formatPlanExpiry(expiresAt: string | null | undefined): string | null {
  if (!expiresAt) return null;
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) return null;
  return expiryDate.toLocaleDateString('vi-VN');
}
