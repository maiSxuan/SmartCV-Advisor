"""Admin services for Role IT, skill scoring, and user management."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status
from pymongo import ASCENDING
from pymongo.errors import ConfigurationError, OperationFailure, PyMongoError, ServerSelectionTimeoutError

from app.services.analysis_service import DEFAULT_ROLES, ROLE_ICON_LABELS
from app.services.cv_service import normalize_search_text


DATABASE_ERRORS = (ConfigurationError, PyMongoError, ServerSelectionTimeoutError)
ROLE_ACTIVE_VALUES = {"active", "hoat dong", "hoạt động", "dang hoat dong", "đang hoạt động"}
ROLE_INACTIVE_VALUES = {"inactive", "ngung hoat dong", "ngưng hoạt động", "an", "ẩn"}
ACCOUNT_LOCKED_VALUES = {"locked", "khoa", "khóa", "da khoa", "đã khóa"}
MAX_PAGE_SIZE = 50


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_iso(value: Any) -> str | None:
    if isinstance(value, datetime):
        return value.isoformat()
    if value is None:
        return None
    return str(value)


def as_utc_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def clean_text(value: str | None, *, max_length: int, field_name: str) -> str:
    cleaned = (value or "").strip()
    if not cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_FIELD_REQUIRED", "message": "Vui lòng nhập đầy đủ thông tin bắt buộc.", "field": field_name},
        )
    if len(cleaned) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_FIELD_TOO_LONG", "message": f"{field_name} vượt quá độ dài cho phép."},
        )
    return cleaned


def optional_clean_text(value: str | None, *, max_length: int) -> str:
    cleaned = (value or "").strip()
    return cleaned[:max_length]


def normalized_unique(value: str) -> str:
    return re.sub(r"\s+", " ", normalize_search_text(value).strip())


def slug_fragment(value: str) -> str:
    fragment = re.sub(r"[^a-z0-9]+", "_", normalized_unique(value)).strip("_").upper()
    return fragment[:40] or uuid4().hex[:10].upper()


def public_role_status(value: Any) -> str:
    normalized = normalized_unique(str(value or "active"))
    if normalized in ROLE_ACTIVE_VALUES:
        return "active"
    return "inactive"


def db_role_status(value: str) -> str:
    return "hoat dong" if value == "active" else "ngung hoat dong"


def public_account_status(value: Any) -> str:
    normalized = normalized_unique(str(value or "active"))
    if normalized in ACCOUNT_LOCKED_VALUES:
        return "locked"
    return "active"


def db_account_status(value: str) -> str:
    return "locked" if value == "locked" else "active"


def importance_to_label(value: int) -> str:
    if value >= 3:
        return "Core Skill"
    if value == 2:
        return "Important"
    if value == 1:
        return "Nice to have"
    return "Không tính điểm"


def parse_importance(value: Any) -> int:
    if isinstance(value, (int, float)):
        parsed = int(value)
    else:
        normalized = normalized_unique(str(value or ""))
        if normalized in {"core skill", "bat buoc", "bắt buộc", "rat quan trong", "rất quan trọng"}:
            parsed = 3
        elif normalized in {"important", "quan trong", "quan trọng"}:
            parsed = 2
        elif normalized in {"nice to have", "nen co", "nên có"}:
            parsed = 1
        else:
            parsed = 0
    if parsed < 0 or parsed > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_IMPORTANCE_INVALID", "message": "Mức độ quan trọng không hợp lệ."},
        )
    return parsed


def parse_positive_number(value: Any, *, field: str, max_value: float = 100.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_SCORE_INVALID", "message": "Điểm số phải là số dương hợp lệ.", "field": field},
        ) from exc
    if parsed < 0 or parsed > max_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_SCORE_INVALID", "message": "Điểm số phải là số dương hợp lệ.", "field": field},
        )
    return round(parsed, 2)


async def ensure_admin_indexes(db: Any) -> None:
    try:
        await db["NGANHNGHIET"].create_index(
            [("TenNganhNormalized", ASCENDING)],
            unique=True,
            sparse=True,
            name="uq_nganh_ten_normalized",
        )
        await db["KYNANG"].create_index(
            [("TenKyNangNormalized", ASCENDING)],
            unique=True,
            sparse=True,
            name="uq_kynang_ten_normalized",
        )
        await db["NGANHNGHE_KYNANG"].create_index(
            [("MaNganh", ASCENDING), ("MaKyNang", ASCENDING)],
            unique=True,
            name="uq_nganhnghe_kynang",
        )

        diem_indexes = await db["DIEMDANHGIA"].list_indexes().to_list(length=50)
        if any(index.get("name") == "uq_diemdanhgia_makynang" for index in diem_indexes):
            await db["DIEMDANHGIA"].drop_index("uq_diemdanhgia_makynang")
        await db["DIEMDANHGIA"].create_index(
            [("MaNganh", ASCENDING), ("MaKyNang", ASCENDING)],
            unique=True,
            sparse=True,
            name="uq_diemdanhgia_manganh_makynang",
        )
        await db["SCORING_CONFIG_VERSIONS"].create_index(
            [("MaNganh", ASCENDING), ("CreatedAt", ASCENDING)],
            name="idx_scoring_config_role_time",
        )
    except OperationFailure:
        return


def database_unavailable(message: str, exc: Exception) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={"code": "DATABASE_UNAVAILABLE", "message": message},
    )


async def write_admin_log(
    db: Any,
    actor: dict[str, Any],
    *,
    action: str,
    target_type: str,
    target_id: str,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
) -> None:
    await db["LOG_ADMIN"].insert_one(
        {
            "_id": f"LOG_ADM_{uuid4().hex[:12].upper()}",
            "HanhDong": action,
            "DuLieuTruoc": before,
            "DuLieuSau": after,
            "KetQua": "Thanh cong",
            "ThoiDiemThucHien": utc_now(),
            "MaADM": actor.get("user_id") or actor.get("MaADM"),
            "DoiTuong": target_type,
            "MaDoiTuong": target_id,
        }
    )


def default_role_by_id(role_id: str) -> dict[str, Any] | None:
    for role in DEFAULT_ROLES:
        if role["role_id"] == role_id:
            return role
    return None


def public_role(document: dict[str, Any], *, skill_count: int = 0, analysis_count: int = 0) -> dict[str, Any]:
    role_id = document.get("_id") or document.get("role_id")
    return {
        "role_id": role_id,
        "name": document.get("TenNganh") or document.get("name") or "",
        "description": document.get("MoTa") or document.get("description") or "",
        "status": public_role_status(document.get("TrangThai", document.get("status", "active"))),
        "created_at": as_iso(document.get("NgayTao") or document.get("created_at")),
        "updated_at": as_iso(document.get("NgayCapNhat") or document.get("updated_at")),
        "skill_count": skill_count,
        "analysis_count": analysis_count,
        "scoring_config_version": document.get("ScoringConfigVersion"),
        "icon_label": ROLE_ICON_LABELS.get(str(role_id), "IT"),
    }


async def count_role_usage(db: Any, role_id: str) -> int:
    cv_count = await db["CV"].count_documents({"MaNganh": role_id})
    result_count = await db["KETQUA_PTCV"].count_documents({"MaNganh": role_id})
    return cv_count + result_count


async def count_role_skills(db: Any, role_id: str) -> int:
    return await db["NGANHNGHE_KYNANG"].count_documents({"MaNganh": role_id, "TrangThai": {"$ne": "inactive"}})


async def materialize_default_role(db: Any, role_id: str) -> dict[str, Any]:
    existing = await db["NGANHNGHIET"].find_one({"_id": role_id})
    if existing:
        return existing

    role = default_role_by_id(role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ADMIN_ROLE_NOT_FOUND", "message": "Không tìm thấy vị trí IT."},
        )

    now = utc_now()
    document = {
        "_id": role_id,
        "TenNganh": role["name"],
        "TenNganhNormalized": normalized_unique(role["name"]),
        "MoTa": role["description"],
        "NgayTao": now,
        "NgayCapNhat": None,
        "TrangThai": db_role_status(role["status"]),
    }
    await db["NGANHNGHIET"].insert_one(document)
    return document


async def role_name_exists(db: Any, name: str, *, exclude_role_id: str | None = None) -> bool:
    normalized = normalized_unique(name)
    query: dict[str, Any] = {
        "$or": [
            {"TenNganhNormalized": normalized},
            {"TenNganh": {"$regex": f"^{re.escape(name)}$", "$options": "i"}},
        ]
    }
    if exclude_role_id:
        query["_id"] = {"$ne": exclude_role_id}
    existing = await db["NGANHNGHIET"].find_one(query)
    if existing:
        return True

    return any(
        normalized_unique(role["name"]) == normalized and role["role_id"] != exclude_role_id
        for role in DEFAULT_ROLES
    )


async def list_admin_roles(db: Any, *, search: str = "", status_filter: str = "all") -> dict[str, Any]:
    try:
        await ensure_admin_indexes(db)
        documents = await db["NGANHNGHIET"].find({}).sort("TenNganh", 1).to_list(length=200)
        by_id: dict[str, dict[str, Any]] = {
            role["role_id"]: {
                "_id": role["role_id"],
                "TenNganh": role["name"],
                "MoTa": role["description"],
                "TrangThai": role["status"],
                "NgayTao": None,
                "NgayCapNhat": None,
            }
            for role in DEFAULT_ROLES
        }
        for document in documents:
            by_id[document["_id"]] = document

        normalized_search = normalized_unique(search)
        roles: list[dict[str, Any]] = []
        for document in by_id.values():
            role_status = public_role_status(document.get("TrangThai"))
            text = normalized_unique(f"{document.get('TenNganh', '')} {document.get('MoTa', '')}")
            if normalized_search and normalized_search not in text:
                continue
            if status_filter in {"active", "inactive"} and role_status != status_filter:
                continue
            role_id = document["_id"]
            roles.append(
                public_role(
                    document,
                    skill_count=await count_role_skills(db, role_id),
                    analysis_count=await count_role_usage(db, role_id),
                )
            )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa tải được danh sách vị trí IT vì MongoDB chưa sẵn sàng.", exc) from exc

    return {"items": sorted(roles, key=lambda item: item["name"]), "count": len(roles)}


async def create_admin_role(
    db: Any,
    actor: dict[str, Any],
    *,
    name: str,
    description: str,
    role_status: str,
) -> dict[str, Any]:
    clean_name = clean_text(name, max_length=120, field_name="Tên vị trí")
    clean_description = clean_text(description, max_length=1000, field_name="Mô tả tổng quan")
    public_status = "inactive" if role_status == "inactive" else "active"

    try:
        await ensure_admin_indexes(db)
        if await role_name_exists(db, clean_name):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "ADMIN_ROLE_DUPLICATED", "message": "Tên vị trí này đã tồn tại trong hệ thống."},
            )

        role_id = f"NG_{slug_fragment(clean_name)}"
        if await db["NGANHNGHIET"].find_one({"_id": role_id}):
            role_id = f"NG_{uuid4().hex[:10].upper()}"
        now = utc_now()
        document = {
            "_id": role_id,
            "TenNganh": clean_name,
            "TenNganhNormalized": normalized_unique(clean_name),
            "MoTa": clean_description,
            "TrangThai": db_role_status(public_status),
            "NgayTao": now,
            "NgayCapNhat": now,
            "MaADM": actor["user_id"],
        }
        await db["NGANHNGHIET"].insert_one(document)
        await write_admin_log(
            db,
            actor,
            action="Thêm vị trí IT",
            target_type="NGANHNGHIET",
            target_id=role_id,
            before=None,
            after=public_role(document),
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa tạo được vị trí IT vì MongoDB chưa sẵn sàng.", exc) from exc

    return public_role(document)


async def update_admin_role(
    db: Any,
    actor: dict[str, Any],
    role_id: str,
    *,
    name: str | None = None,
    description: str | None = None,
    role_status: str | None = None,
) -> dict[str, Any]:
    try:
        await ensure_admin_indexes(db)
        current = await materialize_default_role(db, role_id)
        before = public_role(current)
        updates: dict[str, Any] = {"NgayCapNhat": utc_now(), "MaADM": actor["user_id"]}

        if name is not None:
            clean_name = clean_text(name, max_length=120, field_name="Tên vị trí")
            if await role_name_exists(db, clean_name, exclude_role_id=role_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={"code": "ADMIN_ROLE_DUPLICATED", "message": "Tên vị trí này đã tồn tại trong hệ thống."},
                )
            updates["TenNganh"] = clean_name
            updates["TenNganhNormalized"] = normalized_unique(clean_name)
        if description is not None:
            updates["MoTa"] = clean_text(description, max_length=1000, field_name="Mô tả tổng quan")
        if role_status in {"active", "inactive"}:
            updates["TrangThai"] = db_role_status(role_status)

        await db["NGANHNGHIET"].update_one({"_id": role_id}, {"$set": updates})
        updated = await db["NGANHNGHIET"].find_one({"_id": role_id}) or {**current, **updates}
        await write_admin_log(
            db,
            actor,
            action="Cập nhật vị trí IT",
            target_type="NGANHNGHIET",
            target_id=role_id,
            before=before,
            after=public_role(updated),
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa cập nhật được vị trí IT vì MongoDB chưa sẵn sàng.", exc) from exc

    return public_role(updated)


async def update_admin_role_status(
    db: Any,
    actor: dict[str, Any],
    role_id: str,
    *,
    role_status: str,
) -> dict[str, Any]:
    if role_status not in {"active", "inactive"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_ROLE_STATUS_INVALID", "message": "Trạng thái vị trí IT không hợp lệ."},
        )
    return await update_admin_role(db, actor, role_id, role_status=role_status)


def default_required_score(importance: int) -> float:
    if importance >= 3:
        return 85.0
    if importance == 2:
        return 70.0
    if importance == 1:
        return 60.0
    return 0.0


async def find_skill_by_name(db: Any, skill_name: str) -> dict[str, Any] | None:
    normalized = normalized_unique(skill_name)
    return await db["KYNANG"].find_one(
        {
            "$or": [
                {"TenKyNangNormalized": normalized},
                {"TenKyNang": {"$regex": f"^{re.escape(skill_name)}$", "$options": "i"}},
            ]
        }
    )


async def ensure_skill_document(db: Any, *, skill_name: str, group: str, actor_id: str | None = None) -> dict[str, Any]:
    existing = await find_skill_by_name(db, skill_name)
    if existing:
        updates: dict[str, Any] = {}
        if group and existing.get("NhomKyNang") != group:
            updates["NhomKyNang"] = group
            updates["NgayCapNhat"] = utc_now()
        if updates:
            await db["KYNANG"].update_one({"_id": existing["_id"]}, {"$set": updates})
            existing.update(updates)
        return existing

    skill_id = f"KN_{slug_fragment(skill_name)}"
    if await db["KYNANG"].find_one({"_id": skill_id}):
        skill_id = f"KN_{uuid4().hex[:10].upper()}"
    now = utc_now()
    document = {
        "_id": skill_id,
        "TenKyNang": skill_name,
        "TenKyNangNormalized": normalized_unique(skill_name),
        "NhomKyNang": group,
        "MoTa": "",
        "TrangThai": "hoat dong",
        "NgayTao": now,
        "NgayCapNhat": now,
        "MaADM": actor_id,
    }
    await db["KYNANG"].insert_one(document)
    return document


async def ensure_default_skill_configs(db: Any, role_id: str) -> None:
    role = default_role_by_id(role_id)
    if not role:
        return
    await materialize_default_role(db, role_id)
    total_importance = sum(max(1, int(item.get("importance", 0))) for item in role["skills"]) or 1
    default_weights: list[float] = []
    running_weight = 0.0
    for index, item in enumerate(role["skills"]):
        importance_weight = max(1, int(item.get("importance", 0)))
        if index == len(role["skills"]) - 1:
            weight = round(max(0.0, 100.0 - running_weight), 2)
        else:
            weight = round(100 * importance_weight / total_importance, 2)
            running_weight += weight
        default_weights.append(weight)

    for index, item in enumerate(role["skills"]):
        skill = await ensure_skill_document(
            db,
            skill_name=item["skill"],
            group=item.get("group", ""),
        )
        relation_id = f"NNKN_{role_id}_{skill['_id']}"
        await db["NGANHNGHE_KYNANG"].update_one(
            {"MaNganh": role_id, "MaKyNang": skill["_id"]},
            {
                "$setOnInsert": {
                    "_id": relation_id[:96],
                    "MaNganh": role_id,
                    "MaKyNang": skill["_id"],
                    "TrangThai": "active",
                    "NgayTao": utc_now(),
                    "NgayCapNhat": utc_now(),
                }
            },
            upsert=True,
        )
        existing_score = await db["DIEMDANHGIA"].find_one({"MaNganh": role_id, "MaKyNang": skill["_id"]})
        if not existing_score:
            legacy_score = await db["DIEMDANHGIA"].find_one({"MaKyNang": skill["_id"], "MaNganh": {"$exists": False}})
            importance = parse_importance(item.get("importance", 0))
            weight = default_weights[index]
            payload = {
                "MaNganh": role_id,
                "MaKyNang": skill["_id"],
                "Diem": legacy_score.get("Diem", default_required_score(importance)) if legacy_score else default_required_score(importance),
                "TrongSo": legacy_score.get("TrongSo", weight) if legacy_score else weight,
                "MucDo": legacy_score.get("MucDo", importance_to_label(importance)) if legacy_score else importance_to_label(importance),
                "MucDoQuanTrong": importance,
                "MoTaTieuChi": legacy_score.get("MoTaTieuChi", "") if legacy_score else "",
                "TrangThai": "active",
                "NgayCapNhat": utc_now(),
            }
            if legacy_score:
                await db["DIEMDANHGIA"].update_one({"_id": legacy_score["_id"]}, {"$set": payload})
            else:
                await db["DIEMDANHGIA"].insert_one({"_id": f"DDG_{uuid4().hex[:12].upper()}", **payload})


def public_skill_config(relation: dict[str, Any], skill: dict[str, Any], score: dict[str, Any]) -> dict[str, Any]:
    importance = score.get("MucDoQuanTrong")
    if importance is None:
        importance = parse_importance(score.get("MucDo"))
    config_status = "active" if public_role_status(score.get("TrangThai", relation.get("TrangThai", "active"))) == "active" else "inactive"
    return {
        "config_id": score["_id"],
        "role_id": relation["MaNganh"],
        "skill_id": skill["_id"],
        "skill_name": skill.get("TenKyNang", ""),
        "skill_group": skill.get("NhomKyNang") or skill.get("Nhom") or "",
        "required_score": float(score.get("Diem", 0) or 0),
        "weight": float(score.get("TrongSo", 0) or 0),
        "importance": int(importance),
        "importance_label": importance_to_label(int(importance)),
        "criteria_description": score.get("MoTaTieuChi", ""),
        "status": config_status,
        "updated_at": as_iso(score.get("NgayCapNhat")),
    }


async def list_role_skill_configs(db: Any, role_id: str) -> dict[str, Any]:
    try:
        await ensure_admin_indexes(db)
        await ensure_default_skill_configs(db, role_id)
        role = await materialize_default_role(db, role_id)
        relations = await db["NGANHNGHE_KYNANG"].find({"MaNganh": role_id}).to_list(length=300)
        items: list[dict[str, Any]] = []
        for relation in relations:
            skill = await db["KYNANG"].find_one({"_id": relation["MaKyNang"]})
            if not skill:
                continue
            score = await db["DIEMDANHGIA"].find_one({"MaNganh": role_id, "MaKyNang": skill["_id"]})
            if not score:
                score = await db["DIEMDANHGIA"].find_one({"MaKyNang": skill["_id"], "MaNganh": {"$exists": False}})
            if not score:
                continue
            items.append(public_skill_config(relation, skill, score))
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa tải được cấu hình kỹ năng vì MongoDB chưa sẵn sàng.", exc) from exc

    active_weight = round(sum(item["weight"] for item in items if item["status"] == "active"), 2)
    return {
        "role": public_role(role, skill_count=len(items), analysis_count=await count_role_usage(db, role_id)),
        "items": sorted(items, key=lambda item: (item["status"] != "active", item["skill_name"])),
        "total_weight": active_weight,
        "count": len(items),
    }


async def validate_role_total_weight(
    db: Any,
    role_id: str,
    *,
    replacements: dict[str, tuple[float, str]],
) -> None:
    configs = (await list_role_skill_configs(db, role_id))["items"]
    total = 0.0
    seen_config_ids: set[str] = set()
    for item in configs:
        weight = item["weight"]
        item_status = item["status"]
        if item["config_id"] in replacements:
            weight, item_status = replacements[item["config_id"]]
            seen_config_ids.add(item["config_id"])
        if item_status == "active":
            total += weight
    for config_id, (weight, item_status) in replacements.items():
        if config_id not in seen_config_ids and item_status == "active":
            total += weight
    if total > 100.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_TOTAL_WEIGHT_INVALID", "message": "Tổng trọng số các kỹ năng không được vượt quá 100%."},
        )


async def create_scoring_snapshot(db: Any, actor: dict[str, Any], role_id: str) -> str:
    configs = (await list_role_skill_configs(db, role_id))["items"]
    active_configs = [item for item in configs if item["status"] == "active"]
    version = f"SCV_{role_id}_{utc_now().strftime('%Y%m%d%H%M%S')}_{uuid4().hex[:6].upper()}"
    await db["SCORING_CONFIG_VERSIONS"].insert_one(
        {
            "_id": version,
            "MaNganh": role_id,
            "Version": version,
            "CreatedAt": utc_now(),
            "MaADM": actor["user_id"],
            "TotalWeight": round(sum(item["weight"] for item in active_configs), 2),
            "SkillCount": len(active_configs),
            "ConfigSnapshot": active_configs,
        }
    )
    await db["NGANHNGHIET"].update_one(
        {"_id": role_id},
        {"$set": {"ScoringConfigVersion": version, "NgayCapNhat": utc_now()}},
    )
    return version


async def add_role_skill_config(
    db: Any,
    actor: dict[str, Any],
    role_id: str,
    *,
    skill_name: str,
    skill_group: str,
    required_score: float,
    weight: float,
    importance: int,
    criteria_description: str,
) -> dict[str, Any]:
    clean_skill_name = clean_text(skill_name, max_length=120, field_name="Tên kỹ năng")
    clean_group = clean_text(skill_group, max_length=80, field_name="Nhóm kỹ năng")
    parsed_score = parse_positive_number(required_score, field="required_score")
    parsed_weight = parse_positive_number(weight, field="weight")
    parsed_importance = parse_importance(importance)
    if parsed_importance >= 3 and parsed_score <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_CORE_THRESHOLD_INVALID", "message": "Kỹ năng bắt buộc phải có mức điểm sàn lớn hơn 0."},
        )

    try:
        await ensure_admin_indexes(db)
        await materialize_default_role(db, role_id)
        skill = await ensure_skill_document(db, skill_name=clean_skill_name, group=clean_group, actor_id=actor["user_id"])
        relation = await db["NGANHNGHE_KYNANG"].find_one({"MaNganh": role_id, "MaKyNang": skill["_id"]})
        existing_score = await db["DIEMDANHGIA"].find_one({"MaNganh": role_id, "MaKyNang": skill["_id"]})
        if relation and existing_score and public_role_status(relation.get("TrangThai", "active")) == "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "ADMIN_SKILL_DUPLICATED", "message": "Kỹ năng này đã tồn tại trong Role IT đã chọn."},
            )

        config_id = existing_score["_id"] if existing_score else f"DDG_{uuid4().hex[:12].upper()}"
        await validate_role_total_weight(db, role_id, replacements={config_id: (parsed_weight, "active")})
        now = utc_now()
        relation_id = relation["_id"] if relation else f"NNKN_{uuid4().hex[:12].upper()}"
        await db["NGANHNGHE_KYNANG"].update_one(
            {"_id": relation_id},
            {
                "$set": {
                    "MaNganh": role_id,
                    "MaKyNang": skill["_id"],
                    "TrangThai": "active",
                    "NgayCapNhat": now,
                },
                "$setOnInsert": {"NgayTao": now},
            },
            upsert=True,
        )
        score_payload = {
            "MaNganh": role_id,
            "MaKyNang": skill["_id"],
            "Diem": parsed_score,
            "TrongSo": parsed_weight,
            "MucDo": importance_to_label(parsed_importance),
            "MucDoQuanTrong": parsed_importance,
            "MoTaTieuChi": optional_clean_text(criteria_description, max_length=1000),
            "TrangThai": "active",
            "NgayCapNhat": now,
            "MaADM": actor["user_id"],
        }
        await db["DIEMDANHGIA"].update_one({"_id": config_id}, {"$set": score_payload}, upsert=True)
        relation = await db["NGANHNGHE_KYNANG"].find_one({"_id": relation_id}) or {"MaNganh": role_id, "MaKyNang": skill["_id"]}
        score = await db["DIEMDANHGIA"].find_one({"_id": config_id}) or {"_id": config_id, **score_payload}
        version = await create_scoring_snapshot(db, actor, role_id)
        await write_admin_log(
            db,
            actor,
            action="Thêm kỹ năng vào Role IT",
            target_type="DIEMDANHGIA",
            target_id=config_id,
            before=None,
            after={**public_skill_config(relation, skill, score), "scoring_config_version": version},
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa thêm được kỹ năng vì MongoDB chưa sẵn sàng.", exc) from exc

    return public_skill_config(relation, skill, score)


async def get_skill_config_document(db: Any, role_id: str, config_id: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    score = await db["DIEMDANHGIA"].find_one({"_id": config_id})
    if not score or score.get("MaNganh") != role_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ADMIN_SKILL_CONFIG_NOT_FOUND", "message": "Không tìm thấy cấu hình kỹ năng."},
        )
    skill = await db["KYNANG"].find_one({"_id": score["MaKyNang"]})
    relation = await db["NGANHNGHE_KYNANG"].find_one({"MaNganh": role_id, "MaKyNang": score["MaKyNang"]})
    if not skill or not relation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ADMIN_SKILL_CONFIG_NOT_FOUND", "message": "Không tìm thấy cấu hình kỹ năng."},
        )
    return relation, skill, score


async def update_role_skill_config(
    db: Any,
    actor: dict[str, Any],
    role_id: str,
    config_id: str,
    *,
    required_score: float | None = None,
    weight: float | None = None,
    importance: int | None = None,
    criteria_description: str | None = None,
    status_value: str | None = None,
    skill_group: str | None = None,
) -> dict[str, Any]:
    try:
        await ensure_admin_indexes(db)
        await ensure_default_skill_configs(db, role_id)
        relation, skill, score = await get_skill_config_document(db, role_id, config_id)
        before = public_skill_config(relation, skill, score)
        next_score = before["required_score"] if required_score is None else parse_positive_number(required_score, field="required_score")
        next_weight = before["weight"] if weight is None else parse_positive_number(weight, field="weight")
        next_importance = before["importance"] if importance is None else parse_importance(importance)
        next_status = before["status"] if status_value not in {"active", "inactive"} else status_value
        if next_importance >= 3 and next_score <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "ADMIN_CORE_THRESHOLD_INVALID", "message": "Kỹ năng bắt buộc phải có mức điểm sàn lớn hơn 0."},
            )
        await validate_role_total_weight(db, role_id, replacements={config_id: (next_weight, next_status)})

        now = utc_now()
        score_updates = {
            "Diem": next_score,
            "TrongSo": next_weight,
            "MucDo": importance_to_label(next_importance),
            "MucDoQuanTrong": next_importance,
            "TrangThai": next_status,
            "NgayCapNhat": now,
            "MaADM": actor["user_id"],
        }
        if criteria_description is not None:
            score_updates["MoTaTieuChi"] = optional_clean_text(criteria_description, max_length=1000)
        await db["DIEMDANHGIA"].update_one({"_id": config_id}, {"$set": score_updates})
        await db["NGANHNGHE_KYNANG"].update_one({"_id": relation["_id"]}, {"$set": {"TrangThai": next_status, "NgayCapNhat": now}})
        if skill_group is not None:
            await db["KYNANG"].update_one(
                {"_id": skill["_id"]},
                {"$set": {"NhomKyNang": optional_clean_text(skill_group, max_length=80), "NgayCapNhat": now}},
            )
        updated_relation, updated_skill, updated_score = await get_skill_config_document(db, role_id, config_id)
        version = await create_scoring_snapshot(db, actor, role_id)
        after = {**public_skill_config(updated_relation, updated_skill, updated_score), "scoring_config_version": version}
        await write_admin_log(
            db,
            actor,
            action="Cập nhật điểm số kỹ năng",
            target_type="DIEMDANHGIA",
            target_id=config_id,
            before=before,
            after=after,
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa cập nhật được điểm số kỹ năng vì MongoDB chưa sẵn sàng.", exc) from exc

    return after


async def bulk_update_role_skill_configs(
    db: Any,
    actor: dict[str, Any],
    role_id: str,
    *,
    config_ids: list[str],
    required_score: float | None = None,
    weight: float | None = None,
    importance: int | None = None,
    status_value: str | None = None,
) -> dict[str, Any]:
    unique_ids = list(dict.fromkeys(config_ids))
    if not unique_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_BULK_EMPTY", "message": "Vui lòng chọn ít nhất một kỹ năng để cập nhật."},
        )
    if required_score is None and weight is None and importance is None and status_value is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "ADMIN_BULK_NO_CHANGES", "message": "Chưa có trường nào được thay đổi."},
        )

    try:
        await ensure_admin_indexes(db)
        await ensure_default_skill_configs(db, role_id)
        current_items = (await list_role_skill_configs(db, role_id))["items"]
        by_id = {item["config_id"]: item for item in current_items}
        missing = [config_id for config_id in unique_ids if config_id not in by_id]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "ADMIN_SKILL_CONFIG_NOT_FOUND", "message": "Không tìm thấy cấu hình kỹ năng."},
            )

        replacements: dict[str, tuple[float, str]] = {}
        for config_id in unique_ids:
            item = by_id[config_id]
            next_weight = item["weight"] if weight is None else parse_positive_number(weight, field="weight")
            next_status = item["status"] if status_value not in {"active", "inactive"} else status_value
            replacements[config_id] = (next_weight, next_status)
        await validate_role_total_weight(db, role_id, replacements=replacements)

        now = utc_now()
        updated_items: list[dict[str, Any]] = []
        for config_id in unique_ids:
            item = by_id[config_id]
            next_score = item["required_score"] if required_score is None else parse_positive_number(required_score, field="required_score")
            next_weight = item["weight"] if weight is None else parse_positive_number(weight, field="weight")
            next_importance = item["importance"] if importance is None else parse_importance(importance)
            next_status = item["status"] if status_value not in {"active", "inactive"} else status_value
            if next_importance >= 3 and next_score <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "ADMIN_CORE_THRESHOLD_INVALID", "message": "Kỹ năng bắt buộc phải có mức điểm sàn lớn hơn 0."},
                )
            await db["DIEMDANHGIA"].update_one(
                {"_id": config_id},
                {
                    "$set": {
                        "Diem": next_score,
                        "TrongSo": next_weight,
                        "MucDo": importance_to_label(next_importance),
                        "MucDoQuanTrong": next_importance,
                        "TrangThai": next_status,
                        "NgayCapNhat": now,
                        "MaADM": actor["user_id"],
                    }
                },
            )
            await db["NGANHNGHE_KYNANG"].update_one(
                {"MaNganh": role_id, "MaKyNang": item["skill_id"]},
                {"$set": {"TrangThai": next_status, "NgayCapNhat": now}},
            )
            relation, skill, score = await get_skill_config_document(db, role_id, config_id)
            updated_items.append(public_skill_config(relation, skill, score))

        version = await create_scoring_snapshot(db, actor, role_id)
        await write_admin_log(
            db,
            actor,
            action="Chỉnh sửa hàng loạt điểm số kỹ năng",
            target_type="DIEMDANHGIA",
            target_id=role_id,
            before={"config_ids": unique_ids},
            after={"config_ids": unique_ids, "scoring_config_version": version},
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa cập nhật hàng loạt kỹ năng vì MongoDB chưa sẵn sàng.", exc) from exc

    return {"items": updated_items, "scoring_config_version": version}


async def public_admin_user(db: Any, account: dict[str, Any]) -> dict[str, Any]:
    role = account.get("Role") or ("admin" if account.get("MaADM") else "registered")
    profile = None
    if account.get("MaKH"):
        profile = await db["KHACHHANG"].find_one({"_id": account["MaKH"]})
    elif account.get("MaADM"):
        profile = await db["ADMIN"].find_one({"_id": account["MaADM"]})
    profile = profile or {}
    user_id = account.get("MaKH") or account.get("MaADM")
    account_type = "admin" if role == "admin" else str(profile.get("LoaiKH", role)).lower()
    return {
        "user_id": user_id,
        "account_id": account["_id"],
        "full_name": profile.get("HoTen") or account.get("HoTen") or account.get("Email"),
        "email": account.get("Email") or profile.get("Email"),
        "phone": profile.get("SoDienThoai", ""),
        "address": profile.get("DiaChi", ""),
        "account_type": account_type,
        "role": role,
        "status": public_account_status(account.get("TrangThai", profile.get("TrangThai"))),
        "registered_at": as_iso(profile.get("NgayDangKy") or account.get("CreatedAt")),
        "last_login_at": as_iso(account.get("LastLoginAt") or profile.get("LanDangNhapCuoi")),
        "industry_interest": profile.get("NNQuanTam", ""),
        "target_role": profile.get("ViTriNN", ""),
        "current_level": profile.get("TrinhDoHV", ""),
        "analysis_count": await db["LICHSUPTCV"].count_documents({"MaKH": user_id}) if account.get("MaKH") else 0,
        "lock_reason": account.get("LockReason"),
        "locked_at": as_iso(account.get("LockedAt")),
    }


async def list_admin_users(
    db: Any,
    *,
    search: str = "",
    account_type: str = "all",
    status_filter: str = "all",
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict[str, Any]:
    page = max(1, page)
    limit = min(MAX_PAGE_SIZE, max(1, limit))
    normalized_date_from = as_utc_datetime(date_from)
    normalized_date_to = as_utc_datetime(date_to)
    try:
        accounts = await db["TAIKHOAN"].find({}).sort("CreatedAt", -1).to_list(length=1000)
        normalized_search = normalized_unique(search)
        items: list[dict[str, Any]] = []
        for account in accounts:
            item = await public_admin_user(db, account)
            searchable = normalized_unique(f"{item['full_name']} {item['email']}")
            if normalized_search and normalized_search not in searchable:
                continue
            if account_type != "all" and item["account_type"] != account_type:
                continue
            if status_filter in {"active", "locked"} and item["status"] != status_filter:
                continue
            registered_at = as_utc_datetime(item.get("registered_at"))
            if normalized_date_from or normalized_date_to:
                if not registered_at:
                    continue
                if normalized_date_from and registered_at < normalized_date_from:
                    continue
                if normalized_date_to and registered_at > normalized_date_to:
                    continue
            items.append(item)
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa tải được danh sách người dùng vì MongoDB chưa sẵn sàng.", exc) from exc

    total = len(items)
    start = (page - 1) * limit
    return {
        "items": items[start : start + limit],
        "total": total,
        "page": page,
        "limit": limit,
        "has_next": start + limit < total,
    }


async def get_account_by_user_id(db: Any, user_id: str) -> dict[str, Any]:
    account = await db["TAIKHOAN"].find_one({"$or": [{"MaKH": user_id}, {"MaADM": user_id}]})
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ADMIN_USER_NOT_FOUND", "message": "Không tìm thấy tài khoản người dùng."},
        )
    return account


async def get_admin_user_detail(db: Any, user_id: str) -> dict[str, Any]:
    try:
        account = await get_account_by_user_id(db, user_id)
        detail = await public_admin_user(db, account)
        if account.get("MaKH"):
            recent_cvs = await db["CV"].find({"MaKH": user_id}).sort("NgayTaiLen", -1).limit(5).to_list(length=5)
            detail["recent_cvs"] = [
                {
                    "cv_id": cv["_id"],
                    "filename": cv.get("TenFileGoc"),
                    "status": cv.get("TrangThai"),
                    "uploaded_at": as_iso(cv.get("NgayTaiLen")),
                }
                for cv in recent_cvs
            ]
        else:
            detail["recent_cvs"] = []
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa tải được chi tiết người dùng vì MongoDB chưa sẵn sàng.", exc) from exc
    return detail


async def lock_admin_user(db: Any, actor: dict[str, Any], user_id: str, *, reason: str) -> dict[str, Any]:
    clean_reason = clean_text(reason, max_length=500, field_name="Lý do khóa")
    try:
        account = await get_account_by_user_id(db, user_id)
        if account.get("Role") == "admin" or account.get("MaADM"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "ADMIN_LOCK_ADMIN_FORBIDDEN", "message": "Bạn không có quyền khóa tài khoản Quản trị viên."},
            )
        before = await public_admin_user(db, account)
        now = utc_now()
        await db["TAIKHOAN"].update_one(
            {"_id": account["_id"]},
            {
                "$set": {
                    "TrangThai": db_account_status("locked"),
                    "LockReason": clean_reason,
                    "LockedAt": now,
                    "LockedBy": actor["user_id"],
                    "UpdatedAt": now,
                }
            },
        )
        if account.get("MaKH"):
            await db["KHACHHANG"].update_one({"_id": account["MaKH"]}, {"$set": {"TrangThai": "Đã khóa", "NgayCapNhat": now}})
        await db["REFRESH_TOKENS"].update_many(
            {"MaTK": account["_id"], "RevokedAt": None},
            {"$set": {"RevokedAt": now, "RevokedReason": "admin_lock"}},
        )
        updated_account = await db["TAIKHOAN"].find_one({"_id": account["_id"]}) or account
        after = await public_admin_user(db, updated_account)
        await write_admin_log(
            db,
            actor,
            action="Khóa tài khoản người dùng",
            target_type="TAIKHOAN",
            target_id=account["_id"],
            before=before,
            after=after,
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa khóa được tài khoản vì MongoDB chưa sẵn sàng.", exc) from exc

    return after


async def unlock_admin_user(db: Any, actor: dict[str, Any], user_id: str) -> dict[str, Any]:
    try:
        account = await get_account_by_user_id(db, user_id)
        before = await public_admin_user(db, account)
        now = utc_now()
        await db["TAIKHOAN"].update_one(
            {"_id": account["_id"]},
            {
                "$set": {"TrangThai": db_account_status("active"), "UpdatedAt": now},
                "$unset": {"LockReason": "", "LockedAt": "", "LockedBy": ""},
            },
        )
        if account.get("MaKH"):
            await db["KHACHHANG"].update_one({"_id": account["MaKH"]}, {"$set": {"TrangThai": "Hoạt động", "NgayCapNhat": now}})
        updated_account = await db["TAIKHOAN"].find_one({"_id": account["_id"]}) or account
        after = await public_admin_user(db, updated_account)
        await write_admin_log(
            db,
            actor,
            action="Mở khóa tài khoản người dùng",
            target_type="TAIKHOAN",
            target_id=account["_id"],
            before=before,
            after=after,
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise database_unavailable("Chưa mở khóa được tài khoản vì MongoDB chưa sẵn sàng.", exc) from exc

    return after
