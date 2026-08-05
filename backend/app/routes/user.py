"""Routes for user profile and privacy settings."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.db import db
from app.routes.dependencies import get_current_user, get_customer_user
from app.services.analysis_service import DATABASE_ERRORS, resolve_quota_state
from app.services.product_analytics_service import record_product_event_safely
from app.services.plan_service import add_plan_duration
from app.services.user_service import get_profile, request_data_deletion, update_profile

PREMIUM_PLAN_IDS = {"DV_PREMIUM_30", "DV_PREMIUM_90"}


router = APIRouter(prefix="/api/v1/users", tags=["User Profile"])


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    email: str | None = Field(default=None, max_length=254)
    industry_interest: str | None = Field(default=None, max_length=160)
    target_role: str | None = Field(default=None, max_length=160)
    current_level: str | None = Field(default=None, max_length=160)
    avatar_url: str | None = None


class DataDeletionRequest(BaseModel):
    scope: str = Field(default="cv_data")
    reason: str | None = Field(default=None, max_length=500)


class ChangePlanRequest(BaseModel):
    plan_id: str = Field(..., min_length=2, max_length=80)


@router.get("/me", summary="UC-011: Xem thông tin cá nhân")
async def get_me(user: dict[str, str] = Depends(get_current_user)) -> dict[str, Any]:
    profile = await get_profile(db, user["user_id"])
    return {"data": profile, "error": None}


@router.patch("/me", summary="UC-011: Cập nhật thông tin cá nhân")
async def update_me(
    payload: ProfileUpdateRequest,
    user: dict[str, str] = Depends(get_current_user),
) -> dict[str, Any]:
    profile = await update_profile(
        db,
        user_id=user["user_id"],
        full_name=payload.full_name,
        email=payload.email,
        industry_interest=payload.industry_interest,
        target_role=payload.target_role,
        current_level=payload.current_level,
        avatar_url=payload.avatar_url,
    )
    return {
        "data": profile,
        "meta": {"message": "Cập nhật thông tin cá nhân thành công."},
        "error": None,
    }


@router.post("/me/data-deletion-request", summary="UC-011: Yêu cầu xóa dữ liệu")
async def create_data_deletion_request(
    payload: DataDeletionRequest,
    user: dict[str, str] = Depends(get_current_user),
) -> dict[str, Any]:
    deletion_request = await request_data_deletion(
        db,
        user_id=user["user_id"],
        scope=payload.scope,
        reason=payload.reason,
    )
    return {
        "data": deletion_request,
        "meta": {"message": "Yêu cầu xóa dữ liệu đã được ghi nhận."},
        "error": None,
    }


@router.get("/me/quota", summary="Lấy lượt phân tích còn lại trong chu kỳ hiện tại")
async def get_my_quota(user: dict[str, str] = Depends(get_current_user)) -> dict[str, Any]:
    """Trả về số lượt đã dùng và còn lại.
    Premium: unlimited=True. Registered: used/limit/remaining."""
    from datetime import datetime, timezone

    user_id = user["user_id"]

    try:
        now = datetime.now(timezone.utc)
        # Dùng chung logic xác định gói/limit/period_start với bước chặn
        # upload CV và chặn tạo phân tích (app.services.analysis_service).
        state = await resolve_quota_state(db, user_id, now)

        account_type = state["account_type"]
        current_plan_id = state["plan_id"]
        limit = state["limit"]
        is_unlimited = state["is_unlimited"]
        period_start = state["period_start"]

        # Đếm TỔNG số lần phân tích để HIỂN THỊ (không lọc ngày)
        used = await db["LICHSUPTCV"].count_documents({"MaKH": user_id})

        # Tính số lượt còn lại theo chu kỳ hiện tại (có lọc theo period_start)
        if not is_unlimited:
            used_in_period = await db["LICHSUPTCV"].count_documents({
                "MaKH": user_id,
                "NgayPT": {"$gte": period_start}
            })
            remaining = max(0, limit - used_in_period)
        else:
            remaining = None

        label = "Không giới hạn" if is_unlimited else f"{remaining}/{limit} lượt còn lại"

        return {
            "data": {
                "account_type": account_type,
                "current_plan_id": current_plan_id,
                "unlimited": is_unlimited,
                "used": used,
                "limit": None if is_unlimited else limit,
                "remaining": remaining,
                "label": label,
                "auto_renew": state.get("auto_renew", False),
                "expires_at": state["expires_at"].isoformat() if state.get("expires_at") else None,
            },
            "error": None,
        }
    except DATABASE_ERRORS:
        return {
            "data": {
                "account_type": "registered",
                "current_plan_id": "DV_FREE",
                "unlimited": False,
                "used": 0,
                "limit": 3,
                "remaining": 3,
                "label": "3/3 lượt còn lại",
                "auto_renew": False,
                "expires_at": None,
            },
            "error": None,
        }


@router.post("/me/change-plan", summary="Nâng cấp hoặc thay đổi gói dịch vụ")
async def change_plan(
    payload: ChangePlanRequest,
    user: dict[str, str] = Depends(get_customer_user),
) -> dict[str, Any]:
    """Nâng cấp registered → premium hoặc từ premium 30 → premium 90.
    Cập nhật LoaiKH trong KHACHHANG và tạo/cập nhật LUOTDUNG."""
    from datetime import datetime, timezone
    from uuid import uuid4
    from fastapi import HTTPException

    user_id = user["user_id"]
    new_plan_id = payload.plan_id.strip()

    try:
        plan_document = await db["GOIDV"].find_one({"_id": new_plan_id})
        current_customer = await db["KHACHHANG"].find_one({"_id": user_id})
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Không thể đọc cấu hình gói."},
        ) from exc
    if not plan_document:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PLAN", "message": "Gói dịch vụ không tồn tại."})
    if str(plan_document.get("TrangThai") or "active") != "active":
        raise HTTPException(status_code=400, detail={"code": "PLAN_INACTIVE", "message": "Gói dịch vụ đang ngừng hoạt động."})

    now = datetime.now(timezone.utc)
    new_loai_kh = "registered" if new_plan_id == "DV_FREE" else "premium"
    duration_days = plan_document.get("HanSuDung")
    if new_loai_kh == "premium" and (not isinstance(duration_days, int) or duration_days <= 0):
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_PLAN_DURATION", "message": "Gói Premium chưa có thời hạn hợp lệ."},
        )

    # Cập nhật loại tài khoản
    await db["KHACHHANG"].update_one({"_id": user_id}, {"$set": {"LoaiKH": new_loai_kh}})
    await db["TAIKHOAN"].update_one(
        {"MaKH": user_id},
        {"$set": {"Role": new_loai_kh, "UpdatedAt": now}},
    )

    if new_loai_kh == "premium" and duration_days:
        # Tạo/cập nhật LUOTDUNG với gói mới
        await db["LUOTDUNG"].update_one(
            {"MaKH": user_id, "MaGoiDV": new_plan_id},
            {
                "$set": {
                    "MaKH": user_id,
                    "MaGoiDV": new_plan_id,
                    "NgayBatDau": now,
                    "HanSuDung": add_plan_duration(now, duration_days),
                    "TuDongGiaHan": True,
                    "PlanSnapshot": {
                        "TenGoi": plan_document.get("TenGoi"),
                        "HanSuDung": duration_days,
                        "SoLuotPhanTich": plan_document.get("SoLuotPhanTich"),
                    },
                },
                "$setOnInsert": {"_id": f"LD_{uuid4().hex[:10].upper()}"},
            },
            upsert=True,
        )

    if new_loai_kh == "premium" and str((current_customer or {}).get("LoaiKH")) != "premium":
        await record_product_event_safely(
            db,
            event_name="premium_converted",
            user_id=user_id,
            metadata={"plan_id": new_plan_id},
        )

    return {
        "data": {"plan_id": new_plan_id, "account_type": new_loai_kh},
        "meta": {"message": "Nâng cấp gói dịch vụ thành công."},
        "error": None,
    }


@router.post("/me/renew-plan", summary="Gia hạn gói hiện tại")
async def renew_plan(
    user: dict[str, str] = Depends(get_customer_user),
) -> dict[str, Any]:
    """Gia hạn gói premium hiện tại thêm số ngày tương ứng."""
    from datetime import datetime, timezone
    from fastapi import HTTPException

    user_id = user["user_id"]
    now = datetime.now(timezone.utc)

    usage_doc = await db["LUOTDUNG"].find_one(
        {"MaKH": user_id, "MaGoiDV": {"$in": sorted(PREMIUM_PLAN_IDS)}},
        sort=[("HanSuDung", -1)],
    )
    if not usage_doc:
        raise HTTPException(status_code=400, detail={"code": "NOT_PREMIUM", "message": "Chỉ gói Premium mới có thể gia hạn."})

    plan_id = usage_doc["MaGoiDV"]
    plan_document = await db["GOIDV"].find_one({"_id": plan_id})
    if not plan_document or str(plan_document.get("TrangThai") or "active") != "active":
        raise HTTPException(status_code=400, detail={"code": "PLAN_INACTIVE", "message": "Gói hiện tại không còn được gia hạn."})
    duration_days = plan_document.get("HanSuDung")
    if not isinstance(duration_days, int) or duration_days <= 0:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PLAN_DURATION", "message": "Thời hạn gói không hợp lệ."})

    # Gia hạn: nếu còn hạn thì cộng thêm từ HanSuDung, nếu hết hạn thì tính từ now
    current_expiry = usage_doc.get("HanSuDung")
    if current_expiry:
        current_naive = current_expiry.replace(tzinfo=None)
        now_naive = now.replace(tzinfo=None)
        base = current_naive if current_naive > now_naive else now_naive
    else:
        base = now.replace(tzinfo=None)

    new_expiry = add_plan_duration(base.replace(tzinfo=timezone.utc), duration_days)

    await db["LUOTDUNG"].update_one(
        {"_id": usage_doc["_id"]},
        {"$set": {"HanSuDung": new_expiry}},
    )

    return {
        "data": {"plan_id": plan_id, "new_expiry": new_expiry.isoformat()},
        "meta": {"message": f"Gia hạn gói {duration_days} ngày thành công."},
        "error": None,
    }


@router.post("/me/cancel-plan", summary="Hủy gói Premium")
async def cancel_plan(
    user: dict[str, str] = Depends(get_customer_user),
) -> dict[str, Any]:
    """Đánh dấu hủy; quyền Premium vẫn còn hiệu lực đến hết ngày đã thanh toán."""
    from datetime import datetime, timezone
    from fastapi import HTTPException

    user_id = user["user_id"]
    now = datetime.now(timezone.utc)

    customer = await db["KHACHHANG"].find_one({"_id": user_id})
    if not customer or customer.get("LoaiKH") != "premium":
        raise HTTPException(status_code=400, detail={"code": "NOT_PREMIUM", "message": "Tài khoản hiện không phải Premium."})

    usage_doc = await db["LUOTDUNG"].find_one(
        {"MaKH": user_id, "MaGoiDV": {"$in": list(PREMIUM_PLAN_IDS)}},
        sort=[("HanSuDung", -1)],
    )
    if not usage_doc or not usage_doc.get("HanSuDung"):
        raise HTTPException(status_code=400, detail={"code": "PLAN_NOT_FOUND", "message": "Không tìm thấy chu kỳ Premium đang hoạt động."})

    await db["LUOTDUNG"].update_one(
        {"_id": usage_doc["_id"]},
        {"$set": {"TuDongGiaHan": False, "NgayYeuCauHuy": now}},
    )

    return {
        "data": {"account_type": "premium", "expires_at": usage_doc["HanSuDung"].isoformat(), "auto_renew": False},
        "meta": {"message": "Đã hủy gói. Quyền lợi Premium vẫn dùng được đến ngày hết hạn."},
        "error": None,
    }
