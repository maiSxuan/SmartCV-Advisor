export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthUser {
  user_id: string;
  account_id: string;
  full_name: string;
  email: string;
  role: 'registered' | 'premium' | 'admin' | string;
  account_type: 'registered' | 'premium' | 'admin' | string;
  status: string;
  email_verified: boolean;
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_at: string;
  refresh_expires_at: string;
}

export interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  industry_interest: string;
  target_role: string;
  current_level: string;
  account_type: 'registered' | 'premium' | string;
  account_status: string;
  registered_at: string;
  updated_at: string | null;
  privacy: {
    training_opt_in: boolean;
    cv_count: number;
    deletion_request_status: string | null;
  };
  uploaded_cvs: UploadedCvSummary[];
  data_deletion_requests: DataDeletionRequestSummary[];
}

export interface UploadedCvSummary {
  cv_id: string;
  filename: string;
  uploaded_at: string;
  target_role_id: string | null;
  target_role_name: string | null;
  status: string;
}

export interface DataDeletionRequestSummary {
  request_id: string;
  scope: string;
  reason: string;
  status: string;
  requested_at: string;
  resolved_at: string | null;
}

export interface CareerRole {
  role_id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  icon_label?: string;
}

export interface AdminCareerRole extends CareerRole {
  created_at: string | null;
  updated_at: string | null;
  skill_count: number;
  analysis_count: number;
  scoring_config_version?: string | null;
}

export interface AdminSkillConfig {
  config_id: string;
  role_id: string;
  skill_id: string;
  skill_name: string;
  skill_group: string;
  required_score: number;
  weight: number;
  importance: 0 | 1 | 2 | 3;
  importance_label: string;
  criteria_description: string;
  status: 'active' | 'inactive';
  updated_at: string | null;
}

export interface AdminUserSummary {
  user_id: string;
  account_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  account_type: 'registered' | 'premium' | 'admin' | string;
  role: 'registered' | 'premium' | 'admin' | string;
  status: 'active' | 'locked';
  registered_at: string | null;
  last_login_at: string | null;
  industry_interest: string;
  target_role: string;
  current_level: string;
  analysis_count: number;
  lock_reason?: string | null;
  locked_at?: string | null;
}

export interface AdminUserDetail extends AdminUserSummary {
  recent_cvs: Array<{
    cv_id: string;
    filename: string;
    status: string;
    uploaded_at: string | null;
  }>;
}

export interface UploadedCv {
  cv_id: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  size_label: string;
  status: string;
  uploaded_at: string;
  target_role_id: string | null;
  extraction: {
    text_length: number;
    page_count: number | null;
    method: string;
    language_hints: string[];
    warnings: string[];
    quality_score: number;
  };
}

export interface CriteriaScore {
  key: 'layout' | 'content' | 'keywords' | 'style' | 'ats';
  label: string;
  score: number;
  color: 'green' | 'orange' | 'blue';
}

export interface SectionScore {
  section: string;
  raw_score?: number;
  score: number;
  max_score: number;
  word_count: number | null;
  comment: string;
  criteria?: string[];
  sub_scores?: SectionSubScore[];
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
}

export interface SectionSubScore {
  label: string;
  score: number;
  max_score: number;
  description: string;
}

export interface SkillEvidence {
  skill: string;
  group: string;
  importance: number;
  evidence_level: number;
  found_sections: string[];
  status: 'matched' | 'missing' | string;
}

export interface TechnicalSkillAssessment {
  required_skills: string[];
  important_skills: string[];
  nice_to_have_skills: string[];
  not_required_skills: string[];
  matched_required_skills: string[];
  matched_important_skills: string[];
  matched_nice_to_have_skills: string[];
  missing_required_skills: string[];
  missing_important_skills: string[];
  missing_nice_to_have_skills: string[];
  core_skills_found: string[];
  supporting_skills_found: string[];
  nice_to_have_skills_found: string[];
  high_priority_missing_skills: string[];
  medium_priority_missing_skills: string[];
  nice_to_have_missing_skills: string[];
  do_not_penalize_missing_skills: string[];
}

export interface RoadmapPhase {
  phase: string;
  goal: string;
  skills: string[];
  output: string;
  reason: string;
}

export interface AnalysisIssue {
  issue_id: string;
  criterion: string;
  severity: 'high' | 'medium' | 'positive';
  severity_label: string;
  title: string;
  description: string;
  impact: string;
}

export interface AnalysisResult {
  analysis_id: string;
  cv_id: string;
  cv_name: string;
  file_type: string;
  file_size_label: string;
  role_id: string | null;
  role_name: string | null;
  role_description: string | null;
  created_at: string;
  status: string;
  total_score: number;
  classification: string;
  summary: string;
  criteria_scores: CriteriaScore[];
  section_scores: SectionScore[];
  skill_assessment: SkillEvidence[];
  technical_skill_assessment: TechnicalSkillAssessment;
  roadmap_recommendation: RoadmapPhase[];
  readiness_level: string;
  issues: AnalysisIssue[];
  strengths: string[];
  weaknesses: string[];
  priority_actions: string[];
  scoring_config_version: string;
}

export interface HistoryItem {
  analysis_id: string;
  cv_name: string;
  overall_score: number;
  classification?: string;
  role_id?: string | null;
  role_name?: string | null;
  created_at: string;
  status: string;
}
