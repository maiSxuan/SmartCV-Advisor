"""Deterministic CV analysis and role-weighted scoring services."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

# pyrefly: ignore [missing-import]
from fastapi import HTTPException, status
# pyrefly: ignore [missing-import]
from pymongo.errors import ConfigurationError, PyMongoError, ServerSelectionTimeoutError

from app.services.cv_service import STANDARD_SECTIONS, format_file_size, normalize_search_text
from app.services.gpt_service import evaluate_sections_with_gpt, normalize_list
from app.services.role_dataset import load_default_roles


SCORING_CONFIG_VERSION = "notebook-section-roadmap-v3"
TOTAL_SCORE_SCALE = 1.25

IMPORTANCE_LABELS = {
    0: "Không cần có",
    1: "Nice to have",
    2: "Quan trọng",
    3: "Rất quan trọng / bắt buộc",
}

SECTION_WEIGHTS = {
    "Professional Summary": 10,
    "Education": 10,
    "Experience": 20,
    "Projects": 15,
    "Technical Skills": 35,
    "Certifications": 10,
}

DEFAULT_ROLES = [
    {
        "role_id": "NG_FRONTEND",
        "name": "Frontend Developer",
        "description": "Phát triển giao diện người dùng với HTML, CSS, JavaScript và các framework hiện đại.",
        "status": "active",
        "skills": [
            {"skill": "HTML", "group": "Frontend", "importance": 3},
            {"skill": "CSS", "group": "Frontend", "importance": 3},
            {"skill": "JavaScript", "group": "Frontend", "importance": 3},
            {"skill": "ReactJS", "group": "Frontend", "importance": 3},
            {"skill": "REST API", "group": "Integration", "importance": 2},
            {"skill": "Git", "group": "Tools", "importance": 2},
            {"skill": "TypeScript", "group": "Frontend", "importance": 2},
            {"skill": "Tailwind CSS", "group": "Frontend", "importance": 1},
        ],
    },
    {
        "role_id": "NG_BACKEND",
        "name": "Backend Developer",
        "description": "Xây dựng API, xử lý logic phía server, thiết kế cơ sở dữ liệu và vận hành dịch vụ.",
        "status": "active",
        "skills": [
            {"skill": "Python", "group": "Backend", "importance": 3},
            {"skill": "REST API", "group": "Backend", "importance": 3},
            {"skill": "SQL", "group": "Database", "importance": 2},
            {"skill": "MongoDB", "group": "Database", "importance": 2},
            {"skill": "Docker", "group": "DevOps", "importance": 1},
            {"skill": "Git", "group": "Tools", "importance": 2},
        ],
    },
    {
        "role_id": "NG_FULLSTACK",
        "name": "Full-stack Developer",
        "description": "Phát triển cả giao diện và backend, từ database đến UI.",
        "status": "active",
        "skills": [
            {"skill": "JavaScript", "group": "Frontend", "importance": 3},
            {"skill": "ReactJS", "group": "Frontend", "importance": 2},
            {"skill": "REST API", "group": "Backend", "importance": 3},
            {"skill": "SQL", "group": "Database", "importance": 2},
            {"skill": "MongoDB", "group": "Database", "importance": 1},
            {"skill": "Git", "group": "Tools", "importance": 2},
        ],
    },
    {
        "role_id": "NG_DATA",
        "name": "Data Analyst",
        "description": "Phân tích dữ liệu, xây dựng báo cáo và trích xuất insight kinh doanh.",
        "status": "active",
        "skills": [
            {"skill": "SQL", "group": "Analytics", "importance": 3},
            {"skill": "Excel", "group": "Analytics", "importance": 2},
            {"skill": "Python", "group": "Analytics", "importance": 2},
            {"skill": "Pandas", "group": "Analytics", "importance": 2},
            {"skill": "Power BI", "group": "Visualization", "importance": 2},
            {"skill": "Statistics", "group": "Foundation", "importance": 2},
        ],
    },
    {
        "role_id": "NG_UIUX",
        "name": "UI/UX Designer",
        "description": "Thiết kế trải nghiệm người dùng, wireframe, prototype và hệ thống thiết kế.",
        "status": "active",
        "skills": [
            {"skill": "Figma", "group": "Design", "importance": 3},
            {"skill": "Wireframe", "group": "Design", "importance": 3},
            {"skill": "Prototype", "group": "Design", "importance": 2},
            {"skill": "User Research", "group": "Research", "importance": 2},
            {"skill": "Design System", "group": "Design", "importance": 2},
            {"skill": "Usability Testing", "group": "Research", "importance": 1},
        ],
    },
    {
        "role_id": "NG_QA",
        "name": "QA/QC Engineer",
        "description": "Kiểm thử phần mềm, xây dựng test case và đảm bảo chất lượng sản phẩm.",
        "status": "active",
        "skills": [
            {"skill": "Test Case", "group": "Testing", "importance": 3},
            {"skill": "Manual Testing", "group": "Testing", "importance": 3},
            {"skill": "API Testing", "group": "Testing", "importance": 2},
            {"skill": "Automation Testing", "group": "Testing", "importance": 2},
            {"skill": "Bug Tracking", "group": "Tools", "importance": 2},
            {"skill": "SQL", "group": "Database", "importance": 1},
        ],
    },
]

SKILL_KEYWORD_MAP = {
    "reactjs": ["react", "reactjs"],
    "rest api": ["rest api", "api"],
    "javascript": ["javascript", "js"],
    "typescript": ["typescript", "ts"],
    "tailwind css": ["tailwind", "tailwindcss"],
    "mongodb": ["mongodb", "mongo"],
    "sql": ["sql", "mysql", "postgresql", "postgres"],
    "python": ["python"],
    "pandas": ["pandas"],
    "power bi": ["power bi", "powerbi"],
    "figma": ["figma"],
    "wireframe": ["wireframe", "wireframes"],
    "prototype": ["prototype", "prototyping"],
    "test case": ["test case", "testcase", "test cases"],
    "api testing": ["api testing", "postman"],
    "automation testing": ["automation testing", "selenium", "cypress", "playwright"],
    "bug tracking": ["bug tracking", "jira"],
    "ai demo uis (streamlit/gradio/chainlit)": ["streamlit", "gradio", "chainlit"],
    "machine learning theory & scikit-learn": ["machine learning", "scikit-learn", "scikit learn", "sklearn"],
    "deep learning frameworks (pytorch)": ["pytorch", "torch"],
    "deep learning frameworks (tensorflow/keras)": ["tensorflow", "keras"],
    "generative ai, llms & prompt engineering": [
        "generative ai",
        "llm",
        "llms",
        "large language model",
        "large language models",
        "prompt engineering",
        "openai api",
        "anthropic api",
        "claude api",
        "gemini api",
    ],
    "retrieval-augmented generation (rag) systems": [
        "rag",
        "retrieval augmented generation",
        "retrieval-augmented generation",
        "vector embedding",
        "vector embeddings",
        "semantic search",
    ],
    "agentic ai & multi-agent frameworks (langchain/autogen)": [
        "agentic ai",
        "multi-agent",
        "multi agent",
        "langchain",
        "langgraph",
        "llamaindex",
        "llama index",
        "autogen",
        "crewai",
    ],
    "ai evaluation, validation & benchmarking": [
        "ai evaluation",
        "model evaluation",
        "llm evaluation",
        "evals",
        "benchmarking",
        "validation",
    ],
    "ai security, jailbreak defense & data privacy": [
        "ai security",
        "jailbreak defense",
        "prompt injection",
        "data privacy",
        "llm security",
    ],
    "ai ethics, governance & bias mitigation": [
        "ai ethics",
        "ai governance",
        "bias mitigation",
        "responsible ai",
    ],
}

GENERIC_SKILL_KEYWORD_STOPWORDS = {
    "core",
    "async",
    "performance optimization",
    "data extraction",
    "querying",
    "frameworks",
    "systems",
    "platforms",
    "tools",
    "engineering",
    "theory",
    "validation",
}

AI_TOOL_ONLY_TERMS = [
    "chatgpt",
    "claude",
    "codex",
    "gemini",
    "copilot",
    "perplexity",
    "bard",
]

AI_ENGINEERING_EVIDENCE_TERMS = [
    "prompt engineering",
    "system prompt",
    "openai api",
    "anthropic api",
    "claude api",
    "gemini api",
    "llm api",
    "large language model",
    "rag",
    "retrieval augmented generation",
    "retrieval-augmented generation",
    "embedding",
    "embeddings",
    "vector database",
    "vector databases",
    "langchain",
    "langgraph",
    "llamaindex",
    "llama index",
    "autogen",
    "crewai",
    "fine tuning",
    "fine-tuning",
    "model serving",
    "model evaluation",
    "llm evaluation",
    "ai evaluation",
    "streamlit",
    "gradio",
    "chainlit",
    "prompt injection",
    "jailbreak defense",
    "llm security",
    "ai governance",
    "responsible ai",
    "bias mitigation",
]

AI_TOOL_SENSITIVE_SKILL_MARKERS = [
    "generative ai",
    "llms",
    "prompt engineering",
    "retrieval-augmented generation",
    "rag",
    "agentic ai",
    "multi-agent",
    "ai demo uis",
    "ai evaluation",
    "ai security",
    "ai ethics",
    "ai governance",
]

ROLE_ICON_LABELS = {
    "NG_FRONTEND": "FE",
    "NG_BACKEND": "BE",
    "NG_FULLSTACK": "FS",
    "NG_DATA": "DA",
    "NG_UIUX": "UX",
    "NG_QA": "QA",
}

LEGACY_ROLE_ID_ALIASES = {
    "NG_BACKEND": "IT-ROLE-001",
    "NG_FRONTEND": "IT-ROLE-002",
    "NG_FULLSTACK": "IT-ROLE-003",
    "NG_DATA": "IT-ROLE-007",
}

try:
    DATASET_ROLES = load_default_roles()
except Exception:
    DATASET_ROLES = []

if DATASET_ROLES:
    DEFAULT_ROLES = DATASET_ROLES
    ROLE_ICON_LABELS = {role["role_id"]: role.get("icon_label", "IT") for role in DEFAULT_ROLES}

DATABASE_ERRORS = (ConfigurationError, PyMongoError, ServerSelectionTimeoutError)

DEMO_CV = {
    "_id": "CV001",
    "Loai": "pdf",
    "DungLuong": 1843 * 1024,
    "TenFileGoc": "Tran_Minh_An_Frontend_CV.pdf",
    "TrangThai": "completed",
    "MaNganh": "NG_FRONTEND",
    "MaKH": "KH001",
}

DEMO_RESULT = {
    "_id": "KQ001",
    "DiemTongQuan": 72,
    "XepLoai": "Khá",
    "NhanXetTQ": "CV đã có nền tảng tốt nhưng cần làm rõ kết quả và chuẩn hóa định dạng.",
    "ThoiDiemPT": "2026-07-10T00:00:00+00:00",
    "MaCV": "CV001",
    "MaNganh": "NG_FRONTEND",
    "DiemBoCuc": 82,
    "DiemNoiDung": 68,
    "DiemTuKhoa": 70,
    "DiemVanPhong": 74,
    "DiemATS": 66,
    "DiemPhanGT": 7.0,
    "DiemTDHV": 8.0,
    "DiemKNLV": 12.0,
    "DiemDoAn": 10.0,
    "DiemTechSkill": 27.0,
    "DiemCert": 8.0,
}


def normalize_role_document(document: dict[str, Any], skills: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    role_id = document.get("_id") or document.get("role_id")
    return {
        "role_id": role_id,
        "name": document.get("TenNganh") or document.get("name"),
        "description": document.get("MoTa") or document.get("description", ""),
        "status": "active"
        if str(document.get("TrangThai", document.get("status", "active"))).lower() in {"active", "hoat dong", "hoạt động"}
        else "inactive",
        "skills": skills or document.get("skills", []),
        "icon_label": ROLE_ICON_LABELS.get(str(role_id), "IT"),
    }


async def list_career_roles(db: Any) -> list[dict[str, Any]]:
    roles_by_id = {role["role_id"]: role for role in DEFAULT_ROLES}
    merged_roles = {role_id: dict(role) for role_id, role in roles_by_id.items()}

    try:
        cursor = db["NGANHNGHIET"].find({}).sort("TenNganh", 1)
        documents = await cursor.to_list(length=500)
    except Exception:
        documents = []

    canonical_document_ids = {
        str(document.get("_id") or document.get("role_id"))
        for document in documents
        if str(document.get("_id") or document.get("role_id")) in roles_by_id
    }

    for document in documents:
        role = normalize_role_document(document)
        original_role_id = str(role["role_id"])
        canonical_role_id = LEGACY_ROLE_ID_ALIASES.get(original_role_id, original_role_id)
        fallback = roles_by_id.get(canonical_role_id)

        if original_role_id != canonical_role_id and canonical_role_id in canonical_document_ids:
            continue

        if fallback:
            merged_role = dict(fallback)
            merged_role["role_id"] = canonical_role_id
            merged_role["status"] = role["status"]
            if original_role_id == canonical_role_id:
                merged_role["name"] = role["name"] or fallback["name"]
                merged_role["description"] = role["description"] or fallback["description"]
                merged_role["skills"] = role["skills"] or fallback.get("skills", [])
            merged_role["icon_label"] = ROLE_ICON_LABELS.get(canonical_role_id, fallback.get("icon_label", "IT"))
            merged_roles[canonical_role_id] = merged_role
            continue

        role["role_id"] = canonical_role_id
        role["icon_label"] = ROLE_ICON_LABELS.get(canonical_role_id, role.get("icon_label", "IT"))
        merged_roles[canonical_role_id] = role

    return sorted(merged_roles.values(), key=lambda item: item.get("name") or "")


async def get_role_by_id(db: Any, role_id: str) -> dict[str, Any]:
    resolved_role_id = LEGACY_ROLE_ID_ALIASES.get(role_id, role_id)
    roles = await list_career_roles(db)
    for role in roles:
        if role["role_id"] == resolved_role_id:
            return role
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"code": "ROLE_NOT_FOUND", "message": "Không tìm thấy vị trí mục tiêu."},
    )


def skill_to_keywords(skill_name: str) -> list[str]:
    normalized = normalize_search_text(skill_name)
    mapped = SKILL_KEYWORD_MAP.get(normalized)
    if mapped:
        return sorted({keyword for keyword in mapped if len(keyword) > 1})

    base = re.sub(r"\(.*?\)", " ", normalized)
    parenthetical_parts = " ".join(re.findall(r"\((.*?)\)", normalized))
    candidates = [normalized, base]
    candidates.extend(re.split(r"[/,&]|\band\b|\bor\b", base))
    candidates.extend(re.split(r"[/,&]|\band\b|\bor\b", parenthetical_parts))

    keywords: set[str] = set()
    for candidate in candidates:
        cleaned = re.sub(r"\s+", " ", candidate).strip(" -")
        if not cleaned or cleaned in GENERIC_SKILL_KEYWORD_STOPWORDS:
            continue
        if " " not in cleaned and cleaned in GENERIC_SKILL_KEYWORD_STOPWORDS:
            continue
        if len(cleaned) > 1:
            keywords.add(cleaned)
    return sorted(keywords)


def contains_keyword(text: str, keyword: str) -> bool:
    pattern = r"(?<![a-z0-9])" + re.escape(keyword.lower()) + r"(?![a-z0-9])"
    return re.search(pattern, text.lower()) is not None


def is_ai_tool_sensitive_skill(skill_name: str) -> bool:
    normalized = normalize_search_text(skill_name)
    return any(marker in normalized for marker in AI_TOOL_SENSITIVE_SKILL_MARKERS)


def has_ai_engineering_evidence(text: str) -> bool:
    normalized = normalize_search_text(text)
    return any(contains_keyword(normalized, term) for term in AI_ENGINEERING_EVIDENCE_TERMS)


def is_ai_tool_only_evidence(skill_name: str, text: str, matched_keywords: list[str]) -> bool:
    if not is_ai_tool_sensitive_skill(skill_name):
        return False

    normalized_text = normalize_search_text(text)
    has_named_tool = any(contains_keyword(normalized_text, term) for term in AI_TOOL_ONLY_TERMS)
    has_engineering_evidence = has_ai_engineering_evidence(normalized_text)
    weak_ai_keywords = {"ai", "llm", "llms", "generative ai"}
    matched_keyword_set = {normalize_search_text(keyword) for keyword in matched_keywords}

    return (has_named_tool or bool(matched_keyword_set & weak_ai_keywords)) and not has_engineering_evidence


def section_word_count(sections: dict[str, str], section_name: str) -> int:
    return len(sections.get(section_name, "").split())


def detect_skill_evidence(sections: dict[str, str], role: dict[str, Any]) -> list[dict[str, Any]]:
    normalized_sections = {
        section: normalize_search_text(content)
        for section, content in sections.items()
    }
    assessment: list[dict[str, Any]] = []

    for skill_config in role.get("skills", []):
        skill = skill_config["skill"]
        keywords = skill_to_keywords(skill)
        section_matches = {
            section: [
                keyword
                for keyword in keywords
                if contains_keyword(content, keyword)
            ]
            for section, content in normalized_sections.items()
        }
        found_sections = [section for section, matches in section_matches.items() if matches]
        matched_keywords = sorted({keyword for matches in section_matches.values() for keyword in matches})
        evidence_text = "\n".join(sections.get(section, "") for section in found_sections)

        if found_sections and is_ai_tool_only_evidence(skill, evidence_text, matched_keywords):
            found_sections = []
            matched_keywords = []

        evidence_level = 0
        if found_sections:
            evidence_level = 1
        if any(section in found_sections for section in ["Technical Skills", "Education", "Certifications"]):
            evidence_level = 2
        if any(section in found_sections for section in ["Experience", "Projects"]):
            evidence_level = 3

        assessment.append(
            {
                "skill": skill,
                "group": skill_config.get("group", "General"),
                "importance": int(skill_config.get("importance", 0)),
                "evidence_level": evidence_level,
                "found_sections": found_sections,
                "matched_keywords": matched_keywords,
                "status": "matched" if evidence_level > 0 else "missing",
            }
        )

    return assessment


def skill_label(item: dict[str, Any]) -> str:
    group = item.get("group", "General")
    skill = item.get("skill", "")
    evidence_sections = item.get("found_sections", [])
    suffix = f" ({', '.join(evidence_sections)})" if evidence_sections else ""
    return f"{skill} - {group}{suffix}"


def build_technical_skill_assessment(skill_assessment: list[dict[str, Any]]) -> dict[str, list[str]]:
    def names(*, importance: int, matched: bool | None = None) -> list[str]:
        items = [item for item in skill_assessment if int(item.get("importance", 0)) == importance]
        if matched is True:
            items = [item for item in items if int(item.get("evidence_level", 0)) > 0]
        elif matched is False:
            items = [item for item in items if int(item.get("evidence_level", 0)) == 0]
        return [skill_label(item) for item in items]

    return {
        "required_skills": names(importance=3),
        "important_skills": names(importance=2),
        "nice_to_have_skills": names(importance=1),
        "not_required_skills": names(importance=0),
        "matched_required_skills": names(importance=3, matched=True),
        "matched_important_skills": names(importance=2, matched=True),
        "matched_nice_to_have_skills": names(importance=1, matched=True),
        "missing_required_skills": names(importance=3, matched=False),
        "missing_important_skills": names(importance=2, matched=False),
        "missing_nice_to_have_skills": names(importance=1, matched=False),
        "core_skills_found": names(importance=3, matched=True),
        "supporting_skills_found": names(importance=2, matched=True),
        "nice_to_have_skills_found": names(importance=1, matched=True),
        "high_priority_missing_skills": names(importance=3, matched=False),
        "medium_priority_missing_skills": names(importance=2, matched=False),
        "nice_to_have_missing_skills": names(importance=1, matched=False),
        "do_not_penalize_missing_skills": names(importance=0),
    }


def filter_ai_tool_only_skill_labels(values: list[str], sections: dict[str, str] | None) -> list[str]:
    if not sections:
        return values

    cv_text = "\n".join(sections.values())
    if has_ai_engineering_evidence(cv_text):
        return values

    return [
        value
        for value in values
        if not is_ai_tool_sensitive_skill(value)
    ]


def normalize_technical_skill_assessment(
    gpt_payload: dict[str, Any] | None,
    fallback: dict[str, list[str]],
    sections: dict[str, str] | None = None,
) -> dict[str, list[str]]:
    if not gpt_payload or not isinstance(gpt_payload.get("technical_skill_assessment"), dict):
        return fallback

    raw = gpt_payload["technical_skill_assessment"]
    normalized = {key: list(value) for key, value in fallback.items()}
    for key in [
        "core_skills_found",
        "supporting_skills_found",
        "nice_to_have_skills_found",
        "high_priority_missing_skills",
        "medium_priority_missing_skills",
        "nice_to_have_missing_skills",
        "do_not_penalize_missing_skills",
    ]:
        values = normalize_list(raw.get(key))
        if key in {"core_skills_found", "supporting_skills_found", "nice_to_have_skills_found"}:
            values = filter_ai_tool_only_skill_labels(values, sections)
        if values:
            normalized[key] = values

    normalized["matched_required_skills"] = normalized["core_skills_found"]
    normalized["matched_important_skills"] = normalized["supporting_skills_found"]
    normalized["matched_nice_to_have_skills"] = normalized["nice_to_have_skills_found"]
    normalized["missing_required_skills"] = normalized["high_priority_missing_skills"]
    normalized["missing_important_skills"] = normalized["medium_priority_missing_skills"]
    normalized["missing_nice_to_have_skills"] = normalized["nice_to_have_missing_skills"]
    return normalized


def build_fallback_roadmap(
    *,
    role: dict[str, Any],
    technical_assessment: dict[str, list[str]],
) -> list[dict[str, Any]]:
    roadmap_lines = [line.strip() for line in str(role.get("roadmap", "")).splitlines() if line.strip()]
    required_missing = technical_assessment.get("high_priority_missing_skills", [])[:6]
    important_missing = technical_assessment.get("medium_priority_missing_skills", [])[:6]
    nice_missing = technical_assessment.get("nice_to_have_missing_skills", [])[:6]

    return [
        {
            "phase": "Phase 1 - Nền tảng cần củng cố",
            "goal": "Củng cố các nền tảng còn thiếu trước khi mở rộng sang kỹ năng chuyên sâu.",
            "skills": required_missing[:3] or roadmap_lines[:2],
            "output": "Một bản CV cập nhật có section Technical Skills rõ ràng và bằng chứng nền tảng.",
            "reason": "Các kỹ năng bắt buộc ảnh hưởng trực tiếp tới điểm phù hợp role.",
        },
        {
            "phase": "Phase 2 - Skill chính cho role",
            "goal": "Tập trung vào kỹ năng quan trọng có tác động cao tới role mục tiêu.",
            "skills": important_missing[:4] or roadmap_lines[2:4],
            "output": "Một project hoặc mô tả kinh nghiệm thể hiện rõ kỹ năng score 2-3.",
            "reason": "Kỹ năng quan trọng nên được chứng minh bằng ngữ cảnh sử dụng thực tế.",
        },
        {
            "phase": "Phase 3 - Project thực hành để đưa vào CV",
            "goal": "Tạo bằng chứng có thể đưa vào Projects hoặc Experience.",
            "skills": [*required_missing[:2], *important_missing[:2]] or roadmap_lines[4:6],
            "output": "Project có tech stack, vai trò cá nhân, kết quả và link demo/GitHub nếu có.",
            "reason": "Bằng chứng trong project giúp tăng điểm Technical Skills, Projects và Experience.",
        },
        {
            "phase": "Phase 4 - Deployment / testing / portfolio",
            "goal": "Hoàn thiện độ tin cậy và khả năng trình bày với nhà tuyển dụng.",
            "skills": nice_missing[:4] or roadmap_lines[6:8],
            "output": "Portfolio/deployment/test case hoặc tài liệu ngắn mô tả impact dự án.",
            "reason": "Các yếu tố triển khai, kiểm thử và portfolio giúp CV nổi bật hơn khi ứng tuyển.",
        },
    ]


def normalize_roadmap_recommendation(
    gpt_payload: dict[str, Any] | None,
    fallback: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if not gpt_payload or not isinstance(gpt_payload.get("roadmap_recommendation"), list):
        return fallback

    roadmap: list[dict[str, Any]] = []
    for item in gpt_payload["roadmap_recommendation"][:6]:
        if not isinstance(item, dict):
            continue
        phase = str(item.get("phase", "")).strip()
        goal = str(item.get("goal", "")).strip()
        if not phase or not goal:
            continue
        roadmap.append(
            {
                "phase": phase,
                "goal": goal,
                "skills": normalize_list(item.get("skills")),
                "output": str(item.get("output", "")).strip(),
                "reason": str(item.get("reason", "")).strip(),
            }
        )
    return roadmap or fallback


def score_section_presence(sections: dict[str, str]) -> dict[str, dict[str, Any]]:
    section_scores: dict[str, dict[str, Any]] = {}

    for section, max_score in SECTION_WEIGHTS.items():
        words = section_word_count(sections, section)
        if words == 0:
            score = 0.0
            comment = "Thiếu section này trong CV."
        elif words < 18:
            score = max_score * 0.55
            comment = "Có section nhưng nội dung còn ngắn, nên bổ sung bằng chứng cụ thể."
        else:
            score = max_score * 0.82
            comment = "Section có nội dung tương đối rõ ràng."

        if section in {"Experience", "Projects"} and re.search(r"\d+|%|người dùng|users|user", sections.get(section, ""), re.I):
            score = min(max_score, score + max_score * 0.16)
            comment = "Section có thêm số liệu hoặc dấu hiệu impact."

        if section == "Technical Skills":
            score = min(max_score, score + 4)

        section_scores[section] = {
            "section": section,
            "raw_score": round(score, 1),
            "score": round(min(max_score, score), 1),
            "max_score": max_score,
            "word_count": words,
            "comment": comment,
            "strengths": [],
            "weaknesses": [comment] if score < max_score else [],
            "suggestions": [],
        }

    return section_scores


def apply_gpt_section_scores(
    section_scores: dict[str, dict[str, Any]],
    gpt_payload: dict[str, Any] | None,
) -> dict[str, dict[str, Any]]:
    if not gpt_payload:
        return section_scores

    raw_section_scores = gpt_payload.get("section_scores")
    if not isinstance(raw_section_scores, dict):
        return section_scores

    normalized = {section: dict(info) for section, info in section_scores.items()}
    for section, max_score in SECTION_WEIGHTS.items():
        raw_info = raw_section_scores.get(section)
        if not isinstance(raw_info, dict):
            continue

        try:
            score = float(raw_info.get("score", normalized[section]["score"]))
        except (TypeError, ValueError):
            score = normalized[section]["score"]
        try:
            raw_score = float(raw_info.get("raw_score", score))
        except (TypeError, ValueError):
            raw_score = score

        normalized[section]["raw_score"] = round(max(0, raw_score), 1)
        normalized[section]["score"] = round(max(0, min(max_score, score)), 1)
        normalized[section]["max_score"] = int(raw_info.get("max_score") or max_score)
        normalized[section]["comment"] = raw_info.get("comment") or normalized[section]["comment"]
        normalized[section]["strengths"] = normalize_list(raw_info.get("strengths"))
        normalized[section]["weaknesses"] = normalize_list(raw_info.get("weaknesses"))
        normalized[section]["suggestions"] = normalize_list(raw_info.get("suggestions"))

    return normalized


def normalize_gpt_issues(gpt_payload: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not gpt_payload:
        return []

    raw_issues = gpt_payload.get("issues")
    if not isinstance(raw_issues, list):
        return []

    issues: list[dict[str, Any]] = []
    for index, raw_issue in enumerate(raw_issues[:6], start=1):
        if not isinstance(raw_issue, dict):
            continue

        severity = str(raw_issue.get("severity", "medium")).lower()
        if severity not in {"high", "medium", "positive"}:
            severity = "medium"

        severity_label = raw_issue.get("severity_label")
        if not severity_label:
            severity_label = {
                "high": "Cần ưu tiên",
                "medium": "Nên cải thiện",
                "positive": "Đã làm tốt",
            }[severity]

        title = str(raw_issue.get("title", "")).strip()
        description = str(raw_issue.get("description", "")).strip()
        if not title or not description:
            continue

        issues.append(
            {
                "issue_id": f"GPT_ISSUE_{index}",
                "criterion": str(raw_issue.get("criterion", "Nội dung")),
                "severity": severity,
                "severity_label": str(severity_label),
                "title": title,
                "description": description,
                "impact": str(raw_issue.get("impact", "Hãy kiểm tra lại phần này trước khi ứng tuyển.")),
            }
        )

    return issues


def percentage(score: float, max_score: float) -> int:
    if max_score <= 0:
        return 0
    return int(round(max(0, min(100, (score / max_score) * 100))))


def compute_criteria_scores(
    *,
    sections: dict[str, str],
    section_scores: dict[str, dict[str, Any]],
    skill_assessment: list[dict[str, Any]],
    extension: str,
    extraction: dict[str, Any],
) -> list[dict[str, Any]]:
    present_sections = sum(1 for section in SECTION_WEIGHTS if sections.get(section, "").strip())
    layout_score = min(100, 46 + present_sections * 8)

    content_points = (
        section_scores["Professional Summary"]["score"]
        + section_scores["Experience"]["score"]
        + section_scores["Projects"]["score"]
        + section_scores["Education"]["score"] * 0.5
    )
    content_score = percentage(content_points, 50)

    relevant_skills = [item for item in skill_assessment if item["importance"] > 0]
    if relevant_skills:
        weighted_found = sum(item["importance"] * item["evidence_level"] for item in relevant_skills)
        weighted_total = sum(item["importance"] * 3 for item in relevant_skills)
        keyword_score = percentage(weighted_found, weighted_total)
    else:
        keyword_score = 60

    text = "\n".join(sections.values())
    action_verb_hits = len(
        re.findall(
            r"\b(phát triển|xây dựng|thiết kế|triển khai|tối ưu|phân tích|developed|built|designed|implemented|optimized)\b",
            text,
            flags=re.I,
        )
    )
    style_score = min(100, 58 + action_verb_hits * 6)
    if len(text.split()) < 160:
        style_score -= 12

    ats_score = 82 if extension in {"pdf", "docx"} else 62
    if extraction.get("quality_score", 0) < 0.6:
        ats_score -= 16
    if not re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", text):
        ats_score -= 8

    return [
        {"key": "layout", "label": "Bố cục", "score": max(0, min(100, int(layout_score))), "color": "green"},
        {"key": "content", "label": "Nội dung", "score": max(0, min(100, int(content_score))), "color": "orange"},
        {"key": "keywords", "label": "Từ khóa", "score": max(0, min(100, int(keyword_score))), "color": "blue"},
        {"key": "style", "label": "Văn phong", "score": max(0, min(100, int(style_score))), "color": "blue"},
        {"key": "ats", "label": "Độ tương thích ATS", "score": max(0, min(100, int(ats_score))), "color": "orange"},
    ]


def detect_date_inconsistency(text: str) -> bool:
    numeric_dates = bool(re.search(r"\b(0?[1-9]|1[0-2])[/.-]\d{4}\b", text))
    named_months = bool(
        re.search(
            r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|tháng\s+\d{1,2})\b",
            text,
            flags=re.I,
        )
    )
    return numeric_dates and named_months


def build_issues(
    *,
    sections: dict[str, str],
    skill_assessment: list[dict[str, Any]],
    criteria_scores: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    text = "\n".join(sections.values())
    issues: list[dict[str, Any]] = []

    experience_project_text = f"{sections.get('Experience', '')}\n{sections.get('Projects', '')}"
    if experience_project_text.strip() and not re.search(r"\d+|%|người dùng|users|user|giảm|tăng|improve", experience_project_text, re.I):
        issues.append(
            {
                "issue_id": "ISSUE_METRICS",
                "criterion": "Nội dung",
                "severity": "high",
                "severity_label": "Cần ưu tiên",
                "title": "Thiếu kết quả định lượng",
                "description": "Mô tả dự án hoặc kinh nghiệm mới nêu nhiệm vụ, chưa thể hiện kết quả hoặc mức độ đóng góp.",
                "impact": "Nhà tuyển dụng khó đánh giá mức độ đóng góp thực tế của bạn.",
            }
        )

    missing_core = [
        item["skill"]
        for item in skill_assessment
        if item["importance"] == 3 and item["evidence_level"] == 0
    ]
    if missing_core:
        issues.append(
            {
                "issue_id": "ISSUE_CORE_KEYWORDS",
                "criterion": "Từ khóa",
                "severity": "high",
                "severity_label": "Cần ưu tiên",
                "title": "Thiếu từ khóa nền tảng của vị trí mục tiêu",
                "description": f"CV chưa thể hiện rõ: {', '.join(missing_core[:4])}.",
                "impact": "ATS và nhà tuyển dụng có thể bỏ sót mức độ phù hợp với role.",
            }
        )

    weak_evidence = [
        item["skill"]
        for item in skill_assessment
        if item["importance"] >= 2 and item["evidence_level"] == 2
    ]
    if weak_evidence:
        issues.append(
            {
                "issue_id": "ISSUE_SKILL_EVIDENCE",
                "criterion": "Từ khóa",
                "severity": "medium",
                "severity_label": "Nên cải thiện",
                "title": "Kỹ năng mới được liệt kê, chưa có ngữ cảnh sử dụng",
                "description": f"Một số kỹ năng nên được gắn với dự án hoặc kinh nghiệm: {', '.join(weak_evidence[:4])}.",
                "impact": "Bằng chứng trong dự án/kinh nghiệm giúp điểm kỹ năng đáng tin hơn.",
            }
        )

    if detect_date_inconsistency(text):
        issues.append(
            {
                "issue_id": "ISSUE_DATE_FORMAT",
                "criterion": "Bố cục",
                "severity": "medium",
                "severity_label": "Nên cải thiện",
                "title": "Định dạng ngày tháng không đồng nhất",
                "description": "Một số mục dùng MM/YYYY, một số mục dùng tên tháng bằng chữ.",
                "impact": "Định dạng không thống nhất làm CV khó đọc hơn với ATS và người tuyển dụng.",
            }
        )

    missing_sections = [
        section
        for section in ["Education", "Experience", "Projects", "Technical Skills"]
        if not sections.get(section, "").strip()
    ]
    if missing_sections:
        issues.append(
            {
                "issue_id": "ISSUE_MISSING_SECTIONS",
                "criterion": "Bố cục",
                "severity": "medium",
                "severity_label": "Nên cải thiện",
                "title": "Thiếu một số phần quan trọng",
                "description": f"CV chưa nhận diện được các phần: {', '.join(missing_sections)}.",
                "impact": "Các phần này giúp hệ thống và nhà tuyển dụng hiểu nền tảng của bạn nhanh hơn.",
            }
        )

    good_criteria = [item["label"] for item in criteria_scores if item["score"] >= 78]
    if good_criteria:
        issues.append(
            {
                "issue_id": "ISSUE_STRENGTH_STRUCTURE",
                "criterion": good_criteria[0],
                "severity": "positive",
                "severity_label": "Đã làm tốt",
                "title": "Có nền tảng trình bày tốt",
                "description": f"CV đang thể hiện tốt ở tiêu chí {good_criteria[0].lower()}.",
                "impact": "Hãy giữ cấu trúc rõ ràng này khi bổ sung bằng chứng chi tiết.",
            }
        )

    return issues[:6]


def classify_score(score: int) -> tuple[str, str]:
    if score >= 85:
        return "Xuất sắc", "CV có độ phù hợp cao. Hãy rà lại bằng chứng và cá nhân hóa trước khi ứng tuyển."
    if score >= 70:
        return "Khá", "CV đã có nền tảng tốt nhưng cần làm rõ kết quả và chuẩn hóa một số chi tiết."
    if score >= 55:
        return "Trung bình", "CV có tiềm năng, nên ưu tiên bổ sung bằng chứng kỹ năng và kết quả cụ thể."
    return "Cần cải thiện", "CV cần được bổ sung cấu trúc, kỹ năng trọng tâm và bằng chứng trước khi ứng tuyển."


def build_priority_actions(issues: list[dict[str, Any]], skill_assessment: list[dict[str, Any]]) -> list[str]:
    actions: list[str] = []

    for issue in issues:
        if issue["severity"] == "positive":
            continue
        if issue["issue_id"] == "ISSUE_METRICS":
            actions.append("Bổ sung số liệu thật cho ít nhất hai dự án hoặc kinh nghiệm quan trọng.")
        elif issue["issue_id"] == "ISSUE_CORE_KEYWORDS":
            missing = [
                item["skill"]
                for item in skill_assessment
                if item["importance"] == 3 and item["evidence_level"] == 0
            ]
            actions.append(f"Thêm kỹ năng cốt lõi nếu đúng với kinh nghiệm thực tế: {', '.join(missing[:4])}.")
        elif issue["issue_id"] == "ISSUE_SKILL_EVIDENCE":
            actions.append("Gắn các kỹ năng quan trọng với một dự án hoặc kinh nghiệm cụ thể.")
        elif issue["issue_id"] == "ISSUE_DATE_FORMAT":
            actions.append("Thống nhất định dạng tháng/năm trong toàn bộ CV.")
        elif issue["issue_id"] == "ISSUE_MISSING_SECTIONS":
            actions.append("Bổ sung các phần còn thiếu để CV dễ đọc và dễ chấm hơn.")

    if not actions:
        actions.append("Rà lại câu chữ, giữ nội dung ngắn gọn và dùng số liệu thật khi có.")
    return actions[:5]


def build_strengths(issues: list[dict[str, Any]], criteria_scores: list[dict[str, Any]]) -> list[str]:
    strengths = [
        issue["title"]
        for issue in issues
        if issue.get("severity") == "positive"
    ]
    for criterion in criteria_scores:
        if criterion["score"] >= 78:
            strengths.append(f"Tiêu chí {criterion['label'].lower()} đang ở mức tốt.")
    return list(dict.fromkeys(strengths))[:4]


def analyze_sections(
    *,
    cv: dict[str, Any],
    role: dict[str, Any],
) -> dict[str, Any]:
    extraction = cv.get("Extraction", {})
    sections = extraction.get("sections") or {section: "" for section in STANDARD_SECTIONS}
    skill_assessment = detect_skill_evidence(sections, role)
    local_technical_assessment = build_technical_skill_assessment(skill_assessment)
    section_scores = score_section_presence(sections)
    gpt_review = evaluate_sections_with_gpt(
        sections=sections,
        role=role,
        section_weights=SECTION_WEIGHTS,
    )
    gpt_payload = gpt_review.payload if gpt_review else None
    section_scores = apply_gpt_section_scores(section_scores, gpt_payload)
    criteria_scores = compute_criteria_scores(
        sections=sections,
        section_scores=section_scores,
        skill_assessment=skill_assessment,
        extension=cv.get("Loai", ""),
        extraction=extraction,
    )
    section_total = int(round(sum(float(item["score"]) for item in section_scores.values())))
    section_total = max(0, min(100, section_total))
    total_score = int(round(section_total * TOTAL_SCORE_SCALE))
    total_score = max(0, min(100, total_score))
    classification, summary = classify_score(total_score)
    if gpt_payload and isinstance(gpt_payload.get("overall_comment"), str) and gpt_payload["overall_comment"].strip():
        summary = gpt_payload["overall_comment"].strip()

    technical_assessment = normalize_technical_skill_assessment(gpt_payload, local_technical_assessment, sections)
    roadmap_recommendation = normalize_roadmap_recommendation(
        gpt_payload,
        build_fallback_roadmap(role=role, technical_assessment=technical_assessment),
    )
    issues = normalize_gpt_issues(gpt_payload) or build_issues(
        sections=sections,
        skill_assessment=skill_assessment,
        criteria_scores=criteria_scores,
    )
    priority_actions = normalize_list(gpt_payload.get("priority_actions")) if gpt_payload else []
    if not priority_actions:
        priority_actions = build_priority_actions(issues, skill_assessment)
    strengths = build_strengths(issues, criteria_scores)
    weaknesses = [
        issue["title"]
        for issue in issues
        if issue.get("severity") in {"high", "medium"}
    ]
    readiness_level = None
    if gpt_payload and isinstance(gpt_payload.get("readiness_level"), str):
        readiness_level = gpt_payload["readiness_level"].strip()
    if not readiness_level:
        readiness_level = classification

    return {
        "total_score": total_score,
        "classification": classification,
        "summary": summary,
        "criteria_scores": criteria_scores,
        "section_scores": list(section_scores.values()),
        "skill_assessment": skill_assessment,
        "technical_skill_assessment": technical_assessment,
        "roadmap_recommendation": roadmap_recommendation,
        "issues": issues,
        "strengths": strengths,
        "weaknesses": weaknesses[:4],
        "priority_actions": priority_actions,
        "readiness_level": readiness_level,
        "scoring_config_version": SCORING_CONFIG_VERSION,
        "model_version": gpt_review.model_version if gpt_review else "rule-based-local",
        "prompt_version": gpt_review.prompt_version if gpt_review else None,
        "analysis_method": "gpt" if gpt_review else "rule_based",
    }


DEFAULT_FREE_PLAN_ID = "DV_FREE"
DEFAULT_PREMIUM_PLAN_ID = "DV_PREMIUM_30"


def can_view_premium_roadmap(current_plan: str | None) -> bool:
    return str(current_plan or "").lower() == "premium"


async def resolve_quota_state(db: Any, user_id: str, now: datetime) -> dict[str, Any]:
    """Đọc (và nếu cần, tự làm mới) trạng thái gói dịch vụ hiện tại của user.

    - Nếu LUOTDUNG hiện có còn hạn: dùng nguyên gói đó.
    - Nếu hết hạn hoặc chưa từng có: tự cấp gói DV_FREE mới cho chu kỳ tiếp theo,
      rồi đọc lại đúng bản ghi vừa tạo/đang có để lấy limit + NgayBatDau khớp với
      gói thực sự đang áp dụng (tránh dùng nhầm limit/period_start của gói cũ).
    """
    customer = await db["KHACHHANG"].find_one({"_id": user_id})
    account_type = str((customer or {}).get("LoaiKH", "registered")).lower()
    is_premium = account_type == "premium"

    usage_doc = await db["LUOTDUNG"].find_one({"MaKH": user_id}, sort=[("HanSuDung", -1)])
    han_su_dung = usage_doc.get("HanSuDung") if usage_doc else None
    is_active = bool(han_su_dung) and han_su_dung.replace(tzinfo=None) >= now.replace(tzinfo=None)

    if is_premium:
        # Premium: luôn không giới hạn.
        # Đọc đúng plan_id thực tế từ LUOTDUNG (DV_PREMIUM_30 hoặc DV_PREMIUM_90).
        # Nếu usage_doc không có hoặc không phải premium plan thì fallback về DEFAULT.
        PREMIUM_PLAN_IDS = {"DV_PREMIUM_30", "DV_PREMIUM_90"}
        actual_plan_id = (
            usage_doc.get("MaGoiDV")
            if usage_doc and usage_doc.get("MaGoiDV") in PREMIUM_PLAN_IDS
            else DEFAULT_PREMIUM_PLAN_ID
        )
        return {
            "account_type": account_type,
            "plan_id": actual_plan_id,
            "limit": -1,
            "is_unlimited": True,
            "period_start": now.replace(tzinfo=None),
        }

    if not usage_doc or not is_active:
        # Registered - gói hết hạn hoặc chưa có → cấp/làm mới chu kỳ Free.
        await db["LUOTDUNG"].update_one(
            {"MaKH": user_id, "MaGoiDV": DEFAULT_FREE_PLAN_ID},
            {
                "$set": {
                    "MaKH": user_id,
                    "MaGoiDV": DEFAULT_FREE_PLAN_ID,
                    "NgayBatDau": now,
                    "HanSuDung": now + timedelta(days=30),
                },
                "$setOnInsert": {
                    "_id": f"LD_{uuid4().hex[:10].upper()}",
                },
            },
            upsert=True,
        )
        usage_doc = await db["LUOTDUNG"].find_one({"MaKH": user_id, "MaGoiDV": DEFAULT_FREE_PLAN_ID})
        plan_id = DEFAULT_FREE_PLAN_ID
    else:
        plan_id = usage_doc.get("MaGoiDV") or DEFAULT_FREE_PLAN_ID

    goidv_doc = await db["GOIDV"].find_one({"_id": plan_id})
    limit = int(goidv_doc.get("SoLuotPhanTich", 3)) if goidv_doc else 3
    is_unlimited = limit == -1

    ngay_bat_dau = usage_doc.get("NgayBatDau") if usage_doc else None
    if ngay_bat_dau:
        period_start = ngay_bat_dau.replace(tzinfo=None) if hasattr(ngay_bat_dau, "replace") else ngay_bat_dau
    else:
        period_start = now.replace(tzinfo=None) - timedelta(days=30)

    return {
        "account_type": account_type,
        "plan_id": plan_id,
        "limit": limit,
        "is_unlimited": is_unlimited,
        "period_start": period_start,
    }


async def ensure_analysis_quota_available(db: Any, user_id: str) -> dict[str, Any]:
    """Kiểm tra lượt phân tích còn lại; raise 403 ANALYSIS_QUOTA_EXCEEDED nếu đã hết.

    Dùng làm "cổng chặn" chung cho cả hai nơi:
    - Upload CV (chặn sớm, không cho tải file mới lên nếu đã hết lượt).
    - Tạo phân tích (chặn cuối, phòng trường hợp quota bị dùng hết giữa lúc
      upload và lúc bấm phân tích).

    Lưu ý: đây là kiểm tra dạng "đếm rồi so sánh" (count-then-compare), không
    atomic tuyệt đối trước race condition khi có nhiều request đồng thời. Với
    quy mô nhỏ hiện tại là chấp nhận được, nhưng nếu cần chặn tuyệt đối thì nên
    chuyển sang counter tăng nguyên tử (increment-with-condition) trên LUOTDUNG.
    """
    now = datetime.now(timezone.utc)
    try:
        state = await resolve_quota_state(db, user_id, now)
    except DATABASE_ERRORS:
        # Giữ hành vi cũ: không chặn nếu DB lỗi khi kiểm tra lượt.
        return {"unlimited": True, "limit": None, "used": None}

    if state["is_unlimited"]:
        return {"unlimited": True, "limit": None, "used": None}

    try:
        used = await db["LICHSUPTCV"].count_documents(
            {"MaKH": user_id, "NgayPT": {"$gte": state["period_start"]}}
        )
    except DATABASE_ERRORS:
        return {"unlimited": False, "limit": state["limit"], "used": None}

    if used >= state["limit"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ANALYSIS_QUOTA_EXCEEDED",
                "message": f"Bạn đã dùng hết {state['limit']} lượt phân tích. Vui lòng gia hạn hoặc nâng cấp gói.",
            },
        )

    return {"unlimited": False, "limit": state["limit"], "used": used}


async def create_analysis_for_cv(
    *,
    db: Any,
    cv_id: str,
    role_id: str,
    user_id: str,
    current_plan: str | None = None,
) -> dict[str, Any]:
    try:
        cv = await db["CV"].find_one({"_id": cv_id, "MaKH": user_id})
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_UNAVAILABLE",
                "message": "Chưa kết nối được cơ sở dữ liệu. Vui lòng kiểm tra MongoDB URI hoặc mạng.",
            },
        ) from exc

    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CV_NOT_FOUND", "message": "Không tìm thấy CV thuộc tài khoản hiện tại."},
        )

    role = await get_role_by_id(db, role_id)
    canonical_role_id = role["role_id"]
    analysis = analyze_sections(cv=cv, role=role)
    can_view_roadmap = can_view_premium_roadmap(current_plan)
    now = datetime.now(timezone.utc)
    analysis_id = f"KQ_{uuid4().hex[:10].upper()}"
    criteria_map = {item["key"]: item["score"] for item in analysis["criteria_scores"]}
    section_map = {item["section"]: item["score"] for item in analysis["section_scores"]}

    result_document = {
        "_id": analysis_id,
        "DiemTongQuan": analysis["total_score"],
        "XepLoai": analysis["classification"],
        "NhanXetTQ": analysis["summary"],
        "ThoiDiemPT": now,
        "MaCV": cv_id,
        "MaNganh": canonical_role_id,
        "DiemBoCuc": criteria_map.get("layout"),
        "DiemNoiDung": criteria_map.get("content"),
        "DiemTuKhoa": criteria_map.get("keywords"),
        "DiemVanPhong": criteria_map.get("style"),
        "DiemATS": criteria_map.get("ats"),
        "DiemPhanGT": section_map.get("Professional Summary"),
        "DiemTDHV": section_map.get("Education"),
        "DiemKNLV": section_map.get("Experience"),
        "DiemDoAn": section_map.get("Projects"),
        "DiemTechSkill": section_map.get("Technical Skills"),
        "DiemCert": section_map.get("Certifications"),
        "CriteriaScores": analysis["criteria_scores"],
        "SectionScores": analysis["section_scores"],
        "SkillAssessment": analysis["skill_assessment"],
        "TechnicalSkillAssessment": analysis["technical_skill_assessment"],
        "RoadmapRecommendation": analysis["roadmap_recommendation"] if can_view_roadmap else [],
        "Issues": analysis["issues"],
        "Strengths": analysis["strengths"],
        "Weaknesses": analysis["weaknesses"],
        "PriorityActions": analysis["priority_actions"],
        "ReadinessLevel": analysis.get("readiness_level") or analysis["classification"],
        "ScoringConfigVersion": analysis["scoring_config_version"],
        "ModelVersion": analysis["model_version"],
        "PromptVersion": analysis["prompt_version"],
        "AnalysisMethod": analysis["analysis_method"],
    }

    # -----------------------------------------------------------
    # Kiểm tra lượt dùng (LUOTDUNG / GOIDV / LICHSUPTCV)
    # Dùng chung với bước chặn upload CV — xem ensure_analysis_quota_available().
    # Đây là lớp chặn thứ 2 (defense-in-depth): phòng trường hợp quota bị dùng
    # hết giữa lúc CV được tải lên và lúc người dùng bấm "Phân tích".
    # -----------------------------------------------------------
    await ensure_analysis_quota_available(db, user_id)

    try:
        await db["CV"].update_one(
            {"_id": cv_id, "MaKH": user_id},
            {"$set": {"TrangThai": "completed", "MaNganh": canonical_role_id, "NgayCapNhat": now}},
        )
        await db["KETQUA_PTCV"].insert_one(result_document)
        await db["LICHSUPTCV"].insert_one(
            {"_id": f"LS_{uuid4().hex[:10].upper()}", "NgayPT": now, "MaKQ": analysis_id, "MaKH": user_id}
        )
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_UNAVAILABLE",
                "message": "Chưa lưu được kết quả phân tích vì cơ sở dữ liệu chưa sẵn sàng.",
            },
        ) from exc

    updated_cv = {**cv, "TrangThai": "completed", "MaNganh": canonical_role_id}
    return format_analysis_result(result_document, updated_cv, role, can_view_roadmap=can_view_roadmap)


def legacy_criteria_scores(result: dict[str, Any]) -> list[dict[str, Any]]:
    if result.get("CriteriaScores"):
        return result["CriteriaScores"]
    total = int(result.get("DiemTongQuan", 0) or 0)
    return [
        {"key": "layout", "label": "Bố cục", "score": int(result.get("DiemBoCuc") or min(100, total + 10)), "color": "green"},
        {"key": "content", "label": "Nội dung", "score": int(result.get("DiemNoiDung") or max(0, total - 4)), "color": "orange"},
        {"key": "keywords", "label": "Từ khóa", "score": int(result.get("DiemTuKhoa") or max(0, total - 2)), "color": "blue"},
        {"key": "style", "label": "Văn phong", "score": int(result.get("DiemVanPhong") or min(100, total + 2)), "color": "blue"},
        {"key": "ats", "label": "Độ tương thích ATS", "score": int(result.get("DiemATS") or max(0, total - 6)), "color": "orange"},
    ]


def legacy_section_scores(result: dict[str, Any]) -> list[dict[str, Any]]:
    if result.get("SectionScores"):
        return result["SectionScores"]
    field_map = {
        "Professional Summary": "DiemPhanGT",
        "Education": "DiemTDHV",
        "Experience": "DiemKNLV",
        "Projects": "DiemDoAn",
        "Technical Skills": "DiemTechSkill",
        "Certifications": "DiemCert",
    }
    return [
        {
            "section": section,
            "score": float(result.get(field_name, 0) or 0),
            "max_score": SECTION_WEIGHTS[section],
            "word_count": None,
            "comment": "Điểm được chuyển đổi từ dữ liệu phân tích đã lưu.",
        }
        for section, field_name in field_map.items()
    ]


def legacy_issues(result: dict[str, Any]) -> list[dict[str, Any]]:
    if result.get("Issues"):
        return result["Issues"]
    return [
        {
            "issue_id": "LEGACY_METRICS",
            "criterion": "Nội dung",
            "severity": "high",
            "severity_label": "Cần ưu tiên",
            "title": "Thiếu kết quả định lượng",
            "description": "Một số mô tả dự án chỉ nêu nhiệm vụ, chưa thể hiện kết quả hoặc mức độ đóng góp.",
            "impact": "Nhà tuyển dụng khó đánh giá mức độ đóng góp thực tế của bạn.",
        },
        {
            "issue_id": "LEGACY_KEYWORDS",
            "criterion": "Từ khóa",
            "severity": "medium",
            "severity_label": "Nên cải thiện",
            "title": "Thiếu từ khóa nền tảng",
            "description": "CV chưa thể hiện rõ một số kỹ năng quan trọng trong phần kỹ năng và dự án.",
            "impact": "ATS có thể lọc CV này ra khi tìm kiếm những từ khóa đó.",
        },
        {
            "issue_id": "LEGACY_STRUCTURE",
            "criterion": "Bố cục",
            "severity": "positive",
            "severity_label": "Đã làm tốt",
            "title": "Cấu trúc mục rõ ràng",
            "description": "Các phần học vấn, kỹ năng, dự án và kinh nghiệm được phân tách dễ đọc.",
            "impact": "Cấu trúc tốt giúp người đọc quét thông tin nhanh hơn.",
        },
    ]


def legacy_technical_skill_assessment(result: dict[str, Any]) -> dict[str, list[str]]:
    if isinstance(result.get("TechnicalSkillAssessment"), dict):
        return result["TechnicalSkillAssessment"]
    skill_assessment = result.get("SkillAssessment")
    if isinstance(skill_assessment, list):
        return build_technical_skill_assessment(skill_assessment)
    return {
        "required_skills": [],
        "important_skills": [],
        "nice_to_have_skills": [],
        "not_required_skills": [],
        "matched_required_skills": [],
        "matched_important_skills": [],
        "matched_nice_to_have_skills": [],
        "missing_required_skills": [],
        "missing_important_skills": [],
        "missing_nice_to_have_skills": [],
        "core_skills_found": [],
        "supporting_skills_found": [],
        "nice_to_have_skills_found": [],
        "high_priority_missing_skills": [],
        "medium_priority_missing_skills": [],
        "nice_to_have_missing_skills": [],
        "do_not_penalize_missing_skills": [],
    }


def legacy_roadmap_recommendation(
    result: dict[str, Any],
    role: dict[str, Any] | None,
    technical_assessment: dict[str, list[str]],
) -> list[dict[str, Any]]:
    if isinstance(result.get("RoadmapRecommendation"), list):
        return result["RoadmapRecommendation"]
    if role:
        return build_fallback_roadmap(role=role, technical_assessment=technical_assessment)
    return []


def format_analysis_result(
    result: dict[str, Any],
    cv: dict[str, Any],
    role: dict[str, Any] | None,
    *,
    can_view_roadmap: bool = True,
) -> dict[str, Any]:
    total_score = int(result.get("DiemTongQuan", 0) or 0)
    classification = result.get("XepLoai")
    summary = result.get("NhanXetTQ")
    if not classification or not summary:
        classification, fallback_summary = classify_score(total_score)
        summary = summary or fallback_summary

    created_at = result.get("ThoiDiemPT")
    technical_assessment = legacy_technical_skill_assessment(result)
    return {
        "analysis_id": result.get("_id"),
        "cv_id": cv.get("_id"),
        "cv_name": cv.get("TenFileGoc"),
        "file_type": cv.get("Loai"),
        "file_size_label": format_file_size(int(cv.get("DungLuong", 0) or 0)),
        "role_id": result.get("MaNganh") or cv.get("MaNganh"),
        "role_name": role.get("name") if role else None,
        "role_description": role.get("description") if role else None,
        "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else created_at,
        "status": cv.get("TrangThai", "completed"),
        "total_score": total_score,
        "classification": classification,
        "summary": summary,
        "criteria_scores": legacy_criteria_scores(result),
        "section_scores": legacy_section_scores(result),
        "skill_assessment": result.get("SkillAssessment") or [],
        "technical_skill_assessment": technical_assessment,
        "roadmap_recommendation": legacy_roadmap_recommendation(result, role, technical_assessment) if can_view_roadmap else [],
        "readiness_level": result.get("ReadinessLevel") or classification,
        "issues": legacy_issues(result),
        "strengths": result.get("Strengths") or [],
        "weaknesses": result.get("Weaknesses") or [],
        "priority_actions": result.get("PriorityActions") or [
            "Bổ sung số liệu cụ thể cho dự án hoặc kinh nghiệm nổi bật.",
            "Gắn kỹ năng quan trọng với bằng chứng trong project hoặc experience.",
            "Rà lại định dạng ngày tháng trước khi ứng tuyển.",
        ],
        "scoring_config_version": result.get("ScoringConfigVersion") or SCORING_CONFIG_VERSION,
        "metadata": {
            "model_version": result.get("ModelVersion") or "seed-data",
            "prompt_version": result.get("PromptVersion"),
            "analysis_method": result.get("AnalysisMethod") or "legacy_or_rule_based",
        },
    }


async def get_analysis_detail(
    *,
    db: Any,
    analysis_id: str,
    user_id: str,
    current_plan: str | None = None,
) -> dict[str, Any]:
    can_view_roadmap = can_view_premium_roadmap(current_plan)
    try:
        result = await db["KETQUA_PTCV"].find_one({"_id": analysis_id})
    except DATABASE_ERRORS as exc:
        if analysis_id == "KQ001" and user_id == "KH001":
            demo_role_id = LEGACY_ROLE_ID_ALIASES.get("NG_FRONTEND", "NG_FRONTEND")
            role = next((role for role in DEFAULT_ROLES if role["role_id"] == demo_role_id), DEFAULT_ROLES[0])
            return format_analysis_result(DEMO_RESULT, DEMO_CV, role, can_view_roadmap=can_view_roadmap)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_UNAVAILABLE",
                "message": "Chưa kết nối được cơ sở dữ liệu. Vui lòng kiểm tra MongoDB URI hoặc mạng.",
            },
        ) from exc

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "Không tìm thấy kết quả phân tích."},
        )

    cv = await db["CV"].find_one({"_id": result.get("MaCV"), "MaKH": user_id})
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "Không tìm thấy kết quả thuộc tài khoản hiện tại."},
        )

    role = None
    role_id = result.get("MaNganh") or cv.get("MaNganh")
    if role_id:
        try:
            role = await get_role_by_id(db, role_id)
        except HTTPException:
            role = None

    return format_analysis_result(result, cv, role, can_view_roadmap=can_view_roadmap)
