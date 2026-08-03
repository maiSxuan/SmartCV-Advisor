from datetime import datetime, timedelta, timezone

from app.services.analysis_service import evaluate_plan_lifecycle


def test_premium_active_stays_premium_and_unlimited():
    now = datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc)
    usage_doc = {
        "MaGoiDV": "DV_PREMIUM_30",
        "NgayBatDau": now - timedelta(days=5),
        "HanSuDung": now + timedelta(days=25),
    }

    state = evaluate_plan_lifecycle("premium", usage_doc, now)

    assert state["effective_account_type"] == "premium"
    assert state["plan_id"] == "DV_PREMIUM_30"
    assert state["is_unlimited"] is True
    assert state["limit"] == -1


def test_expired_premium_transitions_to_free_lifecycle_at_expiry():
    now = datetime(2026, 9, 3, 12, 0, tzinfo=timezone.utc)
    usage_doc = {
        "MaGoiDV": "DV_PREMIUM_30",
        "NgayBatDau": datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc),
        "HanSuDung": datetime(2026, 9, 2, 12, 0, tzinfo=timezone.utc),
    }

    state = evaluate_plan_lifecycle("premium", usage_doc, now)

    assert state["effective_account_type"] == "registered"
    assert state["plan_id"] == "DV_FREE"
    assert state["is_unlimited"] is False
    assert state["limit"] == 3
    assert state["period_start"] == datetime(2026, 9, 2, 12, 0, tzinfo=timezone.utc)
