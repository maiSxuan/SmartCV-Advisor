import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiService, getApiErrorMessage, getStoredAuthUser } from '../services/api';
import type { FeedbackEligibility, FeedbackType } from '../services/api';
import { sectionScoreGuides } from '../constants/scoring';
import type { AnalysisIssue, AnalysisResult, RoadmapPhase, SectionScore } from '../types';

const tabs = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'Professional Summary', label: 'Giới thiệu' },
  { key: 'Education', label: 'Học vấn' },
  { key: 'Experience', label: 'Kinh nghiệm' },
  { key: 'Projects', label: 'Dự án' },
  { key: 'Technical Skills', label: 'Kỹ năng' },
  { key: 'Certifications', label: 'Chứng chỉ' },
];

const feedbackTypeOptions: Array<{ value: FeedbackType; label: string }> = [
  { value: 'loi_ky_thuat', label: 'Lỗi kỹ thuật' },
  { value: 'ket_qua_kho_hieu', label: 'Kết quả khó hiểu' },
  { value: 'goi_y_chua_cu_the', label: 'Gợi ý chưa cụ thể' },
  { value: 'nhan_xet_chua_chinh_xac', label: 'Nhận xét chưa chính xác' },
  { value: 'quyen_rieng_tu', label: 'Quyền riêng tư' },
  { value: 'gop_y_khac', label: 'Góp ý khác' },
];

type FeedbackBooleanKey =
  | 'easy_to_understand'
  | 'recommendation_specific'
  | 'useful'
  | 'inaccurate'
  | 'want_reanalyze'
  | 'willing_to_recommend';

const feedbackQuestions: Array<{ key: FeedbackBooleanKey; label: string }> = [
  { key: 'easy_to_understand', label: 'Kết quả có dễ hiểu không?' },
  { key: 'recommendation_specific', label: 'Gợi ý có đủ cụ thể không?' },
  { key: 'useful', label: 'Kết quả có hữu ích không?' },
  { key: 'inaccurate', label: 'Có lỗi hoặc gợi ý nào chưa chính xác?' },
  { key: 'want_reanalyze', label: 'Bạn có muốn phân tích lại không?' },
  { key: 'willing_to_recommend', label: 'Bạn có sẵn sàng giới thiệu sản phẩm không?' },
];

function createInitialFeedbackForm() {
  return {
    feedback_type: 'gop_y_khac' as FeedbackType,
    rating: 5,
    easy_to_understand: true,
    recommendation_specific: true,
    useful: true,
    inaccurate: false,
    want_reanalyze: false,
    willing_to_recommend: true,
    comment: '',
  };
}

function ScoreDonut({ score }: { score: number }) {
  return (
    <div
      className="grid h-44 w-44 place-items-center rounded-full"
      style={{ background: `conic-gradient(#2563eb ${score * 3.6}deg, #e2e8f0 0deg)` }}
      aria-label={`Điểm tổng quan ${score}/100`}
    >
      <div className="grid h-32 w-32 place-items-center rounded-full bg-white">
        <div className="text-center">
          <p className="text-5xl font-bold text-blue-600">{score}</p>
          <p className="text-slate-400">/100</p>
        </div>
      </div>
    </div>
  );
}

function scoreBarColor(score: number) {
  if (score >= 78) return 'bg-green-600';
  if (score >= 65) return 'bg-amber-500';
  return 'bg-blue-600';
}

function scoreTextColor(score: number) {
  if (score >= 78) return 'text-green-600';
  if (score >= 65) return 'text-amber-600';
  return 'text-blue-600';
}

function formatScoreValue(score: number) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function roundedScore(score: number) {
  return Math.round(score * 10) / 10;
}

function distributePoints(totalScore: number, maxScores: number[], weights?: number[]) {
  if (!maxScores.length) return [];
  const totalCapacity = maxScores.reduce((sum, score) => sum + score, 0);
  const target = Math.max(0, Math.min(totalCapacity, totalScore));
  let activeWeights = weights && weights.length === maxScores.length ? weights.map((weight) => Math.max(0, weight)) : [...maxScores];
  if (!activeWeights.some((weight) => weight > 0)) {
    activeWeights = [...maxScores];
  }

  const allocations = maxScores.map(() => 0);
  const remainingIndexes = new Set(maxScores.map((_, index) => index));
  let remainingTarget = target;

  while (remainingIndexes.size > 0 && remainingTarget > 0) {
    const weightSum = [...remainingIndexes].reduce((sum, index) => sum + activeWeights[index], 0);
    if (weightSum <= 0) break;

    let cappedThisRound = false;
    [...remainingIndexes].forEach((index) => {
      const share = (remainingTarget * activeWeights[index]) / weightSum;
      if (share >= maxScores[index]) {
        allocations[index] = maxScores[index];
        remainingTarget -= maxScores[index];
        remainingIndexes.delete(index);
        cappedThisRound = true;
      }
    });

    if (!cappedThisRound) {
      remainingIndexes.forEach((index) => {
        allocations[index] = (remainingTarget * activeWeights[index]) / weightSum;
      });
      break;
    }
  }

  const rounded = allocations.map(roundedScore);
  const difference = roundedScore(target - rounded.reduce((sum, score) => sum + score, 0));
  if (Math.abs(difference) >= 0.1) {
    const adjustableIndexes = rounded
      .map((score, index) => ({ score, index }))
      .filter(({ score, index }) => score + difference >= 0 && score + difference <= maxScores[index]);
    const adjustableIndex = adjustableIndexes.length ? adjustableIndexes[adjustableIndexes.length - 1].index : undefined;
    if (adjustableIndex !== undefined) {
      rounded[adjustableIndex] = roundedScore(rounded[adjustableIndex] + difference);
    }
  }
  return rounded;
}

function splitPhaseTitle(value: string) {
  const match = value.match(/^(Phase\s+\d+)\s*-\s*(.+)$/i);
  if (!match) {
    return { phaseLabel: value, title: value };
  }
  return { phaseLabel: match[1], title: match[2] };
}

function phaseBadge(index: number) {
  if (index < 2) {
    return {
      label: 'Bắt buộc',
      dot: 'bg-violet-500',
      badge: 'bg-violet-500 text-white',
    };
  }
  if (index === 2) {
    return {
      label: 'Khuyến nghị',
      dot: 'bg-green-600',
      badge: 'bg-green-600 text-white',
    };
  }
  return {
    label: 'Tùy chọn',
    dot: 'bg-slate-500',
    badge: 'bg-slate-500 text-white',
  };
}

function phaseSkillGroups(phase: RoadmapPhase, index: number) {
  const fallbackGroups = [
    ['Data Structures & Algorithms', 'SQL'],
    ['Generative AI', 'LLMs & Prompt Engineering'],
    ['RAG Systems', 'Model Serving'],
    ['CI/CD Pipelines', 'Cloud Platforms'],
  ];
  const groupTitles = fallbackGroups[index] ?? ['Skill Focus', 'Practice Focus'];
  const skills = phase.skills.length ? phase.skills : [];
  if (!skills.length) return [];
  const splitAt = Math.ceil(skills.length / Math.min(2, skills.length));
  const chunks = skills.length > 1 ? [skills.slice(0, splitAt), skills.slice(splitAt)] : [skills];

  return chunks
    .filter((items) => items.length > 0)
    .map((items, groupIndex) => ({
      title: groupTitles[groupIndex] ?? `Nhóm kỹ năng ${groupIndex + 1}`,
      items,
    }));
}

const roadmapSkillTopicLibrary: { matches: string[]; topics: string[] }[] = [
  {
    matches: ['python'],
    topics: [
      'Cú pháp, kiểu dữ liệu, vòng lặp và điều kiện.',
      'Function, module, package, virtual environment và pip.',
      'List/dict comprehension, xử lý file CSV/JSON và exception.',
      'OOP cơ bản, dataclass và typing để code dễ đọc hơn.',
      'Async/await cơ bản nếu role cần backend hoặc xử lý dữ liệu.',
      'Làm mini project đọc dữ liệu, xử lý và xuất kết quả rõ ràng.',
    ],
  },
  {
    matches: ['machine learning', 'scikit'],
    topics: [
      'Quy trình train, validation, test và tránh data leakage.',
      'Tiền xử lý dữ liệu, feature engineering và scaling.',
      'Supervised learning: regression, classification, tree-based models.',
      'Metric đánh giá: accuracy, precision/recall, F1, ROC-AUC, RMSE.',
      'Cross-validation, hyperparameter tuning và xử lý overfitting.',
      'Scikit-learn Pipeline và cách giải thích kết quả mô hình.',
    ],
  },
  {
    matches: ['data wrangling', 'feature engineering'],
    topics: [
      'Làm sạch dữ liệu thiếu, trùng lặp, sai kiểu và outlier.',
      'Tạo feature từ thời gian, text, category và dữ liệu số.',
      'Encode category, scale numeric feature và tránh leakage.',
      'Dùng Pandas/NumPy để build pipeline xử lý có thể lặp lại.',
      'Ghi lại trước/sau xử lý bằng metric hoặc biểu đồ kiểm chứng.',
    ],
  },
  {
    matches: ['pandas'],
    topics: [
      'Series, DataFrame, đọc/ghi CSV, Excel và JSON.',
      'Filter, sort, groupby, aggregate và pivot table.',
      'Xử lý missing value, duplicate và kiểu dữ liệu ngày tháng.',
      'Merge, join, concat nhiều bảng dữ liệu.',
      'Tạo feature mới và chuẩn bị dữ liệu cho visualization/model.',
      'Tối ưu thao tác vectorized thay vì loop thủ công.',
    ],
  },
  {
    matches: ['numpy'],
    topics: [
      'Array, shape, dtype và broadcasting.',
      'Indexing, slicing, boolean mask và vectorization.',
      'Các phép toán thống kê cơ bản trên vector/matrix.',
      'Random sampling, seed và mô phỏng dữ liệu nhỏ.',
      'Kết hợp NumPy với Pandas và scikit-learn.',
    ],
  },
  {
    matches: ['sql', 'postgres', 'mysql'],
    topics: [
      'SELECT, WHERE, GROUP BY, HAVING và aggregate function.',
      'INNER/LEFT JOIN, subquery, CTE và window function.',
      'Index, explain plan và tối ưu truy vấn thường gặp.',
      'Thiết kế bảng, khóa chính/khóa ngoại và normalization.',
      'Transaction, constraint và xử lý dữ liệu thiếu/sai.',
      'Viết 5-10 query phân tích trên một dataset thật.',
    ],
  },
  {
    matches: ['statistics', 'probability'],
    topics: [
      'Thống kê mô tả: mean, median, variance, percentile.',
      'Xác suất, phân phối thường gặp và sampling.',
      'Correlation, regression cơ bản và cách đọc hệ số.',
      'Confidence interval, hypothesis testing và p-value.',
      'A/B testing, sai lệch mẫu và diễn giải kết quả cho business.',
    ],
  },
  {
    matches: ['linear algebra', 'calculus', 'mathematics'],
    topics: [
      'Vector, matrix, dot product và matrix multiplication.',
      'Eigenvalue/eigenvector ở mức trực giác cho PCA và embedding.',
      'Derivative, gradient và ý nghĩa trong tối ưu mô hình.',
      'Loss function, gradient descent và learning rate.',
      'Liên hệ toán nền tảng với regression, neural network và embedding.',
    ],
  },
  {
    matches: ['generative ai', 'llm', 'openai', 'gemini', 'claude'],
    topics: [
      'Khái niệm LLM, token, context window và hallucination.',
      'Prompt pattern: role, constraint, examples và output format.',
      'Gọi API, quản lý key, retry, streaming và xử lý lỗi.',
      'Function calling/tool calling và structured output.',
      'Đánh giá chất lượng response bằng test case cố định.',
      'Tạo mini app tích hợp LLM có logging và guardrail cơ bản.',
    ],
  },
  {
    matches: ['prompt'],
    topics: [
      'Viết prompt có mục tiêu, ngữ cảnh, ràng buộc và format đầu ra.',
      'Few-shot examples và cách kiểm soát tone/độ dài.',
      'Prompt cho extraction, classification, rewrite và evaluation.',
      'Thiết kế prompt test set để so sánh nhiều phiên bản.',
      'Kết hợp prompt với JSON schema hoặc structured output.',
    ],
  },
  {
    matches: ['rag', 'retrieval', 'vector database', 'vector db', 'embedding'],
    topics: [
      'Embedding model, chunking strategy và metadata.',
      'Vector database, similarity search và hybrid search.',
      'Retriever, reranker và cách giảm thông tin nhiễu.',
      'Prompt augmentation với citation/context rõ ràng.',
      'Metric đánh giá retrieval và answer quality.',
      'Xây dựng demo hỏi đáp tài liệu có log truy vấn.',
    ],
  },
  {
    matches: ['langchain', 'llamaindex', 'langgraph'],
    topics: [
      'Document loader, splitter, embedding và vector store.',
      'Chain/workflow cơ bản cho RAG hoặc agent.',
      'Memory/state, tool calling và error handling.',
      'Evaluation, tracing và cách debug prompt/context.',
      'Đóng gói thành demo có README và ví dụ input/output.',
    ],
  },
  {
    matches: ['model serving', 'fastapi', 'api development'],
    topics: [
      'REST endpoint, request/response model và validation.',
      'Load model, cache tài nguyên và kiểm soát latency.',
      'Health check, logging, error response và versioning.',
      'Docker hóa service và cấu hình môi trường.',
      'Viết test API và tài liệu Swagger/OpenAPI.',
    ],
  },
  {
    matches: ['docker', 'container'],
    topics: [
      'Dockerfile, image layer và build context.',
      'Container, volume, network và environment variable.',
      'Docker Compose cho app kèm database/service phụ.',
      'Tối ưu image size và quản lý secret an toàn.',
      'Đưa project CV/demo vào container chạy được trên máy khác.',
    ],
  },
  {
    matches: ['ci/cd', 'github actions', 'testing strategies'],
    topics: [
      'Viết test unit/integration tối thiểu cho luồng chính.',
      'Thiết lập workflow chạy build/test khi push.',
      'Cache dependency, secret và environment theo branch.',
      'Tạo artifact hoặc deploy preview sau khi test pass.',
      'Ghi badge/trạng thái CI vào README project.',
    ],
  },
  {
    matches: ['cloud', 'aws', 'gcp', 'azure'],
    topics: [
      'Compute, storage, database và networking cơ bản trên cloud.',
      'Deploy API/model lên một dịch vụ đơn giản.',
      'Environment variable, secret, domain và HTTPS.',
      'Log, metric, cost estimate và giới hạn tài nguyên.',
      'Viết README hướng dẫn deploy/redeploy cho project.',
    ],
  },
  {
    matches: ['mlflow'],
    topics: [
      'Tracking experiment, parameter, metric và artifact.',
      'Model registry, versioning và so sánh nhiều run.',
      'Lưu pipeline/model kèm input example.',
      'Tái hiện kết quả training bằng config cố định.',
      'Kết nối MLflow với demo serving hoặc notebook.',
    ],
  },
  {
    matches: ['data structures', 'algorithm', 'arrays', 'trees', 'graph'],
    topics: [
      'Array, string, hash map, stack và queue.',
      'Tree, binary search tree, heap và traversal.',
      'Graph traversal: BFS, DFS và shortest path cơ bản.',
      'Sorting/searching, recursion và dynamic programming cơ bản.',
      'Phân tích time complexity và space complexity.',
      'Giải bài tập nhỏ rồi ghi lại pattern học được.',
    ],
  },
  {
    matches: ['react', 'frontend'],
    topics: [
      'Component, props, state và event handling.',
      'Hooks phổ biến: useState, useEffect, useMemo và custom hook.',
      'Form, validation và gọi API.',
      'Routing, loading/error state và protected route.',
      'Tối ưu render và tổ chức component theo feature.',
    ],
  },
  {
    matches: ['typescript'],
    topics: [
      'Primitive type, union, interface và type alias.',
      'Generic, utility type và narrowing.',
      'Type cho API response, form state và component props.',
      'Xử lý null/undefined an toàn.',
      'Refactor một component JavaScript sang TypeScript sạch.',
    ],
  },
];

function normalizeSkillName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#/.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function roadmapIdPart(value: string) {
  return normalizeSkillName(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function isSameRoadmapSkill(left: string, right: string) {
  const leftKey = normalizeSkillName(left);
  const rightKey = normalizeSkillName(right);
  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey) return true;
  const shorter = leftKey.length <= rightKey.length ? leftKey : rightKey;
  const longer = leftKey.length > rightKey.length ? leftKey : rightKey;
  return shorter.length >= 4 && longer.includes(shorter);
}

function dedupeRoadmapPhases(phases: RoadmapPhase[]) {
  const seenSkills: string[] = [];
  return phases.map((phase) => {
    const sourceSkills = phase.skills.length ? phase.skills : phase.skill_details?.map((detail) => detail.skill) ?? [];
    const phaseSkills: string[] = [];

    sourceSkills.forEach((skill) => {
      const normalized = normalizeSkillName(skill);
      if (!normalized) return;
      const isDuplicate = [...seenSkills, ...phaseSkills.map(normalizeSkillName)].some((seenSkill) =>
        isSameRoadmapSkill(normalized, seenSkill),
      );
      if (isDuplicate) return;
      phaseSkills.push(skill);
      seenSkills.push(normalized);
    });

    const skillDetails = (phase.skill_details ?? []).filter((detail) =>
      phaseSkills.some((skill) => isSameRoadmapSkill(detail.skill, skill)),
    );

    return {
      ...phase,
      skills: phaseSkills,
      skill_details: skillDetails,
    };
  });
}

function fallbackSkillTopics(skill: string) {
  const normalized = normalizeSkillName(skill);
  const matched = roadmapSkillTopicLibrary.find((entry) => entry.matches.some((keyword) => normalized.includes(keyword)));
  if (matched) return matched.topics;
  return [
    `Nắm khái niệm cốt lõi và thuật ngữ chính của ${skill}.`,
    `Hoàn thành 2-3 bài tập nhỏ để hiểu quy trình dùng ${skill}.`,
    `Áp dụng ${skill} vào một mini project phù hợp role mục tiêu.`,
    `Ghi lại output, lỗi thường gặp và cách xử lý để đưa vào CV.`,
  ];
}

function roadmapSkillTopics(phase: RoadmapPhase, skill: string) {
  const normalizedSkill = normalizeSkillName(skill);
  const detail = phase.skill_details?.find((item) => {
    const normalizedDetail = normalizeSkillName(item.skill);
    return normalizedDetail === normalizedSkill || normalizedDetail.includes(normalizedSkill) || normalizedSkill.includes(normalizedDetail);
  });
  const topics = detail?.topics?.map((topic) => topic.trim()).filter(Boolean);
  return topics?.length ? topics : fallbackSkillTopics(skill);
}

function SectionScoreBar({
  item,
  selected,
  onSelect,
}: {
  item: SectionScore;
  selected: boolean;
  onSelect: (section: string) => void;
}) {
  const percentage = item.max_score > 0 ? Math.max(0, Math.min(100, Math.round((item.score / item.max_score) * 100))) : 0;
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={[
        'w-full rounded-xl border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200',
        selected ? 'border-blue-200 bg-blue-50/70' : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
      ].join(' ')}
      onClick={() => onSelect(item.section)}
    >
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">{item.section}</span>
        <span className={`font-bold ${scoreTextColor(percentage)}`}>
          {item.score}/{item.max_score}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${scoreBarColor(percentage)}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{item.comment}</p>
    </button>
  );
}

type NormalizedSubScore = {
  label: string;
  score: number;
  max_score: number;
  description: string;
};

function normalizeSubScoresToSection(item: SectionScore, subScores: NormalizedSubScore[]) {
  if (!subScores.length) return [];
  const target = Math.max(0, Math.min(item.max_score, item.score));
  const currentTotal = roundedScore(subScores.reduce((sum, subScore) => sum + subScore.score, 0));
  if (Math.abs(currentTotal - target) < 0.1) {
    return subScores;
  }

  const maxScores = subScores.map((subScore) => subScore.max_score);
  const positiveScores = subScores.filter((subScore) => subScore.score > 0).length;
  const weights = positiveScores >= 2 ? subScores.map((subScore) => subScore.score) : maxScores;
  const normalizedScores = distributePoints(target, maxScores, weights);
  return subScores.map((subScore, index) => ({
    ...subScore,
    score: normalizedScores[index] ?? 0,
  }));
}

function getSectionSubScores(item: SectionScore): NormalizedSubScore[] {
  const guide = sectionScoreGuides.find((entry) => entry.section === item.section);
  if (item.sub_scores?.length) {
    const rawSubScores = item.sub_scores.map((subScore) => ({
      label: subScore.label,
      score: subScore.score,
      max_score: subScore.max_score,
      description: subScore.description,
    }));
    const rawMaxTotal = roundedScore(rawSubScores.reduce((sum, subScore) => sum + subScore.max_score, 0));
    const hasCompleteRubric = !guide?.subScores.length || rawSubScores.length >= guide.subScores.length;
    if (Math.abs(rawMaxTotal - item.max_score) < 0.1 && hasCompleteRubric) {
      return normalizeSubScoresToSection(item, rawSubScores);
    }
  }

  if (!guide?.subScores.length) return [];

  const totalMax = guide.subScores.reduce((sum, subScore) => sum + subScore.maxScore, 0) || item.max_score || 1;
  const fallbackSubScores = guide.subScores.map((subScore) => {
    const estimatedScore = item.max_score > 0 ? (item.score / item.max_score) * subScore.maxScore : 0;
    return {
      label: subScore.label,
      score: roundedScore(Math.max(0, Math.min(subScore.maxScore, estimatedScore))),
      max_score: subScore.maxScore || totalMax,
      description: subScore.description,
    };
  });
  return normalizeSubScoresToSection(item, fallbackSubScores);
}

function SectionSubScorePanel({ item }: { item: SectionScore }) {
  const subScores = getSectionSubScores(item);

  return (
    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-500">Điểm thành phần</p>
          <h3 className="mt-1 text-base font-extrabold text-blue-700">{item.section}</h3>
        </div>
        <span className="text-sm font-extrabold text-blue-700">
          {formatScoreValue(item.score)}/{formatScoreValue(item.max_score)}
        </span>
      </div>

      {subScores.length > 0 ? (
        <div className="mt-4 space-y-3">
          {subScores.map((subScore) => {
            const percentage =
              subScore.max_score > 0 ? Math.max(0, Math.min(100, Math.round((subScore.score / subScore.max_score) * 100))) : 0;
            return (
              <article key={subScore.label} className="rounded-xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold leading-5 text-slate-800">{subScore.label}</h4>
                  <span className={`shrink-0 text-sm font-extrabold ${scoreTextColor(percentage)}`}>
                    {formatScoreValue(subScore.score)}/{formatScoreValue(subScore.max_score)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${scoreBarColor(percentage)}`} style={{ width: `${percentage}%` }} />
                </div>
                {subScore.description && <p className="mt-2 text-xs leading-5 text-slate-500">{subScore.description}</p>}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-slate-500 shadow-sm">
          Chưa có điểm thành phần cho section này.
        </p>
      )}
    </div>
  );
}

function RoadmapTree({ phases, roleName }: { phases: RoadmapPhase[]; roleName?: string | null }) {
  const [openPhases, setOpenPhases] = useState<Set<number>>(() => new Set(phases.map((_, index) => index)));
  const [openSkills, setOpenSkills] = useState<Set<string>>(() => new Set());
  const visiblePhases = useMemo(() => dedupeRoadmapPhases(phases), [phases]);

  const togglePhase = (index: number) => {
    setOpenPhases((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleSkill = (key: string) => {
    setOpenSkills((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div
      className="mt-4 bg-[#f5f9ff] px-4 py-8 sm:px-7 lg:px-10"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(96, 165, 250, 0.38) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <div className="mx-auto max-w-5xl">
        <div className="border-l-4 border-blue-600 pl-4">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Learning Path</p>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">Roadmap Recommendation</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
            Lộ trình học tập được cá nhân hóa cho vai trò {roleName ?? 'mục tiêu'} — theo từng giai đoạn, từ nền tảng
            đến triển khai thực tế.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-5 text-sm font-semibold text-slate-500">
          {[0, 2, 3].map((index) => {
            const badge = phaseBadge(index);
            return (
              <span key={badge.label} className="inline-flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
            );
          })}
        </div>

        <ol className="relative mt-10 space-y-10">
          <span aria-hidden="true" className="absolute bottom-8 left-6 top-5 w-0.5 bg-blue-200 sm:left-9" />
          {visiblePhases.map((phase, index) => {
            const { phaseLabel, title } = splitPhaseTitle(phase.phase);
            const badge = phaseBadge(index);
            const groups = phaseSkillGroups(phase, index);
            const isOpen = openPhases.has(index);

            return (
              <li key={phase.phase} className="relative pl-16 sm:pl-24">
                <span className="absolute left-6 top-1 grid h-10 w-10 -translate-x-1/2 place-items-center rounded-full border-4 border-[#f5f9ff] bg-blue-700 text-sm font-bold text-white shadow-md shadow-blue-200 sm:left-9">
                  {index + 1}
                </span>

                <article>
                  <button
                    type="button"
                    className="w-full rounded-xl border-2 border-[#d79b00] bg-[#ffe34d] px-5 py-4 text-left shadow-[0_4px_0_#d79b00] transition hover:bg-[#ffe866] focus:outline-none focus:ring-4 focus:ring-yellow-200"
                    aria-expanded={isOpen}
                    aria-controls={`roadmap-phase-${index}`}
                    onClick={() => togglePhase(index)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-yellow-800">{phaseLabel}</p>
                        <h3 className="mt-2 text-xl font-extrabold leading-6 text-slate-950">{title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{phase.goal}</p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={[
                          'grid h-9 w-9 shrink-0 place-items-center rounded-full text-2xl font-bold leading-none text-yellow-800 transition-transform duration-300',
                          isOpen ? 'rotate-0' : 'rotate-180',
                        ].join(' ')}
                      >
                        ⌃
                      </span>
                    </div>
                  </button>

                  <div
                    id={`roadmap-phase-${index}`}
                    className={[
                      'grid transition-all duration-300 ease-out',
                      isOpen ? 'mt-4 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0',
                    ].join(' ')}
                  >
                    <div className="overflow-hidden">
                      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.95fr)]">
                        <span aria-hidden="true" className="absolute bottom-0 left-0 top-0 hidden border-l-2 border-dotted border-blue-300 lg:block" />
                        <div className="space-y-4 lg:pl-6">
                          {groups.length > 0 ? groups.map((group) => (
                            <div key={group.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                              <div className="bg-slate-300 px-4 py-3">
                                <p className="font-mono text-xs font-extrabold uppercase tracking-[0.16em] text-slate-700">{group.title}</p>
                              </div>
                              <div className="space-y-2 bg-white px-3 py-3">
                                {group.items.map((skill) => (
                                  <div key={skill}>
                                    {(() => {
                                      const detailKey = `${index}-${roadmapIdPart(group.title)}-${roadmapIdPart(skill)}`;
                                      const isSkillOpen = openSkills.has(detailKey);
                                      const topics = roadmapSkillTopics(phase, skill);
                                      return (
                                        <>
                                          <button
                                            type="button"
                                            className="flex w-full items-center justify-between gap-3 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-left text-sm font-semibold text-slate-800 transition hover:border-yellow-400 hover:bg-yellow-100 focus:outline-none focus:ring-4 focus:ring-yellow-100"
                                            aria-expanded={isSkillOpen}
                                            aria-controls={`roadmap-skill-${detailKey}`}
                                            title="Xem nội dung cần học"
                                            onClick={() => toggleSkill(detailKey)}
                                          >
                                            <span>{skill}</span>
                                            <svg
                                              viewBox="0 0 20 20"
                                              className={[
                                                'h-4 w-4 shrink-0 text-yellow-700 transition-transform duration-200',
                                                isSkillOpen ? 'rotate-180' : 'rotate-0',
                                              ].join(' ')}
                                              fill="none"
                                              stroke="currentColor"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              aria-hidden="true"
                                            >
                                              <path d="m5 8 5 5 5-5" />
                                            </svg>
                                          </button>
                                          <div
                                            id={`roadmap-skill-${detailKey}`}
                                            className={[
                                              'grid transition-all duration-300 ease-out',
                                              isSkillOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                                            ].join(' ')}
                                          >
                                            <div className="overflow-hidden">
                                              <ul className="mt-2 space-y-2 rounded-lg border border-yellow-200 bg-white/90 px-3 py-3">
                                                {topics.map((topic, topicIndex) => (
                                                  <li key={`${topicIndex}-${topic}`} className="flex gap-2 text-xs leading-5 text-slate-600">
                                                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-yellow-100 text-[11px] font-bold text-yellow-700">
                                                      {topicIndex + 1}
                                                    </span>
                                                    <span>{topic}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )) : (
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-5 text-sm leading-6 text-slate-500 shadow-sm">
                              Các kỹ năng chính của phase này đã được gom ở những phase trước để tránh lặp lại.
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badge.badge}`}>{badge.label}</span>
                          <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Output</p>
                          {phase.output && <p className="mt-3 text-sm font-bold leading-6 text-blue-700">{phase.output}</p>}
                          {phase.reason && (
                            <p className="mt-4 border-t border-slate-100 pt-4 text-sm leading-6 text-slate-500">{phase.reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        <div className="mt-10 rounded-xl border border-blue-100 bg-white px-5 py-4 text-sm leading-6 text-slate-500 shadow-sm">
          <span className="mr-3 inline-grid h-5 w-5 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">i</span>
          Hoàn thành từng giai đoạn theo thứ tự. Mỗi phase đều có output cụ thể để bạn có thể kiểm chứng kết quả học tập
          của mình trước khi tiếp tục.
        </div>
      </div>
    </div>
  );
}

function issueStyle(issue: AnalysisIssue) {
  if (issue.severity === 'high') {
    return {
      wrapper: 'border-red-200 bg-red-50',
      label: 'text-red-600',
      mark: '!',
    };
  }
  if (issue.severity === 'medium') {
    return {
      wrapper: 'border-amber-200 bg-amber-50',
      label: 'text-amber-600',
      mark: 'M',
    };
  }
  return {
    wrapper: 'border-green-200 bg-green-50',
    label: 'text-green-600',
    mark: 'L',
  };
}

function IssueCard({ issue }: { issue: AnalysisIssue }) {
  const styles = issueStyle(issue);
  return (
    <article className={`rounded-2xl border p-5 ${styles.wrapper}`}>
      <div className="flex items-start gap-4">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-sm font-bold ${styles.label}`}>
          {styles.mark}
        </span>
        <div>
          <p className={`text-sm font-bold uppercase tracking-wide ${styles.label}`}>{issue.severity_label}</p>
          <h3 className="mt-2 font-bold text-slate-900">{issue.title}</h3>
          <p className="mt-2 leading-6 text-slate-600">{issue.description}</p>
          <p className="mt-2 text-sm italic text-slate-500">{issue.impact}</p>
        </div>
      </div>
    </article>
  );
}

function SkillList({ title, items, tone = 'slate' }: { title: string; items: string[]; tone?: 'green' | 'amber' | 'blue' | 'slate' }) {
  const toneClass = {
    green: 'border-green-100 bg-green-50 text-green-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tone];

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <h3 className="font-bold">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {(items.length ? items : ['Chưa phát hiện dữ liệu rõ ràng.']).slice(0, 8).map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function AnalysisResultPage() {
  const { id } = useParams<{ id: string }>();
  const isAdminViewer = getStoredAuthUser()?.role === 'admin';
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackMessageTone, setFeedbackMessageTone] = useState<'success' | 'error'>('success');
  const [feedbackEligibility, setFeedbackEligibility] = useState<FeedbackEligibility | null>(null);
  const [feedbackEligibilityLoading, setFeedbackEligibilityLoading] = useState(true);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState(createInitialFeedbackForm);

  useEffect(() => {
    const fetchResult = async () => {
      if (!id) return;
      setLoading(true);
      setErrorMessage('');
      setFeedbackMessage('');
      setFeedbackEligibility(null);
      setHasSubmittedFeedback(false);
      setFeedbackForm(createInitialFeedbackForm());
      try {
        const response = await apiService.getAnalysisResult(id);
        setResult(response.data);
        setSelectedSectionName(response.data.section_scores[0]?.section ?? null);
        if (isAdminViewer) {
          setFeedbackOpen(false);
          setFeedbackEligibilityLoading(false);
        } else {
          setFeedbackEligibilityLoading(true);
          try {
            const eligibilityResponse = await apiService.getFeedbackEligibility(id);
            setFeedbackEligibility(eligibilityResponse.data);
            setFeedbackOpen(eligibilityResponse.data.can_submit);
          } catch (eligibilityError) {
            setFeedbackEligibility({
              can_submit: false,
              reason: getApiErrorMessage(eligibilityError),
              existing_feedback_id: null,
            });
            setFeedbackOpen(false);
          } finally {
            setFeedbackEligibilityLoading(false);
          }
        }
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
        setFeedbackEligibilityLoading(false);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id, isAdminViewer]);

  const visibleIssues = useMemo(() => {
    if (!result) return [];
    if (activeTab === 'overview') return result.issues;
    return result.issues.filter((issue) => issue.criterion === activeTab);
  }, [activeTab, result]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          Đang tải kết quả phân tích...
        </div>
      </main>
    );
  }

  if (errorMessage || !result) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-red-700">Không thể mở kết quả</h1>
          <p className="mt-3 text-red-600">{errorMessage || 'Kết quả không tồn tại hoặc bạn không có quyền truy cập.'}</p>
          <Link className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700" to="/upload">
            Phân tích CV mới
          </Link>
        </div>
      </main>
    );
  }

  const formattedDate = result.created_at
    ? new Date(result.created_at).toLocaleDateString('vi-VN')
    : 'Chưa có ngày';
  const activeSectionScore = result.section_scores.find((section) => section.section === activeTab);
  const selectedSectionScore =
    result.section_scores.find((section) => section.section === selectedSectionName) ?? result.section_scores[0];

  const handleSectionScoreSelect = (section: string) => {
    setSelectedSectionName(section);
    setActiveTab(section);
  };

  const handleTabSelect = (tabKey: string) => {
    setActiveTab(tabKey);
    if (tabKey !== 'overview') {
      setSelectedSectionName(tabKey);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!id || !feedbackEligibility?.can_submit) return;
    setFeedbackSubmitting(true);
    setFeedbackMessage('');
    try {
      await apiService.submitFeedback({
        analysis_id: id,
        feedback_type: feedbackForm.feedback_type,
        rating: feedbackForm.rating,
        easy_to_understand: feedbackForm.easy_to_understand,
        recommendation_specific: feedbackForm.recommendation_specific,
        useful: feedbackForm.useful,
        inaccurate: feedbackForm.inaccurate,
        want_reanalyze: feedbackForm.want_reanalyze,
        willing_to_recommend: feedbackForm.willing_to_recommend,
        comment: feedbackForm.comment,
      });
      setFeedbackMessage('Cảm ơn bạn đã gửi phản hồi! Bạn có thể gửi thêm phản hồi bất cứ lúc nào trong chu kỳ hiện tại.');
      setFeedbackMessageTone('success');
      setHasSubmittedFeedback(true);
      setFeedbackForm(createInitialFeedbackForm());
      setFeedbackOpen(false);
    } catch (error) {
      setFeedbackMessage(getApiErrorMessage(error));
      setFeedbackMessageTone('error');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const handleReanalysisClick = () => {
    if (!id || isAdminViewer) return;
    void apiService.trackAnalyticsEvent('analysis_restarted', { analysis_id: id }).catch(() => undefined);
  };

  const handleFeedbackToggle = () => {
    if (!feedbackOpen && feedbackMessageTone === 'success') {
      setFeedbackMessage('');
    }
    setFeedbackOpen((current) => !current);
  };

  const canSubmitFeedback = feedbackEligibility?.can_submit === true;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {result.cv_name} · {result.role_name ?? 'Chưa rõ vị trí'} · {formattedDate}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Kết quả tổng quan</h1>
        </div>
        <Link
          to={isAdminViewer ? '/admin/feedback' : '/upload'}
          onClick={handleReanalysisClick}
          className="inline-flex justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          {isAdminViewer ? 'Quay lại phản hồi' : 'Phân tích CV khác'}
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.3fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex justify-center">
            <ScoreDonut score={result.total_score} />
          </div>
          <div className="mt-7 text-center">
            <p className="text-2xl font-bold text-blue-600">{result.classification}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">Mức sẵn sàng: {result.readiness_level}</p>
            <p className="mx-auto mt-3 max-w-xs leading-6 text-slate-500">{result.summary}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Điểm 6 section</h2>
          <p className="mt-2 text-sm text-slate-500">Tổng điểm được tính bằng tổng điểm các section, tối đa 100.</p>
          <div className="mt-6 space-y-3">
            {result.section_scores.map((score) => (
              <SectionScoreBar
                key={score.section}
                item={score}
                selected={selectedSectionScore?.section === score.section}
                onSelect={handleSectionScoreSelect}
              />
            ))}
          </div>
          {selectedSectionScore && <SectionSubScorePanel item={selectedSectionScore} />}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`border-b border-slate-200 p-6 ${isAdminViewer ? 'hidden' : ''}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Phản hồi sau phân tích</h2>
              <p className="text-sm text-slate-500">
                {canSubmitFeedback
                  ? hasSubmittedFeedback
                    ? 'Phản hồi của bạn đã được ghi nhận. Bạn có thể gửi thêm phản hồi nếu cần.'
                    : 'Mời bạn dành một phút đánh giá kết quả vừa nhận được.'
                  : 'Hiện tại bạn chưa thể gửi phản hồi cho kết quả này.'}
              </p>
            </div>
            <button
              type="button"
              disabled={feedbackEligibilityLoading || !canSubmitFeedback}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              onClick={handleFeedbackToggle}
            >
              {feedbackEligibilityLoading
                ? 'Đang kiểm tra...'
                : !canSubmitFeedback
                  ? 'Không thể gửi'
                  : feedbackOpen
                    ? 'Đóng biểu mẫu'
                    : hasSubmittedFeedback ? 'Gửi thêm phản hồi' : 'Gửi phản hồi'}
            </button>
          </div>
          {feedbackMessage && (
            <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              feedbackMessageTone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {feedbackMessage}
            </p>
          )}
          {!feedbackEligibilityLoading && !canSubmitFeedback && !feedbackMessage && feedbackEligibility?.reason && (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {feedbackEligibility.reason}
            </p>
          )}
          {feedbackOpen && canSubmitFeedback && (
            <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Loại phản hồi
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={feedbackForm.feedback_type}
                    onChange={(event) => setFeedbackForm((prev) => ({ ...prev, feedback_type: event.target.value as FeedbackType }))}
                  >
                    {feedbackTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Đánh giá tổng thể (1-5)
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={feedbackForm.rating}
                    onChange={(event) => setFeedbackForm((prev) => ({ ...prev, rating: Number(event.target.value) }))}
                  >
                    {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {feedbackQuestions.map((question) => (
                  <label key={question.key} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
                    <span className="block min-h-10 font-medium">{question.label}</span>
                    <select
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                      value={String(feedbackForm[question.key])}
                      onChange={(event) => setFeedbackForm((prev) => ({
                        ...prev,
                        [question.key]: event.target.value === 'true',
                      }))}
                    >
                      <option value="true">Có</option>
                      <option value="false">Không</option>
                    </select>
                  </label>
                ))}
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Bình luận
                <textarea
                  className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={feedbackForm.comment}
                  onChange={(event) => setFeedbackForm((prev) => ({ ...prev, comment: event.target.value }))}
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300" onClick={() => void handleFeedbackSubmit()} disabled={feedbackSubmitting || !canSubmitFeedback}>
                  {feedbackSubmitting ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
                <button type="button" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600" onClick={() => setFeedbackOpen(false)}>
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={[
                'min-h-14 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition',
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
              ].join(' ')}
              onClick={() => handleTabSelect(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="mb-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <h2 className="font-bold text-slate-900">Điểm mạnh</h2>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {(result.strengths.length ? result.strengths : ['CV đã có dữ liệu đủ để tạo đánh giá tổng quan.']).map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl bg-blue-50 p-5">
                  <h2 className="font-bold text-slate-900">Hành động ưu tiên</h2>
                  <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                    {result.priority_actions.map((item, index) => (
                      <li key={item}>
                        {index + 1}. {item}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-950">Technical Skill Assessment</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <SkillList title="Bắt buộc đã có" items={result.technical_skill_assessment.matched_required_skills} tone="green" />
                  <SkillList title="Bắt buộc còn thiếu" items={result.technical_skill_assessment.missing_required_skills} tone="amber" />
                  <SkillList title="Quan trọng đã có" items={result.technical_skill_assessment.matched_important_skills} tone="blue" />
                  <SkillList title="Quan trọng còn thiếu" items={result.technical_skill_assessment.missing_important_skills} tone="amber" />
                  <SkillList title="Nice-to-have đã có" items={result.technical_skill_assessment.matched_nice_to_have_skills} tone="slate" />
                  <SkillList title="Nice-to-have còn thiếu" items={result.technical_skill_assessment.missing_nice_to_have_skills} tone="slate" />
                </div>
              </div>

              {result.roadmap_recommendation.length > 0 && (
                <RoadmapTree phases={result.roadmap_recommendation} roleName={result.role_name} />
              )}
            </div>
          )}

          {activeTab !== 'overview' && activeSectionScore && (
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-bold text-blue-700">{activeSectionScore.section}</h2>
                <span className="font-bold text-blue-700">
                  {activeSectionScore.score}/{activeSectionScore.max_score}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-blue-700">{activeSectionScore.comment}</p>
              {(activeSectionScore.strengths?.length || activeSectionScore.suggestions?.length) && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-bold text-blue-700">Điểm mạnh</h3>
                    <ul className="mt-2 space-y-1 text-sm text-blue-700">
                      {(activeSectionScore.strengths ?? []).map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-blue-700">Gợi ý</h3>
                    <ul className="mt-2 space-y-1 text-sm text-blue-700">
                      {(activeSectionScore.suggestions ?? []).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          <h2 className="text-xl font-bold text-slate-950">Tóm tắt phát hiện</h2>
          <div className="mt-5 space-y-4">
            {visibleIssues.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                Chưa có phát hiện riêng cho tiêu chí này.
              </div>
            ) : (
              visibleIssues.map((issue) => <IssueCard key={issue.issue_id} issue={issue} />)
            )}
          </div>
        </div>
      </section>

      <p className="mt-6 text-sm leading-6 text-slate-500">
        Điểm số là đánh giá hỗ trợ cải thiện CV, không phải kết luận tuyển dụng. Hãy chỉ bổ sung thông tin đúng với trải
        nghiệm thực tế của bạn.
      </p>
    </main>
  );
}
