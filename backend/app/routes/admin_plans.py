"""NEWUC-02: MongoDB-backed service-plan administration."""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator, model_validator
from pymongo.errors import PyMongoError

from app.db import db
from app.routes.admin import require_admin
from app.services.plan_service import list_admin_plans, upsert_plan


router = APIRouter(prefix="/api/v1/admin/plans", tags=["Admin Plans"])


class PlanUpsertRequest(BaseModel):
    plan_id: str = Field(..., pattern=r"^[A-Z0-9_-]{2,80}$")
    name: str = Field(..., min_length=1, max_length=160)
    price: float = Field(..., ge=0, le=1_000_000_000)
    duration_days: int = Field(..., ge=-1, le=3650)
    analysis_limit: int = Field(..., ge=-1, le=1_000_000)
    features: list[str] = Field(..., min_length=1, max_length=100)
    coming_soon: list[str] = Field(default_factory=list, max_length=100)
    status: Literal["active", "inactive"] = "active"

    @field_validator("features", "coming_soon")
    @classmethod
    def validate_features(cls, features: list[str]) -> list[str]:
        cleaned = [feature.strip() for feature in features if feature.strip()]
        if any(len(feature) > 500 for feature in cleaned):
            raise ValueError("Mỗi mục không được vượt quá 500 ký tự.")
        return cleaned

    @model_validator(mode="after")
    def validate_plan_rules(self) -> "PlanUpsertRequest":
        if self.analysis_limit == 0 or self.analysis_limit < -1:
            raise ValueError("Số lượt phân tích phải là -1 (không giới hạn) hoặc số dương.")

        if self.plan_id == "DV_FREE":
            if self.analysis_limit != 3:
                raise ValueError("Gói DV_FREE phải có đúng 3 lượt phân tích cho mỗi vòng đời Free.")
            if self.duration_days != -1:
                raise ValueError("Gói DV_FREE phải có thời hạn -1 (không giới hạn vòng đời Free).")
            return self

        if self.duration_days == -1:
            raise ValueError("Chỉ gói DV_FREE được phép có thời hạn -1.")
        if self.duration_days not in {30, 90}:
            raise ValueError("Gói Premium chỉ hỗ trợ thời hạn 30 hoặc 90 ngày.")

        expected_premium_duration = {
            "DV_PREMIUM_30": 30,
            "DV_PREMIUM_90": 90,
        }.get(self.plan_id)
        if expected_premium_duration is not None and self.duration_days != expected_premium_duration:
            raise ValueError(
                f"Gói {self.plan_id} phải có thời hạn {expected_premium_duration} ngày."
            )
        return self


@router.get("", summary="NEWUC-02: Admin xem cấu hình gói")
async def get_admin_plans(admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    try:
        items = await list_admin_plans(db)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Không thể tải cấu hình gói."},
        ) from exc
    return {"data": items, "meta": {"count": len(items), "actor": admin["user_id"]}, "error": None}


@router.post("", status_code=status.HTTP_200_OK, summary="NEWUC-02: Admin tạo/cập nhật cấu hình gói")
async def post_admin_plan(
    payload: PlanUpsertRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    plan = await upsert_plan(db, admin["user_id"], payload)
    return {"data": plan, "meta": {"message": "Đã lưu cấu hình gói."}, "error": None}
