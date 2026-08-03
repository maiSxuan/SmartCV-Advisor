"""NEWUC-01 and NEWUC-04: user feedback and admin moderation."""

from __future__ import annotations

from typing import Any, Literal, NoReturn

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, model_validator
from pymongo.errors import PyMongoError

from app.db import db
from app.routes.admin import require_admin
from app.routes.dependencies import get_customer_user
from app.services.feedback_service import (
    create_feedback,
    get_feedback_eligibility,
    list_feedback,
    update_feedback,
)


FeedbackType = Literal[
    "loi_ky_thuat",
    "ket_qua_kho_hieu",
    "goi_y_chua_cu_the",
    "nhan_xet_chua_chinh_xac",
    "quyen_rieng_tu",
    "gop_y_khac",
]
FeedbackStatus = Literal["Moi", "DangXemXet", "DaXuLy", "KhongXuLy"]

router = APIRouter(prefix="/api/v1/feedback", tags=["Feedback"])


class FeedbackCreateRequest(BaseModel):
    analysis_id: str = Field(..., min_length=1, max_length=120)
    feedback_type: FeedbackType = "gop_y_khac"
    rating: int = Field(..., ge=1, le=5)
    easy_to_understand: bool
    recommendation_specific: bool
    useful: bool
    inaccurate: bool
    want_reanalyze: bool
    willing_to_recommend: bool
    comment: str | None = Field(default=None, max_length=2000)


class FeedbackUpdateRequest(BaseModel):
    feedback_type: FeedbackType | None = None
    status: FeedbackStatus | None = None
    note: str | None = Field(default=None, max_length=3000)

    @model_validator(mode="after")
    def require_an_update(self) -> "FeedbackUpdateRequest":
        if not self.model_fields_set.intersection({"feedback_type", "status", "note"}):
            raise ValueError("Cần cung cấp ít nhất một trường cần cập nhật.")
        if "feedback_type" in self.model_fields_set and self.feedback_type is None:
            raise ValueError("Loại phản hồi không được để trống.")
        if "status" in self.model_fields_set and self.status is None:
            raise ValueError("Trạng thái phản hồi không được để trống.")
        return self


def _database_unavailable(exc: PyMongoError) -> NoReturn:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={"code": "DATABASE_UNAVAILABLE", "message": "MongoDB chưa sẵn sàng để xử lý phản hồi."},
    ) from exc


@router.get("/eligibility", summary="NEWUC-01: Kiểm tra quyền phản hồi trong chu kỳ hiện tại")
async def feedback_eligibility(
    analysis_id: str = Query(..., min_length=1, max_length=120),
    user: dict[str, str] = Depends(get_customer_user),
) -> dict[str, Any]:
    try:
        result = await get_feedback_eligibility(db, user["user_id"], analysis_id)
    except PyMongoError as exc:
        _database_unavailable(exc)
    return {"data": result, "error": None}


@router.post("", status_code=status.HTTP_201_CREATED, summary="NEWUC-01: Gửi phản hồi sau khi xem kết quả")
async def post_feedback(
    payload: FeedbackCreateRequest,
    user: dict[str, str] = Depends(get_customer_user),
) -> dict[str, Any]:
    try:
        result = await create_feedback(db, user["user_id"], payload)
    except PyMongoError as exc:
        _database_unavailable(exc)
    return {
        "data": result,
        "meta": {"message": "Cảm ơn bạn đã gửi phản hồi."},
        "error": None,
    }


@router.get("", summary="NEWUC-04: Admin xem và lọc danh sách phản hồi")
async def get_feedback_list(
    feedback_type: FeedbackType | None = Query(default=None),
    feedback_status: FeedbackStatus | None = Query(default=None, alias="status"),
    rating: int | None = Query(default=None, ge=1, le=5),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    try:
        result = await list_feedback(
            db,
            feedback_type=feedback_type,
            feedback_status=feedback_status,
            rating=rating,
            page=page,
            limit=limit,
        )
    except PyMongoError as exc:
        _database_unavailable(exc)
    return {
        "data": result["items"],
        "meta": {
            "total": result["total"],
            "page": result["page"],
            "limit": result["limit"],
            "has_next": result["has_next"],
            "actor": admin["user_id"],
        },
        "error": None,
    }


@router.patch("/{feedback_id}", summary="NEWUC-04: Phân loại và xử lý phản hồi")
async def patch_feedback(
    feedback_id: str,
    payload: FeedbackUpdateRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    try:
        result = await update_feedback(db, feedback_id, admin["user_id"], payload)
    except PyMongoError as exc:
        _database_unavailable(exc)
    return {
        "data": result,
        "meta": {"message": "Đã cập nhật phản hồi."},
        "error": None,
    }
