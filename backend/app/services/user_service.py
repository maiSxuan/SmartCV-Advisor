"""User profile and privacy service for UC-011."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status

from app.services.analysis_service import DATABASE_ERRORS


MAX_AVATAR_DATA_URL_LENGTH = 900_000


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def account_type_label(value: str | None) -> str:
    normalized = str(value or "registered").lower()
    if normalized == "premium":
        return "premium"
    return "registered"


def public_cv_item(cv: dict[str, Any]) -> dict[str, Any]:
    return {
        "cv_id": cv.get("_id"),
        "filename": cv.get("TenFileGoc"),
        "uploaded_at": cv.get("NgayTaiLen"),
        "target_role_id": cv.get("MaNganh"),
        "target_role_name": cv.get("TenNganh") or cv.get("ViTriMucTieu"),
        "status": cv.get("TrangThai"),
    }


def public_deletion_request(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "request_id": item.get("_id"),
        "scope": item.get("Scope"),
        "reason": item.get("Reason"),
        "status": item.get("Status"),
        "requested_at": item.get("RequestedAt"),
        "resolved_at": item.get("ResolvedAt"),
    }


async def get_profile(db: Any, user_id: str) -> dict[str, Any]:
    try:
        customer = await db["KHACHHANG"].find_one({"_id": user_id})
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "USER_NOT_FOUND", "message": "Không tìm thấy hồ sơ người dùng."},
            )

        # Return every CV owned by the user so the privacy screen can delete
        # any uploaded file, not only the ten most recent ones.
        cvs = await db["CV"].find({"MaKH": user_id}).sort("NgayTaiLen", -1).to_list(length=None)
        role_ids = sorted({cv.get("MaNganh") for cv in cvs if cv.get("MaNganh")})
        roles = await db["NGANHNGHIET"].find({"_id": {"$in": role_ids}}).to_list(length=len(role_ids))
        role_name_by_id = {role["_id"]: role.get("TenNganh") for role in roles}
        for cv in cvs:
            cv["TenNganh"] = role_name_by_id.get(cv.get("MaNganh"))
        deletion_requests = (
            await db["DATA_DELETION_REQUESTS"]
            .find({"MaKH": user_id})
            .sort("RequestedAt", -1)
            .limit(5)
            .to_list(length=5)
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa tải được hồ sơ vì MongoDB chưa sẵn sàng."},
        ) from exc

    account_type = account_type_label(customer.get("LoaiKH"))
    return {
        "user_id": customer.get("_id"),
        "full_name": customer.get("HoTen", ""),
        "email": customer.get("Email", ""),
        "avatar_url": customer.get("AvatarUrl"),
        "industry_interest": customer.get("NNQuanTam", ""),
        "target_role": customer.get("ViTriNN", ""),
        "current_level": customer.get("TrinhDoHV", ""),
        "account_type": account_type,
        "account_status": customer.get("TrangThai", "Hoạt động"),
        "registered_at": customer.get("NgayDangKy"),
        "updated_at": customer.get("NgayCapNhat"),
        "privacy": {
            "training_opt_in": bool(customer.get("TrainingOptIn", False)),
            "cv_count": len(cvs),
            "deletion_request_status": deletion_requests[0].get("Status") if deletion_requests else None,
        },
        "uploaded_cvs": [public_cv_item(cv) for cv in cvs],
        "data_deletion_requests": [public_deletion_request(item) for item in deletion_requests],
    }


async def update_profile(
    db: Any,
    *,
    user_id: str,
    full_name: str | None,
    email: str | None,
    industry_interest: str | None,
    target_role: str | None,
    current_level: str | None,
    avatar_url: str | None,
) -> dict[str, Any]:
    try:
        customer = await db["KHACHHANG"].find_one({"_id": user_id})
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "USER_NOT_FOUND", "message": "Không tìm thấy hồ sơ người dùng."},
            )

        if email is not None and email.strip().lower() != str(customer.get("Email", "")).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "USER_EMAIL_CHANGE_NOT_ALLOWED",
                    "message": "MVP chưa hỗ trợ đổi email trực tiếp nếu email đang được dùng để đăng ký.",
                },
            )

        updates: dict[str, Any] = {"NgayCapNhat": utc_now()}
        if full_name is not None:
            clean_name = full_name.strip()
            if not clean_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "USER_REQUIRED_FIELD", "message": "Họ và tên không được để trống."},
                )
            updates["HoTen"] = clean_name
        if industry_interest is not None:
            updates["NNQuanTam"] = industry_interest.strip()
        if target_role is not None:
            updates["ViTriNN"] = target_role.strip()
        if current_level is not None:
            updates["TrinhDoHV"] = current_level.strip()
        if avatar_url is not None:
            clean_avatar = avatar_url.strip()
            if clean_avatar and not clean_avatar.startswith("data:image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "USER_AVATAR_INVALID", "message": "Định dạng ảnh đại diện không hợp lệ."},
                )
            if len(clean_avatar) > MAX_AVATAR_DATA_URL_LENGTH:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "USER_AVATAR_TOO_LARGE", "message": "Dung lượng ảnh đại diện quá lớn."},
                )
            updates["AvatarUrl"] = clean_avatar or None

        await db["KHACHHANG"].update_one({"_id": user_id}, {"$set": updates})
        await db["LOG_KH"].insert_one(
            {
                "_id": f"LOG_PROFILE_{uuid4().hex[:10].upper()}",
                "HanhDong": "Cập nhật thông tin cá nhân",
                "DuLieuTruoc": None,
                "DuLieuSau": {key: value for key, value in updates.items() if key != "AvatarUrl"},
                "KetQua": "Thanh cong",
                "ThoiDiemThucHien": utc_now(),
                "MaKH": user_id,
                "DoiTuong": "KHACHHANG",
                "MaDoiTuong": user_id,
            }
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa cập nhật được hồ sơ vì MongoDB chưa sẵn sàng."},
        ) from exc

    return await get_profile(db, user_id)


async def request_data_deletion(
    db: Any,
    *,
    user_id: str,
    scope: str,
    reason: str | None,
) -> dict[str, Any]:
    clean_scope = scope.strip() or "cv_data"
    if clean_scope not in {"cv_data", "all_personal_data"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "DATA_DELETION_SCOPE_INVALID", "message": "Phạm vi xóa dữ liệu không hợp lệ."},
        )

    try:
        customer = await db["KHACHHANG"].find_one({"_id": user_id})
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "USER_NOT_FOUND", "message": "Không tìm thấy hồ sơ người dùng."},
            )

        existing = await db["DATA_DELETION_REQUESTS"].find_one(
            {"MaKH": user_id, "Scope": clean_scope, "Status": {"$in": ["pending", "processing"]}}
        )
        if existing:
            return public_deletion_request(existing)

        now = utc_now()
        document = {
            "_id": f"DR_{uuid4().hex[:12].upper()}",
            "MaKH": user_id,
            "Scope": clean_scope,
            "Reason": (reason or "").strip(),
            "Status": "pending",
            "RequestedAt": now,
            "ResolvedAt": None,
        }
        await db["DATA_DELETION_REQUESTS"].insert_one(document)
        await db["LOG_KH"].insert_one(
            {
                "_id": f"LOG_DELETE_{uuid4().hex[:10].upper()}",
                "HanhDong": "Yêu cầu xóa dữ liệu",
                "DuLieuTruoc": None,
                "DuLieuSau": {"Scope": clean_scope, "Status": "pending"},
                "KetQua": "Thanh cong",
                "ThoiDiemThucHien": now,
                "MaKH": user_id,
                "DoiTuong": "DATA_DELETION_REQUESTS",
                "MaDoiTuong": document["_id"],
            }
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa gửi được yêu cầu xóa dữ liệu vì MongoDB chưa sẵn sàng."},
        ) from exc

    return public_deletion_request(document)
