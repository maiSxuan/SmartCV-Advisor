"""Routes for UC-012, UC-013, and UC-014."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.db import db
from app.routes.dependencies import get_current_user
from app.services.analysis_service import (
    DATABASE_ERRORS,
    create_analysis_for_cv,
    ensure_analysis_quota_available,
    list_career_roles,
    resolve_quota_state,
)
from app.services.cv_service import CONSENT_POLICY_VERSION, build_cv_document, public_cv_metadata
from app.services.product_analytics_service import record_product_event_safely


router = APIRouter(prefix="/api/v1/cvs", tags=["CV"])
career_role_router = APIRouter(prefix="/api/v1/career-roles", tags=["Career Roles"])


class AnalysisCreateRequest(BaseModel):
    career_role_id: str = Field(..., min_length=1)


@career_role_router.get("", summary="UC-013: Danh sách vị trí mục tiêu")
async def get_career_roles() -> dict[str, Any]:
    roles = await list_career_roles(db)
    active_roles = [role for role in roles if role.get("status") == "active"]
    return {"data": active_roles, "meta": {"count": len(active_roles)}}


@router.post("", status_code=status.HTTP_201_CREATED, summary="UC-012: Tải CV và ghi nhận consent")
async def upload_cv(
    file: UploadFile = File(...),
    consent_accepted: bool = Form(...),
    policy_version: str = Form(CONSENT_POLICY_VERSION),
    user: dict[str, str] = Depends(get_current_user),
) -> dict[str, Any]:
    # BR: user (free/registered) đã dùng hết lượt phân tích trong chu kỳ hiện tại
    # thì không được tải thêm CV mới lên nữa. Chặn ở đây (trước khi đọc/xử lý file)
    # để tránh tốn chi phí trích xuất text/OCR/GPT cho một CV chắc chắn không
    # phân tích được. Premium (SoLuotPhanTich = -1) luôn được bỏ qua bước này.
    await ensure_analysis_quota_available(db, user["user_id"])

    content = await file.read()
    cv_document = await build_cv_document(
        file=file,
        content=content,
        consent_accepted=consent_accepted,
        user_id=user["user_id"],
        policy_version=policy_version,
    )
    try:
        await db["CV"].insert_one(cv_document)
        await db["LOG_KH"].insert_one(
            {
                "_id": f"LOG_{cv_document['_id']}",
                "HanhDong": "Tải CV lên hệ thống",
                "DuLieuTruoc": None,
                "DuLieuSau": {
                    "TenFileGoc": cv_document["TenFileGoc"],
                    "TrangThai": cv_document["TrangThai"],
                    "ConsentPolicyVersion": cv_document["Consent"]["policy_version"],
                },
                "KetQua": "Thanh cong",
                "ThoiDiemThucHien": cv_document["NgayTaiLen"],
                "MaKH": user["user_id"],
                "DoiTuong": "CV",
                "MaDoiTuong": cv_document["_id"],
            }
        )
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_UNAVAILABLE",
                "message": "Chưa lưu được CV vì MongoDB chưa kết nối được.",
                "hint": "Mở /api/health để xem database.status. Nếu dùng Atlas, kiểm tra DNS/mạng/IP allowlist; nếu dùng local, bật mongod và dùng mongodb://localhost:27017.",
            },
        ) from exc
    await record_product_event_safely(
        db,
        event_name="upload_completed",
        user_id=user["user_id"],
        cv_id=cv_document["_id"],
        metadata={"file_type": cv_document.get("Loai"), "size": cv_document.get("DungLuong")},
    )
    return {
        "data": public_cv_metadata(cv_document),
        "meta": {"next_step": "select_career_role"},
        "error": None,
    }


@router.get("/{cv_id}", summary="UC-012: Xem metadata CV đã tải")
async def get_cv_metadata(cv_id: str, user: dict[str, str] = Depends(get_current_user)) -> dict[str, Any]:
    try:
        cv = await db["CV"].find_one({"_id": cv_id, "MaKH": user["user_id"]})
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_UNAVAILABLE",
                "message": "Chưa kết nối được cơ sở dữ liệu. Vui lòng kiểm tra MongoDB URI hoặc mạng.",
                "hint": "Mở /api/health để xem trạng thái database hiện tại.",
            },
        ) from exc

    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CV_NOT_FOUND", "message": "Không tìm thấy CV thuộc tài khoản hiện tại."},
        )
    return {"data": public_cv_metadata(cv), "error": None}


@router.post("/{cv_id}/analyses", status_code=status.HTTP_201_CREATED, summary="UC-014: Phân tích và chấm điểm CV")
async def create_analysis(
    cv_id: str,
    payload: AnalysisCreateRequest,
    user: dict[str, str] = Depends(get_current_user),
) -> dict[str, Any]:
    from datetime import datetime, timezone

    quota_state = await resolve_quota_state(db, user["user_id"], datetime.now(timezone.utc))
    await record_product_event_safely(
        db,
        event_name="analysis_started",
        user_id=user["user_id"],
        cv_id=cv_id,
        role_id=payload.career_role_id,
    )
    result = await create_analysis_for_cv(
        db=db,
        cv_id=cv_id,
        role_id=payload.career_role_id,
        user_id=user["user_id"],
        current_plan=quota_state["account_type"],
    )
    await record_product_event_safely(
        db,
        event_name="analysis_completed",
        user_id=user["user_id"],
        cv_id=cv_id,
        analysis_id=result["analysis_id"],
        role_id=result.get("role_id") or payload.career_role_id,
    )
    return {
        "data": result,
        "meta": {"next_step": "view_result"},
        "error": None,
    }
