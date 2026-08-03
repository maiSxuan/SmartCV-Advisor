from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from bson.decimal128 import Decimal128
from pydantic import ValidationError
from pymongo import ASCENDING, DESCENDING

from app.routes.admin_plans import PlanUpsertRequest
from app.routes.feedback import FeedbackCreateRequest, FeedbackUpdateRequest
from app.services.analysis_service import resolve_quota_state
from app.services.database_bootstrap import DEFAULT_SERVICE_PLANS, MVP_COLLECTIONS, MVP_INDEXES
from app.services.feedback_service import lifecycle_key
from app.services.plan_service import add_plan_duration, serialize_admin_plan, serialize_public_plan
from app.services.product_analytics_service import (
    build_event_document,
    calculate_drop_off,
    get_analytics_summary,
)


def valid_feedback_payload() -> dict[str, object]:
    return {
        "analysis_id": "KQ001",
        "feedback_type": "gop_y_khac",
        "rating": 5,
        "easy_to_understand": True,
        "recommendation_specific": True,
        "useful": True,
        "inaccurate": False,
        "want_reanalyze": True,
        "willing_to_recommend": True,
        "comment": "Kết quả rõ ràng.",
    }


def test_feedback_create_request_validates_rating_type_and_required_answers() -> None:
    payload = valid_feedback_payload()
    request = FeedbackCreateRequest(**payload)

    assert request.rating == 5
    assert request.feedback_type == "gop_y_khac"
    assert request.want_reanalyze is True

    for invalid_rating in (0, 6):
        with pytest.raises(ValidationError):
            FeedbackCreateRequest(**{**payload, "rating": invalid_rating})

    with pytest.raises(ValidationError):
        FeedbackCreateRequest(**{**payload, "feedback_type": "khong_hop_le"})

    without_required_answer = dict(payload)
    without_required_answer.pop("useful")
    with pytest.raises(ValidationError):
        FeedbackCreateRequest(**without_required_answer)


def test_feedback_update_requires_at_least_one_supported_field() -> None:
    with pytest.raises(ValidationError):
        FeedbackUpdateRequest()

    request = FeedbackUpdateRequest(status="DangXemXet", note="Đang kiểm tra kết quả.")

    assert request.status == "DangXemXet"
    assert request.note == "Đang kiểm tra kết quả."

    with pytest.raises(ValidationError):
        FeedbackUpdateRequest(status="trang_thai_khong_hop_le")

    with pytest.raises(ValidationError):
        FeedbackUpdateRequest(status=None)

    with pytest.raises(ValidationError):
        FeedbackUpdateRequest(feedback_type=None)


def test_plan_upsert_request_enforces_business_validation_and_cleans_features() -> None:
    request = PlanUpsertRequest(
        plan_id="DV_PREMIUM_30",
        name=" Premium 30 ngày ",
        price=199_000,
        duration_days=30,
        analysis_limit=-1,
        features=[" Không giới hạn phân tích ", "", " Xem toàn bộ lịch sử "],
        coming_soon=[" AI Assistant ", "", " Matching Score với JD "],
        status="active",
    )

    assert request.features == ["Không giới hạn phân tích", "Xem toàn bộ lịch sử"]
    assert request.coming_soon == ["AI Assistant", "Matching Score với JD"]
    assert request.analysis_limit == -1

    with pytest.raises(ValidationError):
        PlanUpsertRequest(
            plan_id="DV_FREE",
            name="Free",
            price=0,
            duration_days=None,
            analysis_limit=0,
            features=[],
            status="active",
        )

    with pytest.raises(ValidationError):
        PlanUpsertRequest(
            plan_id="dv premium",
            name="Premium",
            price=199_000,
            duration_days=30,
            analysis_limit=3,
            features=[],
            status="active",
        )


def test_lifecycle_key_changes_when_period_start_changes() -> None:
    usage = {"_id": "LD_KH001_FREE"}
    first_start = datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc)
    second_start = first_start + timedelta(days=30)

    first_key = lifecycle_key(usage, first_start)
    second_key = lifecycle_key(usage, second_start)

    assert first_key == "LD_KH001_FREE:2026-08-03T12:00:00+00:00"
    assert second_key == "LD_KH001_FREE:2026-09-02T12:00:00+00:00"
    assert first_key != second_key


def test_plan_serializers_convert_decimal128_to_json_safe_number() -> None:
    document = {
        "_id": "DV_PREMIUM_30",
        "TenGoi": "Premium 30 ngày",
        "Gia": Decimal128("199000.00"),
        "HanSuDung": 30,
        "SoLuotPhanTich": -1,
        "QuyenLoi": "Không giới hạn phân tích; Xem toàn bộ lịch sử",
        "SapRaMat": "AI Assistant; Matching Score với JD",
        "TrangThai": "active",
    }

    admin_plan = serialize_admin_plan(document)
    public_plan = serialize_public_plan(document)

    assert admin_plan["Gia"] == 199_000
    assert isinstance(admin_plan["Gia"], int)
    assert public_plan["price"] == 199_000
    assert isinstance(public_plan["price"], int)
    assert public_plan["features"] == ["Không giới hạn phân tích", "Xem toàn bộ lịch sử"]
    assert admin_plan["SapRaMat"] == "AI Assistant; Matching Score với JD"
    assert public_plan["coming_soon"] == ["AI Assistant", "Matching Score với JD"]


def test_plan_duration_uses_calendar_months_for_30_and_90_day_passes() -> None:
    start = datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc)

    assert add_plan_duration(start, 30) == datetime(2026, 9, 3, 12, 0, tzinfo=timezone.utc)
    assert add_plan_duration(start, 90) == datetime(2026, 11, 3, 12, 0, tzinfo=timezone.utc)

    month_end = datetime(2026, 1, 31, 8, 30, tzinfo=timezone.utc)
    assert add_plan_duration(month_end, 30) == datetime(2026, 2, 28, 8, 30, tzinfo=timezone.utc)


def test_premium_quota_uses_admin_plan_configuration() -> None:
    now = datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc)

    class FakeCollection:
        def __init__(self, documents: list[dict[str, object]]) -> None:
            self.documents = documents

        async def find_one(self, query: dict[str, object], *args: object, **kwargs: object) -> dict[str, object] | None:
            for document in self.documents:
                if all(document.get(key) == value for key, value in query.items()):
                    return document
            return None

    class FakeDb:
        def __init__(self) -> None:
            self.collections = {
                "KHACHHANG": FakeCollection([{"_id": "KH001", "LoaiKH": "premium"}]),
                "LUOTDUNG": FakeCollection([
                    {
                        "_id": "LD001",
                        "MaKH": "KH001",
                        "MaGoiDV": "DV_PREMIUM_30",
                        "NgayBatDau": now,
                        "HanSuDung": now + timedelta(days=30),
                    }
                ]),
                "GOIDV": FakeCollection([{"_id": "DV_PREMIUM_30", "SoLuotPhanTich": 20}]),
            }

        def __getitem__(self, name: str) -> FakeCollection:
            return self.collections[name]

    state = asyncio.run(resolve_quota_state(FakeDb(), "KH001", now))

    assert state["plan_id"] == "DV_PREMIUM_30"
    assert state["limit"] == 20
    assert state["is_unlimited"] is False


def test_calculate_drop_off_returns_absolute_and_percentage_loss() -> None:
    funnel = {
        "landing_page_views": 100,
        "registrations": 60,
        "cv_selections": 45,
        "uploads_completed": 40,
        "analyses_started": 35,
        "analyses_completed": 28,
        "suggestions_viewed": 21,
    }

    drop_off = calculate_drop_off(funnel)

    assert drop_off[0] == {
        "from": "landing_page_views",
        "to": "registrations",
        "count": 40,
        "rate": 40.0,
    }
    assert drop_off[1]["count"] == 15
    assert drop_off[1]["rate"] == 25.0
    assert drop_off[-1] == {
        "from": "analyses_completed",
        "to": "suggestions_viewed",
        "count": 7,
        "rate": 25.0,
    }

    non_monotonic = calculate_drop_off(
        {
            "landing_page_views": 2,
            "registrations": 3,
            "cv_selections": 0,
            "uploads_completed": 0,
            "analyses_started": 0,
            "analyses_completed": 0,
            "suggestions_viewed": 0,
        }
    )
    assert non_monotonic[0]["count"] == 0
    assert non_monotonic[0]["rate"] == 0.0


def test_analytics_summary_uses_product_events_as_funnel_source_of_truth() -> None:
    events = [
        {
            "LoaiSuKien": "landing_page_view",
            "ActorKey": "SESSION-1",
            "NguonTruyCap": "google",
            "Campaign": "mvp",
            "MessageVariant": "landing-variant-must-not-be-counted",
        },
        {
            "LoaiSuKien": "landing_page_view",
            "ActorKey": "SESSION-2",
            "NguonTruyCap": "google",
            "Campaign": "mvp",
        },
        {"LoaiSuKien": "registration_completed", "ActorKey": "KH001"},
        {"LoaiSuKien": "cv_selected", "ActorKey": "KH001"},
        {"LoaiSuKien": "cv_selected", "ActorKey": "KH001"},
        {"LoaiSuKien": "upload_completed", "ActorKey": "KH001"},
        {"LoaiSuKien": "analysis_started", "ActorKey": "KH001", "MaNganh": "ROLE-01"},
        {"LoaiSuKien": "analysis_completed", "ActorKey": "KH001", "MaNganh": "ROLE-01"},
        {"LoaiSuKien": "suggestions_viewed", "ActorKey": "KH001"},
        {"LoaiSuKien": "suggestions_viewed", "ActorKey": "KH001"},
        {"LoaiSuKien": "analysis_restarted", "ActorKey": "KH001"},
        {"LoaiSuKien": "premium_converted", "ActorKey": "KH001"},
        {"LoaiSuKien": "cta_clicked", "ActorKey": "SESSION-1", "MessageVariant": "hero"},
        {"LoaiSuKien": "cta_clicked", "ActorKey": "SESSION-2", "MessageVariant": "footer"},
    ]

    def matches(document: dict[str, object], query: dict[str, object]) -> bool:
        for field, expected in query.items():
            value = document.get(field)
            if isinstance(expected, dict):
                if "$ne" in expected and value == expected["$ne"]:
                    return False
                if "$nin" in expected and value in expected["$nin"]:
                    return False
                continue
            if value != expected:
                return False
        return True

    class FakeCursor:
        def __init__(self, rows: list[dict[str, object]]) -> None:
            self.rows = rows

        async def to_list(self, length: int) -> list[dict[str, object]]:
            return self.rows[:length]

    class FakeEventCollection:
        async def count_documents(self, query: dict[str, object]) -> int:
            return sum(1 for event in events if matches(event, query))

        async def distinct(self, field: str, query: dict[str, object]) -> list[object]:
            return list({event.get(field) for event in events if matches(event, query)})

        def aggregate(self, pipeline: list[dict[str, object]]) -> FakeCursor:
            match = pipeline[0]["$match"]
            group = pipeline[1]["$group"]
            group_field = str(group["_id"])[1:]
            counts: dict[object, int] = {}
            for event in events:
                if matches(event, match):
                    value = event.get(group_field)
                    counts[value] = counts.get(value, 0) + 1
            rows = [{"_id": key, "count": value} for key, value in counts.items()]
            rows.sort(key=lambda row: (-int(row["count"]), str(row["_id"])))
            return FakeCursor(rows)

    class FakeFeedbackCollection:
        def aggregate(self, _pipeline: list[dict[str, object]]) -> FakeCursor:
            return FakeCursor([{"count": 2, "average": 4.5}])

    class FakeDb:
        def __init__(self) -> None:
            self.accessed: set[str] = set()
            self.event_collection = FakeEventCollection()
            self.feedback_collection = FakeFeedbackCollection()

        def __getitem__(self, name: str) -> object:
            self.accessed.add(name)
            if name == "SUKIEN_SANPHAM":
                return self.event_collection
            if name == "DANHGIASP":
                return self.feedback_collection
            raise AssertionError(f"Analytics must not read operational collection {name}")

    fake_db = FakeDb()
    summary = asyncio.run(get_analytics_summary(fake_db))

    assert summary["funnel"] == {
        "landing_page_views": 2,
        "registrations": 1,
        "cv_selections": 1,
        "uploads_completed": 1,
        "analyses_started": 1,
        "analyses_completed": 1,
        "suggestions_viewed": 2,
        "reanalyses": 1,
    }
    assert summary["conversion"] == {
        "registration_to_analysis": 100.0,
        "registered_to_premium": 100.0,
        "registered_count": 1,
        "premium_count": 1,
    }
    assert summary["acquisition"]["sources"] == [{"name": "google", "count": 2}]
    assert summary["acquisition"]["campaigns"] == [{"name": "mvp", "count": 2}]
    assert summary["acquisition"]["message_variants"] == [
        {"name": "footer", "count": 1},
        {"name": "hero", "count": 1},
    ]
    assert summary["role_choices"] == [{"name": "ROLE-01", "count": 1}]
    assert summary["avg_rating"] == 4.5
    assert fake_db.accessed == {"SUKIEN_SANPHAM", "DANHGIASP"}


def test_build_event_document_sanitizes_fields_and_metadata() -> None:
    metadata = {
        "safe": "x" * 600,
        "$operator": "discarded",
        "nested.key": "discarded",
        "complex": {"raw": "discarded"},
        "number": 12,
    }
    document = build_event_document(
        event_name="landing_page_view",
        user_id="  KH001  ",
        session_id="  SESSION-001  ",
        source="  google  ",
        campaign="mvp-beta",
        message_variant="hero-a",
        path="/landing",
        metadata=metadata,
        occurred_at=datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc),
    )

    assert document["LoaiSuKien"] == "landing_page_view"
    assert document["MaKH"] == "KH001"
    assert document["SessionId"] == "SESSION-001"
    assert document["ActorKey"] == "KH001"
    assert document["NguonTruyCap"] == "google"
    assert document["Metadata"] == {"safe": "x" * 500, "number": 12}
    assert "DedupeKey" not in document

    deduplicated = build_event_document(
        event_name="landing_page_view",
        session_id="SESSION-001",
        dedupe_key="landing_page_view:SESSION-001",
    )
    assert deduplicated["DedupeKey"] == "landing_page_view:SESSION-001"

    with pytest.raises(ValueError):
        build_event_document(event_name="event_khong_duoc_ho_tro")


def test_step4_bootstrap_indexes_use_persisted_document_field_names() -> None:
    assert {"DANHGIASP", "SUKIEN_SANPHAM", "GOIDV"}.issubset(set(MVP_COLLECTIONS))

    feedback_indexes = {options["name"]: (keys, options) for keys, options in MVP_INDEXES["DANHGIASP"]}
    unique_keys, unique_options = feedback_indexes["uq_danhgiasp_makh_machuky"]
    assert unique_keys == [("MaKH", ASCENDING), ("MaChuKy", ASCENDING)]
    assert unique_options["unique"] is True

    event_indexes = {options["name"]: keys for keys, options in MVP_INDEXES["SUKIEN_SANPHAM"]}
    assert event_indexes["idx_sukien_ten_thoidiem"] == [
        ("LoaiSuKien", ASCENDING),
        ("ThoiDiem", DESCENDING),
    ]
    assert event_indexes["idx_sukien_maphien_thoidiem"] == [
        ("SessionId", ASCENDING),
        ("ThoiDiem", DESCENDING),
    ]
    assert event_indexes["idx_sukien_actor_loai"] == [
        ("LoaiSuKien", ASCENDING),
        ("ActorKey", ASCENDING),
        ("ThoiDiem", DESCENDING),
    ]

    event_fields = {
        field
        for keys, _options in MVP_INDEXES["SUKIEN_SANPHAM"]
        for field, _direction in keys
    }
    assert {
        "LoaiSuKien",
        "ActorKey",
        "SessionId",
        "NguonTruyCap",
        "Campaign",
        "MessageVariant",
        "MaNganh",
        "ThoiDiem",
    }.issubset(event_fields)
    assert "TenSuKien" not in event_fields
    assert "MaPhien" not in event_fields

    assert MVP_INDEXES["GOIDV"] == [
        (
            [("TrangThai", ASCENDING)],
            {"name": "idx_goidv_trangthai"},
        )
    ]

    defaults = {plan["_id"]: plan for plan in DEFAULT_SERVICE_PLANS}
    assert set(defaults) == {"DV_FREE", "DV_PREMIUM_30", "DV_PREMIUM_90"}
    assert all(plan["TrangThai"] == "active" for plan in defaults.values())
    assert all("SapRaMat" in plan for plan in defaults.values())
    assert defaults["DV_FREE"]["SoLuotPhanTich"] == 3
