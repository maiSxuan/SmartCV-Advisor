from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson.decimal128 import Decimal128
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import CollectionInvalid


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

DEFAULT_SERVICE_PLANS: tuple[dict[str, Any], ...] = (
    {
        "_id": "DV_FREE",
        "TenGoi": "Free",
        "Gia": Decimal128("0.00"),
        "HanSuDung": 30,
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
            [("MaKH", ASCENDING), ("MaChuKy", ASCENDING)],
            {
                "unique": True,
                "name": "uq_danhgiasp_makh_machuky",
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

    for collection_name, index_definitions in MVP_INDEXES.items():
        collection = db[collection_name]
        for keys, options in index_definitions:
            # MongoDB trả lại index hiện có khi key/options giống nhau, nên có
            # thể gọi lại an toàn ở mỗi lần application startup.
            await collection.create_index(keys, **options)


async def ensure_default_service_plans(db: Any) -> None:
    """Install usable defaults on a fresh DB without overwriting Admin edits."""
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
        # Migrate legacy documents once without resetting later Admin edits.
        await db["GOIDV"].update_one(
            {"_id": plan_id, "SapRaMat": {"$exists": False}},
            {"$set": {"SapRaMat": plan["SapRaMat"]}},
        )
