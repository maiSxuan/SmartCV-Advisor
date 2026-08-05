"""Persistent product-event tracking and MVP funnel aggregation."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pymongo.errors import PyMongoError

from app.services.role_dataset import load_default_roles


EVENT_COLLECTION = "SUKIEN_SANPHAM"

PUBLIC_EVENT_NAMES = {"landing_page_view", "cta_clicked"}
AUTHENTICATED_EVENT_NAMES = {"cv_selected"}
SERVER_EVENT_NAMES = {
    "registration_completed",
    "upload_completed",
    "analysis_started",
    "analysis_completed",
    "suggestions_viewed",
    "analysis_restarted",
    "premium_converted",
}
ALL_EVENT_NAMES = PUBLIC_EVENT_NAMES | AUTHENTICATED_EVENT_NAMES | SERVER_EVENT_NAMES
DEFAULT_ROLE_NAMES = {role["role_id"]: role["name"] for role in load_default_roles()}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _clean_optional(value: Any, *, max_length: int = 240) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned[:max_length] if cleaned else None


def build_event_document(
    *,
    event_name: str,
    user_id: str | None = None,
    session_id: str | None = None,
    cv_id: str | None = None,
    analysis_id: str | None = None,
    role_id: str | None = None,
    source: str | None = None,
    campaign: str | None = None,
    message_variant: str | None = None,
    path: str | None = None,
    referrer: str | None = None,
    metadata: dict[str, Any] | None = None,
    dedupe_key: str | None = None,
    occurred_at: datetime | None = None,
) -> dict[str, Any]:
    """Build the canonical MongoDB document for a product event."""
    if event_name not in ALL_EVENT_NAMES:
        raise ValueError(f"Unsupported product event: {event_name}")

    normalized_session_id = _clean_optional(session_id, max_length=120)
    normalized_user_id = _clean_optional(user_id, max_length=120)
    actor_key = normalized_user_id or normalized_session_id
    safe_metadata: dict[str, Any] = {}
    for key, value in (metadata or {}).items():
        if len(safe_metadata) >= 20:
            break
        safe_key = _clean_optional(key, max_length=80)
        if not safe_key or safe_key.startswith("$") or "." in safe_key:
            continue
        if isinstance(value, (str, int, float, bool)) or value is None:
            safe_metadata[safe_key] = value[:500] if isinstance(value, str) else value

    document = {
        "_id": f"EVT_{uuid4().hex.upper()}",
        "LoaiSuKien": event_name,
        "ActorKey": actor_key,
        "MaKH": normalized_user_id,
        "SessionId": normalized_session_id,
        "MaCV": _clean_optional(cv_id, max_length=120),
        "MaKQ": _clean_optional(analysis_id, max_length=120),
        "MaNganh": _clean_optional(role_id, max_length=120),
        "NguonTruyCap": _clean_optional(source, max_length=120),
        "Campaign": _clean_optional(campaign, max_length=160),
        "MessageVariant": _clean_optional(message_variant, max_length=160),
        "Path": _clean_optional(path, max_length=500),
        "Referrer": _clean_optional(referrer, max_length=500),
        "Metadata": safe_metadata,
        "ThoiDiem": occurred_at or utc_now(),
    }
    normalized_dedupe_key = _clean_optional(dedupe_key, max_length=300)
    if normalized_dedupe_key:
        document["DedupeKey"] = normalized_dedupe_key
    return document


async def record_product_event(db: Any, **kwargs: Any) -> dict[str, Any]:
    """Persist an event. Callers decide whether analytics failure is fatal."""
    document = build_event_document(**kwargs)
    await db[EVENT_COLLECTION].insert_one(document)
    return document


async def record_product_event_safely(db: Any, **kwargs: Any) -> None:
    """Best-effort tracking that never breaks the main product operation."""
    try:
        await record_product_event(db, **kwargs)
    except (PyMongoError, ValueError, TypeError):
        return


def calculate_drop_off(funnel: dict[str, int]) -> list[dict[str, Any]]:
    """Calculate absolute and percentage loss between ordered funnel stages."""
    ordered_steps = [
        "landing_page_views",
        "registrations",
        "cv_selections",
        "uploads_completed",
        "analyses_started",
        "analyses_completed",
        "suggestions_viewed",
    ]
    result: list[dict[str, Any]] = []
    for previous, current in zip(ordered_steps, ordered_steps[1:]):
        previous_count = max(0, int(funnel.get(previous, 0)))
        current_count = max(0, int(funnel.get(current, 0)))
        lost = max(0, previous_count - current_count)
        rate = round((lost / previous_count) * 100, 1) if previous_count else 0.0
        result.append({"from": previous, "to": current, "count": lost, "rate": rate})
    return result


def calculate_conversion_rate(numerator: int, denominator: int) -> float:
    """Return a percentage constrained to the valid 0-100 range."""
    safe_numerator = max(0, int(numerator))
    safe_denominator = max(0, int(denominator))
    if safe_denominator == 0:
        return 0.0
    return round(min((safe_numerator / safe_denominator) * 100, 100.0), 1)


def apply_role_names(
    role_items: list[dict[str, Any]],
    role_names: dict[str, str],
) -> list[dict[str, Any]]:
    """Replace internal role identifiers with labels suitable for Admin UI."""
    result: list[dict[str, Any]] = []
    for item in role_items:
        role_id = str(item.get("name") or item.get("_id") or "").strip()
        result.append(
            {
                "_id": role_id,
                "name": role_names.get(role_id) or "Vai trò chưa xác định",
                "count": int(item.get("count", 0)),
            }
        )
    return result


async def _event_count(db: Any, event_name: str, date_filter: dict[str, Any]) -> int:
    query: dict[str, Any] = {"LoaiSuKien": event_name, **date_filter}
    return await db[EVENT_COLLECTION].count_documents(query)


async def _event_actor_count(db: Any, event_name: str, date_filter: dict[str, Any]) -> int:
    query: dict[str, Any] = {"LoaiSuKien": event_name, "ActorKey": {"$ne": None}, **date_filter}
    actors = await db[EVENT_COLLECTION].distinct("ActorKey", query)
    return len([actor for actor in actors if actor])


async def _breakdown(
    db: Any,
    field: str,
    date_filter: dict[str, Any],
    *,
    event_name: str,
) -> list[dict[str, Any]]:
    match: dict[str, Any] = {
        "LoaiSuKien": event_name,
        field: {"$nin": [None, ""]},
        **date_filter,
    }
    cursor = db[EVENT_COLLECTION].aggregate(
        [
            {"$match": match},
            {"$group": {"_id": f"${field}", "count": {"$sum": 1}}},
            {"$sort": {"count": -1, "_id": 1}},
            {"$limit": 20},
        ]
    )
    rows = await cursor.to_list(length=20)
    return [{"name": str(row.get("_id") or "Không rõ"), "count": int(row.get("count", 0))} for row in rows]


async def get_analytics_summary(
    db: Any,
    *,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
) -> dict[str, Any]:
    """Aggregate the complete MVP funnel and its requested dimensions."""
    time_query: dict[str, Any] = {}
    if date_from is not None:
        time_query["$gte"] = date_from
    if date_to is not None:
        time_query["$lte"] = date_to
    event_date_filter = {"ThoiDiem": time_query} if time_query else {}

    event_names = [
        "landing_page_view",
        "registration_completed",
        "cv_selected",
        "upload_completed",
        "analysis_started",
        "analysis_completed",
        "suggestions_viewed",
        "analysis_restarted",
        "premium_converted",
    ]
    event_counts = await asyncio.gather(
        *[_event_count(db, name, event_date_filter) for name in event_names]
    )
    counts = dict(zip(event_names, event_counts))

    # SUKIEN_SANPHAM is the source of truth for every funnel and conversion
    # metric. Mixing lifetime totals from operational collections made a
    # single tracked upload appear as dozens of funnel events.
    cv_selection_actors = await _event_actor_count(
        db,
        "cv_selected",
        event_date_filter,
    )

    registrations = int(counts["registration_completed"])
    uploads = int(counts["upload_completed"])
    completed = int(counts["analysis_completed"])
    analyses_started = int(counts["analysis_started"])
    premium_count = int(counts["premium_converted"])

    funnel = {
        "landing_page_views": int(counts["landing_page_view"]),
        "registrations": registrations,
        "cv_selections": int(cv_selection_actors),
        "uploads_completed": uploads,
        "analyses_started": analyses_started,
        "analyses_completed": completed,
        "suggestions_viewed": int(counts["suggestions_viewed"]),
        "reanalyses": int(counts["analysis_restarted"]),
    }

    feedback_match = {"NgayTao": time_query} if time_query else {}
    feedback_pipeline = [
        {"$match": feedback_match},
        {"$group": {"_id": None, "count": {"$sum": 1}, "average": {"$avg": "$DanhGia"}}},
    ]
    feedback_cursor = db["DANHGIASP"].aggregate(feedback_pipeline)
    feedback_stats, sources, campaigns, variants, roles = await asyncio.gather(
        feedback_cursor.to_list(length=1),
        _breakdown(
            db,
            "NguonTruyCap",
            event_date_filter,
            event_name="landing_page_view",
        ),
        _breakdown(
            db,
            "Campaign",
            event_date_filter,
            event_name="landing_page_view",
        ),
        _breakdown(
            db,
            "MessageVariant",
            event_date_filter,
            event_name="cta_clicked",
        ),
        _breakdown(
            db,
            "MaNganh",
            event_date_filter,
            event_name="analysis_started",
        ),
    )

    feedback_row = feedback_stats[0] if feedback_stats else {}
    feedback_count = int(feedback_row.get("count", 0) or 0)
    avg_rating = round(float(feedback_row.get("average", 0) or 0), 2)

    role_ids = [str(item.get("name")) for item in roles if item.get("name")]
    role_documents = (
        await db["NGANHNGHIET"].find({"_id": {"$in": role_ids}}).to_list(length=len(role_ids))
        if role_ids
        else []
    )
    role_names = {
        **DEFAULT_ROLE_NAMES,
        **{
            str(role.get("_id")): str(role.get("TenNganh"))
            for role in role_documents
            if role.get("_id") and role.get("TenNganh")
        },
    }
    return {
        "funnel": funnel,
        "drop_off": calculate_drop_off(funnel),
        "acquisition": {
            "sources": sources,
            "campaigns": campaigns,
            "message_variants": variants,
        },
        "conversion": {
            "registration_to_analysis": calculate_conversion_rate(completed, registrations),
            "registered_to_premium": calculate_conversion_rate(premium_count, registrations),
            "registered_count": registrations,
            "premium_count": premium_count,
        },
        "role_choices": apply_role_names(roles, role_names),
        "feedback_count": feedback_count,
        "avg_rating": avg_rating,
    }
