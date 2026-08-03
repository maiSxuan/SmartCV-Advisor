"""MongoDB-backed service-plan configuration shared by admin and users."""

from __future__ import annotations

import calendar
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import uuid4

from bson.decimal128 import Decimal128
from fastapi import HTTPException, status
from pymongo.errors import PyMongoError


def add_plan_duration(start: datetime, duration_days: int) -> datetime:
    """Treat the product's 30/90-day passes as 1/3 calendar months."""
    if duration_days not in {30, 90}:
        from datetime import timedelta

        return start + timedelta(days=duration_days)

    months = duration_days // 30
    zero_based_month = (start.month - 1) + months
    target_year = start.year + zero_based_month // 12
    target_month = (zero_based_month % 12) + 1
    target_day = min(start.day, calendar.monthrange(target_year, target_month)[1])
    return start.replace(year=target_year, month=target_month, day=target_day)


def _price_number(value: Any) -> int | float:
    if isinstance(value, Decimal128):
        value = value.to_decimal()
    if isinstance(value, Decimal):
        value = float(value)
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        number = 0.0
    return int(number) if number.is_integer() else number


def _features(value: Any) -> list[str]:
    if isinstance(value, list):
        source = value
    else:
        source = str(value or "").split(";")
    return [str(item).strip() for item in source if str(item).strip()]


def serialize_admin_plan(document: dict[str, Any]) -> dict[str, Any]:
    updated_at = document.get("NgayCapNhat")
    created_at = document.get("NgayTao")
    return {
        "_id": str(document.get("_id", "")),
        "TenGoi": str(document.get("TenGoi", "")),
        "Gia": _price_number(document.get("Gia", 0)),
        "HanSuDung": document.get("HanSuDung"),
        "SoLuotPhanTich": int(document.get("SoLuotPhanTich", 0) or 0),
        "QuyenLoi": "; ".join(_features(document.get("QuyenLoi"))),
        "SapRaMat": "; ".join(_features(document.get("SapRaMat"))),
        "TrangThai": str(document.get("TrangThai") or "active"),
        "NgayTao": created_at.isoformat() if isinstance(created_at, datetime) else created_at,
        "NgayCapNhat": updated_at.isoformat() if isinstance(updated_at, datetime) else updated_at,
    }


def serialize_public_plan(document: dict[str, Any]) -> dict[str, Any]:
    plan_id = str(document.get("_id", ""))
    return {
        "plan_id": plan_id,
        "name": str(document.get("TenGoi", "")),
        "price": _price_number(document.get("Gia", 0)),
        "duration_days": document.get("HanSuDung"),
        "analysis_limit": int(document.get("SoLuotPhanTich", 0) or 0),
        "features": _features(document.get("QuyenLoi")),
        "limited_features": _features(document.get("QuyenLoiGioiHan")),
        "coming_soon": _features(document.get("SapRaMat")),
        "status": str(document.get("TrangThai") or "active"),
        "updated_at": (
            document["NgayCapNhat"].isoformat()
            if isinstance(document.get("NgayCapNhat"), datetime)
            else document.get("NgayCapNhat")
        ),
    }


async def list_admin_plans(db: Any) -> list[dict[str, Any]]:
    documents = await db["GOIDV"].find({}).sort("NgayCapNhat", -1).to_list(length=100)
    return [serialize_admin_plan(document) for document in documents]


async def list_public_plans(db: Any) -> list[dict[str, Any]]:
    documents = await db["GOIDV"].find(
        {"$or": [{"TrangThai": "active"}, {"TrangThai": {"$exists": False}}]}
    ).sort("Gia", 1).to_list(length=100)
    return [serialize_public_plan(document) for document in documents]


async def upsert_plan(db: Any, admin_id: str, payload: Any) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    document = {
        "TenGoi": payload.name.strip(),
        "Gia": Decimal128(str(payload.price)),
        "HanSuDung": payload.duration_days,
        "SoLuotPhanTich": payload.analysis_limit,
        "QuyenLoi": "; ".join(item.strip() for item in payload.features if item.strip()),
        "SapRaMat": "; ".join(item.strip() for item in payload.coming_soon if item.strip()),
        "TrangThai": payload.status,
        "NgayCapNhat": now,
        "MaADM": admin_id,
    }
    try:
        existing = await db["GOIDV"].find_one({"_id": payload.plan_id})
        await db["GOIDV"].update_one(
            {"_id": payload.plan_id},
            {"$set": document, "$setOnInsert": {"NgayTao": now}},
            upsert=True,
        )
        await db["LOG_ADMIN"].insert_one(
            {
                "_id": f"LOG_PLAN_{uuid4().hex[:16].upper()}",
                "HanhDong": "Cập nhật cấu hình gói" if existing else "Tạo cấu hình gói",
                "DuLieuTruoc": serialize_admin_plan(existing) if existing else None,
                "DuLieuSau": {**serialize_admin_plan({"_id": payload.plan_id, **document})},
                "KetQua": "Thanh cong",
                "ThoiDiemThucHien": now,
                "MaADM": admin_id,
                "DoiTuong": "GOIDV",
                "MaDoiTuong": payload.plan_id,
            }
        )
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Không thể lưu cấu hình gói."},
        ) from exc
    return serialize_admin_plan({"_id": payload.plan_id, **document})
