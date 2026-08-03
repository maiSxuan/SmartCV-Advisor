export type PremiumCycle = '30' | '90';

export const FREE_FEATURES = [
  '3 lượt phân tích CV cho một chu kỳ tài khoản',
  'Điểm tổng quan và các tiêu chí đánh giá',
  'Điểm chi tiết theo từng phần CV',
  'Gợi ý cải thiện cơ bản',
  'Xem toàn bộ lịch sử phân tích',
];

export const FREE_LIMITATIONS = [
  'Roadmap cải thiện sau đánh giá',
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
  'Điểm tổng quan và các tiêu chí đánh giá',
  'Điểm chi tiết theo từng phần CV',
  'Roadmap cải thiện sau mỗi lần đánh giá',
  'Gợi ý cải thiện chi tiết và chuyên sâu',
  'Xem toàn bộ lịch sử phân tích',
];

const PREMIUM_COMING_SOON = [
  'Danh sách lỗi chi tiết',
  'Câu mẫu viết lại theo STAR',
  'Sao chép nhanh từng câu mẫu',
  'Nội dung viết lại nâng cao',
];

export function getPremiumComingSoon(cycle: PremiumCycle): string[] {
  const plan = PREMIUM_PLANS[cycle];
  return [
    ...PREMIUM_COMING_SOON,
    `Matching Score với JD (${plan.matchingScoreLimit} lượt)`,
    `AI Assistant hỗ trợ chỉnh sửa CV (${plan.aiAssistantLimit} lượt)`,
    'Tải xuống CV đã chỉnh sửa',
  ];
}
