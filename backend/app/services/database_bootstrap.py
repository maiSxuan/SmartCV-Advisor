from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson.decimal128 import Decimal128
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import CollectionInvalid, OperationFailure


# Các collection/index nền tảng của nhóm use case MVP ở bước 4.
# Hàm bootstrap bên dưới tuyệt đối không chèn dữ liệu mẫu.
MVP_COLLECTIONS = (
    "DANHGIASP",
    "SUKIEN_SANPHAM",
    "GOIDV",
)

DEFAULT_PREMIUM_COMING_SOON = (
    "Danh sách lỗi chi tiết; Câu mẫu viết lại theo STAR; "
    "Sao chép nhanh từng câu mẫu; Nội dung viết lại nâng cao; "
    "Matching Score với mô tả công việc; AI Assistant hỗ trợ chỉnh sửa CV; "
    "Tải xuống CV đã chỉnh sửa"
)

LEGACY_FEEDBACK_UNIQUE_INDEX_NAME = "uq_danhgiasp_makh_machuky"
FEEDBACK_LIFECYCLE_INDEX_NAME = "idx_danhgiasp_makh_machuky_ngaytao"

DEFAULT_SERVICE_PLANS: tuple[dict[str, Any], ...] = (
    {
        "_id": "DV_FREE",
        "TenGoi": "Free",
        "Gia": Decimal128("0.00"),
        "HanSuDung": -1,
        "SoLuotPhanTich": 3,
        "QuyenLoi": "3 lượt phân tích trong chu kỳ; xem điểm và gợi ý cơ bản; xem toàn bộ lịch sử phân tích",
        "SapRaMat": "",
        "TrangThai": "active",
    },
    {
        "_id": "DV_PREMIUM_30",
        "TenGoi": "Premium - Job Search Pass 30 ngày",
        "Gia": Decimal128("199000.00"),
        "HanSuDung": 30,
        "SoLuotPhanTich": -1,
        "QuyenLoi": "Phân tích không giới hạn; roadmap cải thiện; gợi ý chuyên sâu; xem toàn bộ lịch sử phân tích",
        "SapRaMat": DEFAULT_PREMIUM_COMING_SOON,
        "TrangThai": "active",
    },
    {
        "_id": "DV_PREMIUM_90",
        "TenGoi": "Premium - Job Search Pass 90 ngày",
        "Gia": Decimal128("389000.00"),
        "HanSuDung": 90,
        "SoLuotPhanTich": -1,
        "QuyenLoi": "Phân tích không giới hạn; roadmap cải thiện; gợi ý chuyên sâu; xem toàn bộ lịch sử phân tích",
        "SapRaMat": DEFAULT_PREMIUM_COMING_SOON,
        "TrangThai": "active",
    },
)

MVP_INDEXES: dict[str, list[tuple[list[tuple[str, int]], dict[str, Any]]]] = {
    "DANHGIASP": [
        (
            [("MaKH", ASCENDING), ("MaChuKy", ASCENDING), ("NgayTao", DESCENDING)],
            {
                "name": FEEDBACK_LIFECYCLE_INDEX_NAME,
            },
        ),
        (
            [
                ("LoaiPhanHoi", ASCENDING),
                ("TrangThai", ASCENDING),
                ("NgayTao", DESCENDING),
            ],
            {
                "name": "idx_danhgiasp_loai_trangthai_ngaytao",
            },
        ),
        (
            [("TrangThai", ASCENDING), ("NgayTao", DESCENDING)],
            {
                "name": "idx_danhgiasp_trangthai_ngaytao",
            },
        ),
        (
            [("DanhGia", ASCENDING), ("NgayTao", DESCENDING)],
            {
                "name": "idx_danhgiasp_danhgia_ngaytao",
            },
        ),
        (
            [("MaKQ", ASCENDING)],
            {
                "name": "idx_danhgiasp_makq",
            },
        ),
        (
            [("NgayTao", DESCENDING)],
            {
                "name": "idx_danhgiasp_ngaytao",
            },
        ),
    ],
    "SUKIEN_SANPHAM": [
        (
            [("LoaiSuKien", ASCENDING), ("ThoiDiem", DESCENDING)],
            {
                "name": "idx_sukien_ten_thoidiem",
            },
        ),
        (
            [("MaKH", ASCENDING), ("ThoiDiem", DESCENDING)],
            {
                "name": "idx_sukien_makh_thoidiem",
            },
        ),
        (
            [("SessionId", ASCENDING), ("ThoiDiem", DESCENDING)],
            {
                "name": "idx_sukien_maphien_thoidiem",
            },
        ),
        (
            [("LoaiSuKien", ASCENDING), ("ActorKey", ASCENDING), ("ThoiDiem", DESCENDING)],
            {
                "name": "idx_sukien_actor_loai",
            },
        ),
        (
            [("DedupeKey", ASCENDING)],
            {
                "name": "uq_sukien_dedupe_key",
                "unique": True,
                "sparse": True,
            },
        ),
        (
            [("LoaiSuKien", ASCENDING), ("NguonTruyCap", ASCENDING), ("ThoiDiem", DESCENDING)],
            {"name": "idx_sukien_loai_nguon_thoidiem"},
        ),
        (
            [("LoaiSuKien", ASCENDING), ("Campaign", ASCENDING), ("ThoiDiem", DESCENDING)],
            {"name": "idx_sukien_loai_campaign_thoidiem"},
        ),
        (
            [("LoaiSuKien", ASCENDING), ("MessageVariant", ASCENDING), ("ThoiDiem", DESCENDING)],
            {"name": "idx_sukien_loai_variant_thoidiem"},
        ),
        (
            [
                ("NguonTruyCap", ASCENDING),
                ("Campaign", ASCENDING),
                ("MessageVariant", ASCENDING),
                ("ThoiDiem", DESCENDING),
            ],
            {
                "name": "idx_sukien_attribution_thoidiem",
            },
        ),
        (
            [("MaNganh", ASCENDING), ("ThoiDiem", DESCENDING)],
            {
                "name": "idx_sukien_manganh_thoidiem",
            },
        ),
    ],
    "GOIDV": [
        (
            [("TrangThai", ASCENDING)],
            {
                "name": "idx_goidv_trangthai",
            },
        ),
    ],
}


async def drop_legacy_feedback_unique_index(collection: Any) -> None:
    """Remove the former one-feedback-per-lifecycle constraint safely.

    The migration only drops an index; existing feedback documents are never
    changed or deleted. Detecting the key pattern also covers installations
    where the legacy index was created under a different name.
    """

    indexes = await collection.list_indexes().to_list(length=None)
    for index in indexes:
        key = index.get("key") or {}
        key_items = list(key.items()) if hasattr(key, "items") else []
        is_legacy_name = index.get("name") == LEGACY_FEEDBACK_UNIQUE_INDEX_NAME
        is_legacy_unique_pattern = bool(index.get("unique")) and key_items == [
            ("MaKH", ASCENDING),
            ("MaChuKy", ASCENDING),
        ]
        if not (is_legacy_name or is_legacy_unique_pattern):
            continue

        try:
            await collection.drop_index(index["name"])
        except OperationFailure as exc:
            # Another application instance may have completed the same
            # idempotent migration after list_indexes() returned.
            if getattr(exc, "code", None) != 27 and "index not found" not in str(exc).lower():
                raise


async def ensure_mvp_collections(db: Any) -> None:
    """Tạo idempotent các collection và index cần cho MVP bước 4."""

    existing_collections = set(await db.list_collection_names())

    for collection_name in MVP_COLLECTIONS:
        if collection_name not in existing_collections:
            try:
                await db.create_collection(collection_name)
            except CollectionInvalid:
                # Một process khởi động song song có thể vừa tạo collection.
                pass

    # This must run before creating the replacement non-unique index. It is
    # intentionally repeated on every bootstrap so deployments that upgrade
    # after a temporary database outage migrate on the next successful call.
    await drop_legacy_feedback_unique_index(db["DANHGIASP"])

    for collection_name, index_definitions in MVP_INDEXES.items():
        collection = db[collection_name]
        for keys, options in index_definitions:
            # MongoDB trả lại index hiện có khi key/options giống nhau, nên có
            # thể gọi lại an toàn ở mỗi lần application startup.
            await collection.create_index(keys, **options)


async def ensure_default_service_plans(db: Any) -> None:
    """Install defaults and enforce canonical plan-duration invariants."""
    now = datetime.now(timezone.utc)
    for plan in DEFAULT_SERVICE_PLANS:
        plan_id = plan["_id"]
        await db["GOIDV"].update_one(
            {"_id": plan_id},
            {
                "$setOnInsert": {
                    **{key: value for key, value in plan.items() if key != "_id"},
                    "NgayTao": now,
                    "NgayCapNhat": now,
                    "MaADM": "SYSTEM",
                }
            },
            upsert=True,
        )
        # Duration is part of the plan identity, not an Admin-customizable
        # benefit. This also migrates legacy DV_FREE values such as 30/365 to -1.
        await db["GOIDV"].update_one(
            {"_id": plan_id, "HanSuDung": {"$ne": plan["HanSuDung"]}},
            {"$set": {"HanSuDung": plan["HanSuDung"]}},
        )
        # Migrate legacy documents once without resetting later Admin edits.
        await db["GOIDV"].update_one(
            {"_id": plan_id, "SapRaMat": {"$exists": False}},
            {"$set": {"SapRaMat": plan["SapRaMat"]}},
        )
