import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiService, getApiErrorMessage } from '../services/api';
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

const fallbackSectionCriteria: Record<string, string[]> = {
  'Professional Summary': [
    '0 điểm nếu thiếu section.',
    'Tối đa 2 điểm: viết rõ ràng, ngắn gọn, đúng vai trò ứng tuyển.',
    'Tối đa 3 điểm: nêu được định hướng hoặc chuyên môn liên quan trực tiếp role.',
    'Tối đa 3 điểm: có nhắc kỹ năng/công nghệ trọng tâm của role.',
    'Tối đa 2 điểm: có dấu hiệu về impact, kinh nghiệm, hoặc điểm mạnh nổi bật.',
  ],
  Education: [
    '0 điểm nếu thiếu section.',
    'Tối đa 4 điểm: có trường, ngành, bậc học, thời gian học rõ ràng.',
    'Tối đa 3 điểm: coursework/đồ án/môn học liên quan đến role.',
    'Tối đa 2 điểm: GPA, giải thưởng, học bổng, thành tích học thuật nếu có.',
    'Tối đa 1 điểm: trình bày dễ đọc, không mơ hồ.',
  ],
  Experience: [
    '0 điểm nếu thiếu section.',
    'Tối đa 6 điểm: kinh nghiệm liên quan trực tiếp đến role mục tiêu.',
    'Tối đa 5 điểm: mô tả trách nhiệm gắn với skill_score quan trọng.',
    'Tối đa 4 điểm: có kết quả đo lường được, impact, hoặc phạm vi hệ thống.',
    'Tối đa 3 điểm: thể hiện ownership, seniority, teamwork, hoặc domain context.',
    'Tối đa 2 điểm: timeline, company, title rõ ràng.',
  ],
  Projects: [
    '0 điểm nếu thiếu section.',
    'Tối đa 5 điểm: project liên quan trực tiếp role và skill_score quan trọng.',
    'Tối đa 4 điểm: có technical depth như architecture, API, model, database, deployment.',
    'Tối đa 3 điểm: có kết quả, demo, GitHub, metric, user, hoặc deployment.',
    'Tối đa 3 điểm: nêu rõ vai trò cá nhân, bài toán, và giải pháp.',
  ],
  'Technical Skills': [
    '0 điểm nếu thiếu hoàn toàn bằng chứng kỹ năng.',
    'Technical Skills là section quan trọng nhất, tối đa 35 điểm.',
    'Chấm theo skill_scores của role: 3 = bắt buộc, 2 = quan trọng, 1 = nice to have, 0 = không tính điểm.',
    'Skill_score 3 chiếm 60% điểm Technical Skills, skill_score 2 chiếm 30%, skill_score 1 chiếm 10%.',
    'Mức bằng chứng cho từng skill: 0 = không thấy; 1 = nhắc mơ hồ; 2 = liệt kê rõ trong skills/cert/course; 3 = có dùng trong project/experience với ngữ cảnh cụ thể.',
    'Tên sản phẩm AI như ChatGPT, Claude, Codex, Gemini chỉ thể hiện biết dùng công cụ, không tự động tính là skill Generative AI/LLM/Prompt Engineering nếu thiếu bằng chứng kỹ thuật.',
    'Nếu thiếu section Technical Skills nhưng skill xuất hiện ở Experience/Projects, vẫn ghi nhận nhưng điểm Technical Skills tối đa 70%.',
  ],
  Certifications: [
    '0 điểm nếu thiếu section.',
    'Tối đa 5 điểm: chứng chỉ/khóa học liên quan trực tiếp role.',
    'Tối đa 3 điểm: chứng chỉ bù vào skill bắt buộc hoặc quan trọng đang thiếu.',
    'Tối đa 2 điểm: issuer, thời gian, credential/link rõ ràng và đáng tin.',
  ],
};

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

function formatScore(value: number) {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function getSectionCriteria(item: SectionScore) {
  return item.criteria?.length ? item.criteria : fallbackSectionCriteria[item.section] ?? [];
}

function getSectionSubScores(item: SectionScore) {
  return (item.sub_scores ?? []).filter((subScore) => subScore.max_score > 0);
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
  const skills = phase.skills.length ? phase.skills : ['Cập nhật theo role mục tiêu'];
  const splitAt = Math.ceil(skills.length / Math.min(2, skills.length));
  const chunks = skills.length > 1 ? [skills.slice(0, splitAt), skills.slice(splitAt)] : [skills];

  return chunks
    .filter((items) => items.length > 0)
    .map((items, groupIndex) => ({
      title: groupTitles[groupIndex] ?? `Nhóm kỹ năng ${groupIndex + 1}`,
      items,
    }));
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
      aria-controls="section-score-criteria"
      aria-expanded={selected}
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

function SectionCriteriaPanel({ item }: { item: SectionScore }) {
  const criteria = getSectionCriteria(item);
  const subScores = getSectionSubScores(item);
  const subScoreTotal = subScores.reduce((total, subScore) => total + subScore.score, 0);
  const subScoreMax = subScores.reduce((total, subScore) => total + subScore.max_score, 0);

  return (
    <div id="section-score-criteria" className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-bold text-blue-800">Tiêu chí tham chiếu: {item.section}</h3>
        <span className="text-sm font-bold text-blue-700">
          {item.score}/{item.max_score}
        </span>
      </div>
      <ol className="mt-3 space-y-2 text-sm leading-6 text-blue-900">
        {criteria.map((criterion, index) => (
          <li key={criterion} className="flex gap-3">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-blue-700">
              {index + 1}
            </span>
            <span>{criterion}</span>
          </li>
        ))}
      </ol>
      {criteria.length === 0 && <p className="mt-3 text-sm text-blue-700">{item.comment}</p>}
      {subScores.length > 0 && (
        <div className="mt-5 border-t border-blue-100 pt-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="font-bold text-blue-800">Điểm thành phần</h4>
            <span className="text-xs font-bold text-blue-700">
              {formatScore(subScoreTotal)}/{formatScore(subScoreMax)}
            </span>
          </div>
          <div className="mt-3 space-y-3">
            {subScores.map((subScore, index) => {
              const percentage = Math.max(0, Math.min(100, Math.round((subScore.score / subScore.max_score) * 100)));
              return (
                <div key={`${subScore.label}-${index}`} className="rounded-xl bg-white/80 p-3">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="font-semibold text-slate-700">{subScore.label}</span>
                    <span className={`shrink-0 font-bold ${scoreTextColor(percentage)}`}>
                      {formatScore(subScore.score)}/{formatScore(subScore.max_score)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${scoreBarColor(percentage)}`} style={{ width: `${percentage}%` }} />
                  </div>
                  {subScore.description && <p className="mt-2 text-xs leading-5 text-slate-500">{subScore.description}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function RoadmapTree({ phases, roleName }: { phases: RoadmapPhase[]; roleName?: string | null }) {
  const [openPhases, setOpenPhases] = useState<Set<number>>(() => new Set(phases.map((_, index) => index)));

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
          {phases.map((phase, index) => {
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
                          {groups.map((group) => (
                            <div key={group.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                              <div className="bg-slate-300 px-4 py-3">
                                <p className="font-mono text-xs font-extrabold uppercase tracking-[0.16em] text-slate-700">{group.title}</p>
                              </div>
                              <div className="space-y-2 bg-white px-3 py-3">
                                {group.items.map((skill) => (
                                  <div
                                    key={skill}
                                    className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-semibold text-slate-800"
                                  >
                                    {skill}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
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
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      if (!id) return;
      setLoading(true);
      setErrorMessage('');
      try {
        const response = await apiService.getAnalysisResult(id);
        setResult(response.data);
        setSelectedSectionName(response.data.section_scores[0]?.section ?? null);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [id]);

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
          to="/upload"
          className="inline-flex justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Phân tích CV khác
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
          {selectedSectionScore && <SectionCriteriaPanel item={selectedSectionScore} />}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
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
