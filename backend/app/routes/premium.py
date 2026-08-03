"""Routes for premium user features and service plans."""

from __future__ import annotations

from typing import Any

# pyrefly: ignore [missing-import]
from fastapi import APIRouter

from app.db import db
from app.services.plan_service import list_public_plans

router = APIRouter(prefix="/api/v1/service-plans", tags=["Plans"])

FREE_FEATURES = [
    "3 lượt phân tích CV cho một chu kỳ tài khoản",
    "Điểm tổng quan và các tiêu chí đánh giá",
    "Điểm chi tiết theo từng phần CV",
    "Gợi ý cải thiện cơ bản",
    "Xem toàn bộ lịch sử phân tích",
]

FREE_LIMITED_FEATURES = [
    "Roadmap cải thiện sau đánh giá",
    "Gợi ý chuyên sâu",
]

PREMIUM_FEATURES = [
    "Không giới hạn lượt phân tích CV",
    "Roadmap cải thiện sau mỗi lần đánh giá",
    "Xem toàn bộ lịch sử phân tích",
    "Gợi ý cải thiện chi tiết và chuyên sâu",
]

PREMIUM_COMING_SOON = [
    "Danh sách lỗi chi tiết",
    "Câu mẫu viết lại theo STAR",
    "Sao chép nhanh từng câu mẫu",
    "Nội dung viết lại nâng cao",
    "Matching Score với mô tả công việc",
    "AI Assistant hỗ trợ chỉnh sửa CV",
    "Tải xuống CV đã chỉnh sửa",
]


def normalize_plan_features(plan_id: str, features: list[str]) -> list[str]:
    plan_key = str(plan_id or "")
    if plan_key == "DV_FREE":
        return list(FREE_FEATURES)
    if plan_key.startswith("DV_PREMIUM"):
        return list(PREMIUM_FEATURES)

    cleaned: list[str] = []
    for feature in features:
        normalized = feature.strip()
        if not normalized:
            continue
        cleaned.append(normalized)
    return cleaned


def plan_limited_features(plan_id: str) -> list[str]:
    return list(FREE_LIMITED_FEATURES) if str(plan_id or "") == "DV_FREE" else []


PLANS = [
    {
        "plan_id": "DV_FREE",
        "name": "Free",
        "price": 0,
        "duration_days": -1,
        "analysis_limit": 3,
        "features": FREE_FEATURES,
        "limited_features": FREE_LIMITED_FEATURES,
        "coming_soon": [],
    },
    {
        "plan_id": "DV_PREMIUM_30",
        "name": "Premium — Job Search Pass",
        "price": 199000,
        "duration_days": 30,
        "analysis_limit": 20,
        "features": PREMIUM_FEATURES,
        "limited_features": [],
        "coming_soon": PREMIUM_COMING_SOON,
    },
    {
        "plan_id": "DV_PREMIUM_90",
        "name": "Premium — Job Search Pass",
        "price": 389000,
        "duration_days": 90,
        "analysis_limit": 30,
        "features": PREMIUM_FEATURES,
        "limited_features": [],
        "coming_soon": PREMIUM_COMING_SOON,
    },
]


@router.get("", summary="UC-026: Xem gói dịch vụ")
async def get_service_plans() -> dict[str, Any]:
    """Trả về danh sách gói dịch vụ từ GOIDV collection, fallback sang hardcoded nếu DB chưa có."""
    try:
        db_plans = await list_public_plans(db)
        for plan in db_plans:
            plan["limited_features"] = plan.get("limited_features") or plan_limited_features(plan["plan_id"])
        # An empty list is valid when Admin has disabled every plan.
        return {"data": db_plans}
    except Exception:
        db_plans = []

    # Fallback is used only when MongoDB cannot be reached.
    return {
        "data": [
            {
                "plan_id": "DV_FREE",
                "name": "Free",
                "price": 0,
                "duration_days": -1,
                "analysis_limit": 3,
                "features": FREE_FEATURES,
                "limited_features": FREE_LIMITED_FEATURES,
                "coming_soon": [],
            },
            {
                "plan_id": "DV_PREMIUM_30",
                "name": "Premium — Job Search Pass",
                "price": 199000,
                "duration_days": 30,
                "analysis_limit": 20,
                "features": PREMIUM_FEATURES,
                "limited_features": [],
                "coming_soon": PREMIUM_COMING_SOON,
            },
            {
                "plan_id": "DV_PREMIUM_90",
                "name": "Premium — Job Search Pass",
                "price": 389000,
                "duration_days": 90,
                "analysis_limit": 30,
                "features": PREMIUM_FEATURES,
                "limited_features": [],
                "coming_soon": PREMIUM_COMING_SOON,
            },
        ]
    }
