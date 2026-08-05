"""Admin routes for UC-001, UC-002, and UC-004."""

from __future__ import annotations

from datetime import datetime
from typing import Any

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.db import db
from app.routes.dependencies import get_current_user
from app.services.admin_service import (
    add_role_skill_config,
    bulk_update_role_skill_configs,
    create_admin_role,
    get_admin_user_detail,
    list_admin_roles,
    list_admin_users,
    list_role_skill_configs,
    lock_admin_user,
    unlock_admin_user,
    update_admin_role,
    update_admin_role_status,
    update_role_skill_config,
)


router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


async def require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ADMIN_FORBIDDEN", "message": "Bạn không có quyền truy cập khu vực quản trị."},
        )
    return user


class CareerRoleCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = Field(..., min_length=1, max_length=1000)
    status: str = Field(default="active", pattern="^(active|inactive)$")


class CareerRoleUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=1000)
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


class CareerRoleStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(active|inactive)$")


class SkillConfigCreateRequest(BaseModel):
    skill_name: str = Field(..., min_length=1, max_length=120)
    skill_group: str = Field(..., min_length=1, max_length=80)
    required_score: float = Field(..., ge=0, le=100)
    weight: float = Field(..., ge=0, le=100)
    importance: int = Field(..., ge=0, le=3)
    criteria_description: str = Field(default="", max_length=1000)


class SkillConfigUpdateRequest(BaseModel):
    required_score: float | None = Field(default=None, ge=0, le=100)
    weight: float | None = Field(default=None, ge=0, le=100)
    importance: int | None = Field(default=None, ge=0, le=3)
    criteria_description: str | None = Field(default=None, max_length=1000)
    status: str | None = Field(default=None, pattern="^(active|inactive)$")
    skill_group: str | None = Field(default=None, max_length=80)


class SkillBulkUpdateRequest(BaseModel):
    config_ids: list[str] = Field(..., min_length=1)
    required_score: float | None = Field(default=None, ge=0, le=100)
    weight: float | None = Field(default=None, ge=0, le=100)
    importance: int | None = Field(default=None, ge=0, le=3)
    status: str | None = Field(default=None, pattern="^(active|inactive)$")


class LockUserRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)


@router.get("/career-roles", summary="UC-001: Admin xem, tìm kiếm và lọc Role IT")
async def get_admin_career_roles(
    search: str = Query(default="", max_length=120),
    status_filter: str = Query(default="all", alias="status", pattern="^(all|active|inactive)$"),
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    result = await list_admin_roles(db, search=search, status_filter=status_filter)
    return {"data": result["items"], "meta": {"count": result["count"], "actor": admin["user_id"]}, "error": None}


@router.post("/career-roles", status_code=status.HTTP_201_CREATED, summary="UC-001: Admin thêm Role IT")
async def post_admin_career_role(payload: CareerRoleCreateRequest, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    role = await create_admin_role(
        db,
        admin,
        name=payload.name,
        description=payload.description,
        role_status=payload.status,
    )
    return {"data": role, "meta": {"message": "Thêm vị trí IT thành công."}, "error": None}


@router.patch("/career-roles/{role_id}", summary="UC-001: Admin chỉnh sửa Role IT")
async def patch_admin_career_role(
    role_id: str,
    payload: CareerRoleUpdateRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    role = await update_admin_role(
        db,
        admin,
        role_id,
        name=payload.name,
        description=payload.description,
        role_status=payload.status,
    )
    return {"data": role, "meta": {"message": "Cập nhật vị trí IT thành công."}, "error": None}


@router.patch("/career-roles/{role_id}/status", summary="UC-001: Admin ngưng hoặc kích hoạt Role IT")
async def patch_admin_career_role_status(
    role_id: str,
    payload: CareerRoleStatusRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    role = await update_admin_role_status(db, admin, role_id, role_status=payload.status)
    return {"data": role, "meta": {"message": "Đã cập nhật trạng thái vị trí IT."}, "error": None}


@router.get("/career-roles/{role_id}/skills", summary="UC-002: Admin xem skill và điểm số theo Role IT")
async def get_admin_role_skills(role_id: str, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    result = await list_role_skill_configs(db, role_id)
    return {
        "data": result["items"],
        "meta": {
            "role": result["role"],
            "total_weight": result["total_weight"],
            "count": result["count"],
            "actor": admin["user_id"],
        },
        "error": None,
    }


@router.post("/career-roles/{role_id}/skills", status_code=status.HTTP_201_CREATED, summary="UC-002: Admin thêm kỹ năng cho Role IT")
async def post_admin_role_skill(
    role_id: str,
    payload: SkillConfigCreateRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    skill = await add_role_skill_config(
        db,
        admin,
        role_id,
        skill_name=payload.skill_name,
        skill_group=payload.skill_group,
        required_score=payload.required_score,
        weight=payload.weight,
        importance=payload.importance,
        criteria_description=payload.criteria_description,
    )
    return {"data": skill, "meta": {"message": "Thêm kỹ năng thành công."}, "error": None}


@router.patch("/career-roles/{role_id}/skills/bulk", summary="UC-002: Admin chỉnh sửa hàng loạt kỹ năng")
async def patch_admin_role_skills_bulk(
    role_id: str,
    payload: SkillBulkUpdateRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    result = await bulk_update_role_skill_configs(
        db,
        admin,
        role_id,
        config_ids=payload.config_ids,
        required_score=payload.required_score,
        weight=payload.weight,
        importance=payload.importance,
        status_value=payload.status,
    )
    return {"data": result["items"], "meta": {"message": "Cập nhật điểm số kỹ năng thành công."}, "error": None}


@router.patch("/career-roles/{role_id}/skills/{config_id}", summary="UC-002: Admin cập nhật điểm số kỹ năng")
async def patch_admin_role_skill(
    role_id: str,
    config_id: str,
    payload: SkillConfigUpdateRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    skill = await update_role_skill_config(
        db,
        admin,
        role_id,
        config_id,
        required_score=payload.required_score,
        weight=payload.weight,
        importance=payload.importance,
        criteria_description=payload.criteria_description,
        status_value=payload.status,
        skill_group=payload.skill_group,
    )
    return {"data": skill, "meta": {"message": "Cập nhật điểm số kỹ năng thành công."}, "error": None}


@router.get("/users", summary="UC-004: Admin xem, tìm kiếm, lọc và phân trang người dùng")
async def get_admin_users(
    search: str = Query(default="", max_length=120),
    account_type: str = Query(default="all", pattern="^(all|registered|premium|admin)$"),
    status_filter: str = Query(default="all", alias="status", pattern="^(all|active|locked)$"),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    result = await list_admin_users(
        db,
        search=search,
        account_type=account_type,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
    )
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


@router.get("/users/{user_id}", summary="UC-004: Admin xem chi tiết người dùng")
async def get_admin_user(user_id: str, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    detail = await get_admin_user_detail(db, user_id)
    return {"data": detail, "meta": {"actor": admin["user_id"]}, "error": None}


@router.post("/users/{user_id}/lock", summary="UC-004: Admin khóa tài khoản người dùng")
async def post_admin_user_lock(
    user_id: str,
    payload: LockUserRequest,
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    updated = await lock_admin_user(db, admin, user_id, reason=payload.reason)
    return {"data": updated, "meta": {"message": "Khóa tài khoản thành công."}, "error": None}


@router.post("/users/{user_id}/unlock", summary="UC-004: Admin mở khóa tài khoản người dùng")
async def post_admin_user_unlock(user_id: str, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    updated = await unlock_admin_user(db, admin, user_id)
    return {"data": updated, "meta": {"message": "Mở khóa tài khoản thành công."}, "error": None}
