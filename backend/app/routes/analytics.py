"""NEWUC-03: product-event ingestion and admin funnel reporting."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError, PyMongoError

from app.db import db
from app.routes.admin import require_admin
from app.routes.dependencies import get_customer_user
from app.services.product_analytics_service import get_analytics_summary, record_product_event


router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics"])
admin_router = APIRouter(prefix="/api/v1/admin/analytics", tags=["Admin Analytics"])


class PublicEventRequest(BaseModel):
    event_name: Literal["landing_page_view", "cta_clicked"]
    session_id: str = Field(..., min_length=8, max_length=120)
    source: str | None = Field(default=None, max_length=120)
    campaign: str | None = Field(default=None, max_length=160)
    message_variant: str | None = Field(default=None, max_length=160)
    path: str | None = Field(default=None, max_length=500)
    referrer: str | None = Field(default=None, max_length=500)


class AuthenticatedEventRequest(BaseModel):
    event_name: Literal["cv_selected", "analysis_restarted"]
    session_id: str | None = Field(default=None, max_length=120)
    metadata: dict[str, str | int | float | bool | None] = Field(default_factory=dict)


async def _persist_event(**kwargs: Any) -> dict[str, Any]:
    try:
        document = await record_product_event(db, **kwargs)
    except DuplicateKeyError:
        return {"event_id": None, "recorded": False}
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Không thể ghi nhận sự kiện sử dụng."},
        ) from exc
    return {"event_id": document["_id"], "recorded": True}


@router.post("/events/public", status_code=status.HTTP_202_ACCEPTED, summary="Ghi nhận landing/CTA ẩn danh")
async def post_public_event(payload: PublicEventRequest) -> dict[str, Any]:
    result = await _persist_event(
        event_name=payload.event_name,
        session_id=payload.session_id,
        source=payload.source,
        campaign=payload.campaign,
        message_variant=payload.message_variant,
        path=payload.path,
        referrer=payload.referrer,
        dedupe_key=(
            f"{payload.event_name}:{payload.session_id}"
            if payload.event_name == "landing_page_view"
            else None
        ),
    )
    return {"data": result, "error": None}


@router.post("/events", status_code=status.HTTP_202_ACCEPTED, summary="Ghi nhận bước funnel đã xác thực")
async def post_authenticated_event(
    payload: AuthenticatedEventRequest,
    user: dict[str, str] = Depends(get_customer_user),
) -> dict[str, Any]:
    result = await _persist_event(
        event_name=payload.event_name,
        user_id=user["user_id"],
        session_id=payload.session_id,
        metadata=payload.metadata,
    )
    return {"data": result, "error": None}


@admin_router.get("", summary="NEWUC-03: Thống kê sử dụng, funnel và attribution")
async def get_admin_analytics(
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_DATE_RANGE", "message": "date_from phải trước date_to."},
        )
    try:
        result = await get_analytics_summary(db, date_from=date_from, date_to=date_to)
    except PyMongoError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Không thể tải thống kê."},
        ) from exc
    return {"data": result, "meta": {"actor": admin["user_id"]}, "error": None}
