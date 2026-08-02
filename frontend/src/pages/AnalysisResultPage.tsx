import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiService, getApiErrorMessage } from '../services/api';
import type { AnalysisIssue, AnalysisResult, SectionScore } from '../types';

const tabs = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'Professional Summary', label: 'Giới thiệu' },
  { key: 'Education', label: 'Học vấn' },
  { key: 'Experience', label: 'Kinh nghiệm' },
  { key: 'Projects', label: 'Dự án' },
  { key: 'Technical Skills', label: 'Kỹ năng' },
  { key: 'Certifications', label: 'Chứng chỉ' },
];

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

function SectionScoreBar({ item }: { item: SectionScore }) {
  const percentage = item.max_score > 0 ? Math.round((item.score / item.max_score) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">{item.section}</span>
        <span className={percentage >= 78 ? 'font-bold text-green-600' : percentage >= 65 ? 'font-bold text-amber-600' : 'font-bold text-blue-600'}>
          {item.score}/{item.max_score}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${scoreBarColor(percentage)}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{item.comment}</p>
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

  useEffect(() => {
    const fetchResult = async () => {
      if (!id) return;
      setLoading(true);
      setErrorMessage('');
      try {
        const response = await apiService.getAnalysisResult(id);
        setResult(response.data);
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
          <div className="mt-6 space-y-5">
            {result.section_scores.map((score) => (
              <SectionScoreBar key={score.section} item={score} />
            ))}
          </div>
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
              onClick={() => setActiveTab(tab.key)}
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
                <div>
                <h2 className="text-xl font-bold text-slate-950">Roadmap Recommendation</h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {result.roadmap_recommendation.map((phase) => (
                    <article key={phase.phase} className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 className="font-bold text-slate-900">{phase.phase}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{phase.goal}</p>
                      {phase.skills.length > 0 && (
                        <p className="mt-3 text-sm text-slate-500">
                          <span className="font-semibold text-slate-700">Kỹ năng: </span>
                          {phase.skills.join(', ')}
                        </p>
                      )}
                      {phase.output && <p className="mt-2 text-sm text-blue-700">Output: {phase.output}</p>}
                      {phase.reason && <p className="mt-2 text-xs leading-5 text-slate-500">{phase.reason}</p>}
                    </article>
                  ))}
                </div>
                </div>
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
