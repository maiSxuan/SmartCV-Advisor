"""Business rules and persistence for product feedback."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.services.analysis_service import resolve_quota_state
from app.services.database_bootstrap import ensure_mvp_collections


FEEDBACK_TYPES = {
    "loi_ky_thuat",
    "ket_qua_kho_hieu",
    "goi_y_chua_cu_the",
    "nhan_xet_chua_chinh_xac",
    "quyen_rieng_tu",
    "gop_y_khac",
}
FEEDBACK_STATUSES = {"Moi", "DangXemXet", "DaXuLy", "KhongXuLy"}


def _iso(value: Any) -> str | None:
    return value.isoformat() if isinstance(value, datetime) else value


def serialize_feedback(document: dict[str, Any]) -> dict[str, Any]:
    item = dict(document)
    item["_id"] = str(item.get("_id", ""))
    item["NgayTao"] = _iso(item.get("NgayTao"))
    item["NgayCapNhat"] = _iso(item.get("NgayCapNhat"))
    item["NgayBatDauChuKy"] = _iso(item.get("NgayBatDauChuKy"))
    return item


def lifecycle_key(usage: dict[str, Any], period_start: datetime) -> str:
    """Remain unique even when legacy code reuses one LUOTDUNG document."""
    raw_start = period_start.isoformat() if isinstance(period_start, datetime) else str(period_start)
    return f"{usage.get('_id', 'UNKNOWN')}:{raw_start}"


async def resolve_feedback_lifecycle(db: Any, user_id: str) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    quota = await resolve_quota_state(db, user_id, now)
    plan_id = str(quota["plan_id"])
    period_start = quota["period_start"]
    usage = await db["LUOTDUNG"].find_one(
        {"MaKH": user_id, "MaGoiDV": plan_id, "NgayBatDau": period_start},
        sort=[("NgayBatDau", -1)],
    )
    if not usage:
        usage = await db["LUOTDUNG"].find_one(
            {"MaKH": user_id, "MaGoiDV": plan_id},
            sort=[("NgayBatDau", -1)],
        )
    if not usage:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "LIFECYCLE_NOT_READY", "message": "Chưa xác định được chu kỳ tài khoản hiện tại."},
        )
    return {
        "lifecycle_id": lifecycle_key(usage, period_start),
        "usage_id": str(usage.get("_id")),
        "plan_id": plan_id,
        "period_start": period_start,
    }


async def ensure_analysis_owned(db: Any, user_id: str, analysis_id: str) -> None:
    result = await db["KETQUA_PTCV"].find_one({"_id": analysis_id}, {"MaCV": 1})
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "Không tìm thấy kết quả phân tích."},
        )
    owned_cv = await db["CV"].find_one({"_id": result.get("MaCV"), "MaKH": user_id}, {"_id": 1})
    if not owned_cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "Không tìm thấy kết quả thuộc tài khoản hiện tại."},
        )


async def get_feedback_eligibility(db: Any, user_id: str, analysis_id: str | None = None) -> dict[str, Any]:
    if analysis_id:
        await ensure_analysis_owned(db, user_id, analysis_id)
    lifecycle = await resolve_feedback_lifecycle(db, user_id)
    existing = await db["DANHGIASP"].find_one(
        {"MaKH": user_id, "MaChuKy": lifecycle["lifecycle_id"]},
        {"_id": 1},
    )
    return {
        "can_submit": existing is None,
        "reason": None if existing is None else "Bạn đã gửi phản hồi trong chu kỳ tài khoản này.",
        "existing_feedback_id": str(existing["_id"]) if existing else None,
        "lifecycle_id": lifecycle["lifecycle_id"],
        "plan_id": lifecycle["plan_id"],
    }


async def create_feedback(db: Any, user_id: str, payload: Any) -> dict[str, Any]:
    # Enforce the unique lifecycle rule even if the app first started while
    # MongoDB was temporarily unavailable.
    await ensure_mvp_collections(db)
    await ensure_analysis_owned(db, user_id, payload.analysis_id)
    lifecycle = await resolve_feedback_lifecycle(db, user_id)
    now = datetime.now(timezone.utc)
    document = {
        "_id": f"DG_{uuid4().hex[:16].upper()}",
        "MaKH": user_id,
        "MaChuKy": lifecycle["lifecycle_id"],
        "MaLuotDung": lifecycle["usage_id"],
        "MaGoiDV": lifecycle["plan_id"],
        "NgayBatDauChuKy": lifecycle["period_start"],
        "MaKQ": payload.analysis_id,
        "LoaiPhanHoi": payload.feedback_type,
        "DanhGia": payload.rating,
        "CauHoi1": payload.easy_to_understand,
        "CauHoi2": payload.recommendation_specific,
        "CauHoi3": payload.useful,
        "CauHoi4": payload.inaccurate,
        "CauHoi5": payload.want_reanalyze,
        "CauHoi6": payload.willing_to_recommend,
        "BinhLuan": payload.comment.strip() if payload.comment else None,
        "TrangThai": "Moi",
        "GhiChuNoiBo": None,
        "NgayTao": now,
        "NgayCapNhat": now,
        "MaADMCapNhat": None,
    }
    try:
        await db["DANHGIASP"].insert_one(document)
    except DuplicateKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "FEEDBACK_LIMIT_REACHED",
                "message": "Mỗi chu kỳ tài khoản chỉ được gửi một phản hồi duy nhất.",
            },
        ) from exc
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Không thể lưu phản hồi."},
        ) from exc
    return serialize_feedback(document)


async def list_feedback(
    db: Any,
    *,
    feedback_type: str | None,
    feedback_status: str | None,
    rating: int | None,
    page: int,
    limit: int,
) -> dict[str, Any]:
    query: dict[str, Any] = {}
    if feedback_type:
        query["LoaiPhanHoi"] = feedback_type
    if feedback_status:
        query["TrangThai"] = feedback_status
    if rating is not None:
        query["DanhGia"] = rating

    total = await db["DANHGIASP"].count_documents(query)
    cursor = db["DANHGIASP"].find(query).sort("NgayTao", -1).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return {
        "items": [serialize_feedback(item) for item in items],
        "total": int(total),
        "page": page,
        "limit": limit,
        "has_next": page * limit < total,
    }


async def update_feedback(db: Any, feedback_id: str, admin_id: str, payload: Any) -> dict[str, Any]:
    updates: dict[str, Any] = {"NgayCapNhat": datetime.now(timezone.utc), "MaADMCapNhat": admin_id}
    fields_set = getattr(payload, "model_fields_set", set())
    if "feedback_type" in fields_set:
        updates["LoaiPhanHoi"] = payload.feedback_type
    if "status" in fields_set:
        updates["TrangThai"] = payload.status
    if "note" in fields_set:
        updates["GhiChuNoiBo"] = payload.note.strip() if payload.note else None

    result = await db["DANHGIASP"].find_one_and_update(
        {"_id": feedback_id},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FEEDBACK_NOT_FOUND", "message": "Không tìm thấy phản hồi."},
        )
    return serialize_feedback(result)
