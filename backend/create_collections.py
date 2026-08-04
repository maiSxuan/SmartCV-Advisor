import os
import asyncio
from datetime import datetime, timedelta, timezone

from bson.decimal128 import Decimal128
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING

from app.services.auth_service import hash_password
from app.services.database_bootstrap import (
    DEFAULT_PREMIUM_COMING_SOON,
    MVP_INDEXES,
    drop_legacy_feedback_unique_index,
)
from app.services.role_dataset import build_role_seed_documents


load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "smartcv")


async def main():
    if not MONGODB_URI:
        raise RuntimeError(
            "Chưa cấu hình MONGODB_URI trong file .env"
        )

    client = AsyncIOMotorClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=5000,
    )

    try:
        # Kiểm tra kết nối MongoDB
        await client.admin.command("ping")
        print("Connected to MongoDB successfully.")

        db = client[MONGODB_DB]

        now = datetime.now(timezone.utc)
        role_seed_documents = build_role_seed_documents(now)

        # =============================================================
        # DANH SÁCH COLLECTION VÀ DỮ LIỆU MẪU
        # =============================================================

        collections = [
            # ---------------------------------------------------------
            # 1. ADMIN
            # ---------------------------------------------------------
            {
                "name": "ADMIN",
                "documents": [
                    {
                        "_id": "ADM001",
                        "HoTen": "Quản trị viên SmartCV",
                        "Email": "admin@smartcv.vn",
                        "SoDienThoai": "0900000001",
                        "DiaChi": "TP. Hồ Chí Minh",
                        "TrangThai": "Hoat dong",
                    }
                ],
            },

            # ---------------------------------------------------------
            # 2. KHACHHANG
            # ---------------------------------------------------------
            {
                "name": "KHACHHANG",
                "documents": [
                    {
                        "_id": "KH001",
                        "HoTen": "Trần Minh An",
                        "Email": "minhan@example.com",
                        "SoDienThoai": "0901234567",
                        "DiaChi": "TP. Hồ Chí Minh",
                        "TrangThai": "Hoạt động",
                        "LoaiKH": "registered",
                        "TrinhDoHV": "Sinh viên năm cuối",
                        "ViTriNN": "Frontend Developer",
                        "NNQuanTam": "Công nghệ thông tin",
                        "NgayDangKy": now,
                    },
                    {
                        "_id": "KH002",
                        "HoTen": "Nguyễn Hoàng Nam",
                        "Email": "hoangnam@example.com",
                        "SoDienThoai": "0912345678",
                        "DiaChi": "Bình Dương",
                        "TrangThai": "Hoạt động",
                        "LoaiKH": "premium",
                        "TrinhDoHV": "Đã tốt nghiệp",
                        "ViTriNN": "Backend Developer",
                        "NNQuanTam": "Phát triển phần mềm",
                        "NgayDangKy": now,
                    },
                ],
            },

            # ---------------------------------------------------------
            # 3. TAIKHOAN
            # ---------------------------------------------------------
            {
                "name": "TAIKHOAN",
                "documents": [
                    {
                        "_id": "TK_ADM001",
                        "Email": "admin@smartcv.vn",
                        "EmailNormalized": "admin@smartcv.vn",
                        "MatKhauHash": hash_password("Demo1234"),
                        "Role": "admin",
                        "TrangThai": "active",
                        "EmailVerified": True,
                        "FailedLoginCount": 0,
                        "LockedUntil": None,
                        "CreatedAt": now,
                        "UpdatedAt": now,
                        "MaADM": "ADM001",
                    },
                    {
                        "_id": "TK_KH001",
                        "Email": "minhan@example.com",
                        "EmailNormalized": "minhan@example.com",
                        "MatKhauHash": hash_password("Demo1234"),
                        "Role": "registered",
                        "TrangThai": "active",
                        "EmailVerified": True,
                        "FailedLoginCount": 0,
                        "LockedUntil": None,
                        "CreatedAt": now,
                        "UpdatedAt": now,
                        "MaKH": "KH001",
                    },
                    {
                        "_id": "TK_KH002",
                        "Email": "hoangnam@example.com",
                        "EmailNormalized": "hoangnam@example.com",
                        "MatKhauHash": hash_password("Demo1234"),
                        "Role": "premium",
                        "TrangThai": "active",
                        "EmailVerified": True,
                        "FailedLoginCount": 0,
                        "LockedUntil": None,
                        "CreatedAt": now,
                        "UpdatedAt": now,
                        "MaKH": "KH002",
                    },
                ],
            },

            # ---------------------------------------------------------
            # 4. GOIDV
            # ---------------------------------------------------------
            {
                "name": "GOIDV",
                "documents": [
                    {
                        "_id": "DV_FREE",
                        "TenGoi": "Free",
                        "Gia": Decimal128("0.00"),
                        "SoLuotPhanTich": 3,
                        "HanSuDung": -1,
                        "QuyenLoi": (
                            "3 lượt phân tích; xem điểm tổng quan; "
                            "xem lỗi phổ biến và gợi ý cải thiện tổng quan không kèm roadmap."
                        ),
                        "SapRaMat": "",
                        "TrangThai": "active",
                        "NgayTao": now,
                        "NgayCapNhat": None,
                        "MaADM": "ADM001",
                    },
                    {
                        "_id": "DV_PREMIUM_30",
                        "TenGoi": "Premium - Job Search Pass 30 ngày",
                        "Gia": Decimal128("199000.00"),
                        "SoLuotPhanTich": -1,
                        "HanSuDung": 30,
                        "QuyenLoi": (
                            "Phân tích CV nâng cao; xem gợi ý chi tiết; "
                            "xem roadmap sau khi đánh giá CV; "
                            "xem câu mẫu viết lại và sao chép nhanh."
                        ),
                        "SapRaMat": DEFAULT_PREMIUM_COMING_SOON,
                        "TrangThai": "active",
                        "NgayTao": now,
                        "NgayCapNhat": None,
                        "MaADM": "ADM001",
                    },
                    {
                        "_id": "DV_PREMIUM_90",
                        "TenGoi": "Premium - Job Search Pass 90 ngày",
                        "Gia": Decimal128("389000.00"),
                        "SoLuotPhanTich": -1,
                        "HanSuDung": 90,
                        "QuyenLoi": (
                            "Phân tích CV nâng cao; xem gợi ý chi tiết; "
                            "xem roadmap sau khi đánh giá CV; "
                            "xem câu mẫu viết lại và sao chép nhanh."
                        ),
                        "SapRaMat": DEFAULT_PREMIUM_COMING_SOON,
                        "TrangThai": "active",
                        "NgayTao": now,
                        "NgayCapNhat": None,
                        "MaADM": "ADM001",
                    },
                ],
            },

            # ---------------------------------------------------------
            # 5. LOG_ADMIN
            # ---------------------------------------------------------
            {
                "name": "LOG_ADMIN",
                "documents": [
                    {
                        "_id": "LOG_ADM001",
                        "HanhDong": "Tạo gói dịch vụ",
                        "DuLieuTruoc": None,
                        "DuLieuSau": {
                            "MaDV": "DV_PREMIUM_30",
                            "TenGoi": "Premium - Job Search Pass 30 ngày",
                        },
                        "KetQua": "Thanh cong",
                        "ThoiDiemThucHien": now,
                        "MaADM": "ADM001",
                        "DoiTuong": "GOIDV",
                        "MaDoiTuong": "DV_PREMIUM_30",
                    },
                    {
                        "_id": "LOG_ADM001",
                        "HanhDong": "Tạo gói dịch vụ",
                        "DuLieuTruoc": None,
                        "DuLieuSau": {
                            "MaDV": "DV_PREMIUM_90",
                            "TenGoi": "Premium - Job Search Pass 90 ngày",
                        },
                        "KetQua": "Thanh cong",
                        "ThoiDiemThucHien": now,
                        "MaADM": "ADM001",
                        "DoiTuong": "GOIDV",
                        "MaDoiTuong": "DV_PREMIUM_90",
                    },
                ],
            },

            # ---------------------------------------------------------
            # 6. LOG_KH
            # ---------------------------------------------------------
            {
                "name": "LOG_KH",
                "documents": [
                    {
                        "_id": "LOG_KH001",
                        "HanhDong": "Tải CV lên hệ thống",
                        "DuLieuTruoc": None,
                        "DuLieuSau": {
                            "TenFileGoc": "Tran_Minh_An_Frontend_CV.pdf",
                            "TrangThai": "uploaded",
                        },
                        "KetQua": "Thanh cong",
                        "ThoiDiemThucHien": now,
                        "MaKH": "KH001",
                        "DoiTuong": "CV",
                        "MaDoiTuong": "CV001",
                    }
                ],
            },

            # ---------------------------------------------------------
            # 7. LUOTDUNG
            # Chỉ lưu thông tin đăng ký gói dịch vụ (MaGoiDV, HanSuDung).
            # Số lượt đã dùng được đếm trực tiếp từ LICHSUPTCV với index.
            # ---------------------------------------------------------
            {
                "name": "LUOTDUNG",
                "documents": [
                    {
                        "_id": "LD001",
                        "MaKH": "KH001",
                        "MaGoiDV": "DV_FREE",
                        "NgayBatDau": now,
                        "HanSuDung": now + timedelta(days=30),
                    },
                    {
                        "_id": "LD002",
                        "MaKH": "KH002",
                        "MaGoiDV": "DV_PREMIUM_30",
                        "NgayBatDau": now,
                        "HanSuDung": now + timedelta(days=30),
                    },
                ],
            },

            # ---------------------------------------------------------
            # 8. NGANHNGHIET
            # Giữ nguyên tên bảng theo ERD hiện tại
            # ---------------------------------------------------------
            {
                "name": "NGANHNGHIET",
                "documents": role_seed_documents["roles"],
            },

            # ---------------------------------------------------------
            # 9. KYNANG
            # ---------------------------------------------------------
            {
                "name": "KYNANG",
                "documents": role_seed_documents["skills"],
            },

            # ---------------------------------------------------------
            # 10. NGANHNGHE_KYNANG
            # ---------------------------------------------------------
            {
                "name": "NGANHNGHE_KYNANG",
                "documents": role_seed_documents["role_skills"],
            },

            # ---------------------------------------------------------
            # 11. DIEMDANHGIA
            # ---------------------------------------------------------
            {
                "name": "DIEMDANHGIA",
                "documents": role_seed_documents["skill_scores"],
            },

            # ---------------------------------------------------------
            # 12. CV
            # ---------------------------------------------------------
            {
                "name": "CV",
                "documents": [
                    {
                        "_id": "CV001",
                        "Loai": "pdf",
                        "DungLuong": 1843,
                        "TenFileGoc": "Tran_Minh_An_Frontend_CV.pdf",
                        "NgayTaiLen": now,
                        "TrangThai": "completed",
                        "MaNganh": "NG_FRONTEND",
                        "MaKH": "KH001",
                    },
                    {
                        "_id": "CV002",
                        "Loai": "docx",
                        "DungLuong": 956,
                        "TenFileGoc": "Nguyen_Hoang_Nam_Backend_CV.docx",
                        "NgayTaiLen": now,
                        "TrangThai": "uploaded",
                        "MaNganh": "NG_BACKEND",
                        "MaKH": "KH002",
                    },
                ],
            },

            # ---------------------------------------------------------
            # 13. KETQUA_PTCV
            # ---------------------------------------------------------
            {
                "name": "KETQUA_PTCV",
                "documents": [
                    {
                        "_id": "KQ001",
                        "DiemTongQuan": 72.0,

                        # Professional Summary
                        "DiemPhanGT": 7.0,

                        # Education
                        "DiemTDHV": 8.0,

                        # Experience
                        "DiemKNLV": 12.0,

                        # Projects
                        "DiemDoAn": 10.0,

                        # Technical Skills
                        "DiemTechSkill": 27.0,

                        # Certifications
                        "DiemCert": 8.0,

                        "NhanXetTQ": (
                            "CV có cấu trúc rõ ràng nhưng cần bổ sung kết quả "
                            "định lượng, thống nhất mốc thời gian và làm rõ "
                            "các kỹ năng đã sử dụng trong dự án."
                        ),
                        "ThoiDiemPT": now,
                        "MaCV": "CV001",
                    }
                ],
            },

            # ---------------------------------------------------------
            # 14. LICHSUPTCV
            # ---------------------------------------------------------
            {
                "name": "LICHSUPTCV",
                "documents": [
                    {
                        "_id": "LS001",
                        "NgayPT": now,
                        "MaKQ": "KQ001",
                        "MaKH": "KH001",
                    }
                ],
            },

            # ---------------------------------------------------------
            # 15. GOIY_CAITHIEN
            # ---------------------------------------------------------
            {
                "name": "GOIY_CAITHIEN",
                "documents": [
                    {
                        "_id": "GY001",
                        "MoTaVanDe": (
                            "Mô tả dự án chưa thể hiện kết quả định lượng."
                        ),
                        "GiaiPhap": (
                            "Bổ sung số liệu cụ thể như số màn hình đã phát "
                            "triển, thời gian xử lý hoặc tỷ lệ cải thiện."
                        ),
                        "Loai": "noi dung",
                        "is_premium": False,
                        "DoUuTien": 1,
                        "MaKQ": "KQ001",
                    },
                    {
                        "_id": "GY002",
                        "MoTaVanDe": (
                            "CV chưa thể hiện rõ kỹ năng REST API và Git."
                        ),
                        "GiaiPhap": (
                            "Đưa các kỹ năng thực sự đã sử dụng vào phần "
                            "Kỹ năng và mô tả chúng trong dự án liên quan."
                        ),
                        "Loai": "tu khoa",
                        "is_premium": False,
                        "DoUuTien": 2,
                        "MaKQ": "KQ001",
                    },
                    {
                        "_id": "GY003",
                        "MoTaVanDe": (
                            "Câu mô tả kinh nghiệm còn chung chung."
                        ),
                        "GiaiPhap": (
                            "Viết lại câu mô tả theo hướng hành động, "
                            "nhiệm vụ và kết quả đạt được."
                        ),
                        "Loai": "noi dung",
                        "is_premium": True,
                        "DoUuTien": 3,
                        "MaKQ": "KQ001",
                    },
                ],
            },

            # ---------------------------------------------------------
            # 16. DANHGIASP
            # Không seed phản hồi giả; dữ liệu do người dùng tạo.
            # ---------------------------------------------------------
            {
                "name": "DANHGIASP",
                "documents": [],
            },

            # ---------------------------------------------------------
            # 17. SUKIEN_SANPHAM
            # Không seed sự kiện giả; dữ liệu do hành vi thực tế tạo.
            # ---------------------------------------------------------
            {
                "name": "SUKIEN_SANPHAM",
                "documents": [],
            },
        ]

        # =============================================================
        # INDEX TƯƠNG ĐƯƠNG UNIQUE / PRIMARY KEY / FOREIGN KEY TRA CỨU
        # =============================================================

        indexes = {
            "ADMIN": [
                (
                    [("Email", ASCENDING)],
                    {
                        "unique": True,
                        "name": "uq_admin_email",
                    },
                )
            ],
            "KHACHHANG": [
                (
                    [("Email", ASCENDING)],
                    {
                        "unique": True,
                        "name": "uq_khachhang_email",
                    },
                )
            ],
            "TAIKHOAN": [
                (
                    [("Email", ASCENDING)],
                    {
                        "unique": True,
                        "name": "uq_taikhoan_email",
                    },
                ),
                (
                    [("MaKH", ASCENDING)],
                    {
                        "unique": True,
                        "sparse": True,
                        "name": "uq_taikhoan_makh",
                    },
                ),
                (
                    [("MaADM", ASCENDING)],
                    {
                        "unique": True,
                        "sparse": True,
                        "name": "uq_taikhoan_maadm",
                    },
                ),
            ],
            "NGANHNGHE_KYNANG": [
                (
                    [
                        ("MaNganh", ASCENDING),
                        ("MaKyNang", ASCENDING),
                    ],
                    {
                        "unique": True,
                        "name": "uq_nganhnghe_kynang",
                    },
                )
            ],
            "DIEMDANHGIA": [
                (
                    [
                        ("MaNganh", ASCENDING),
                        ("MaKyNang", ASCENDING),
                    ],
                    {
                        "unique": True,
                        "sparse": True,
                        "name": "uq_diemdanhgia_manganh_makynang",
                    },
                )
            ],
            "CV": [
                (
                    [("MaKH", ASCENDING)],
                    {
                        "name": "idx_cv_makh",
                    },
                ),
                (
                    [("MaNganh", ASCENDING)],
                    {
                        "name": "idx_cv_manganh",
                    },
                ),
            ],
            "KETQUA_PTCV": [
                (
                    [("MaCV", ASCENDING)],
                    {
                        "name": "idx_ketqua_macv",
                    },
                )
            ],
            "LICHSUPTCV": [
                (
                    [
                        ("MaKH", ASCENDING),
                        ("NgayPT", DESCENDING),
                    ],
                    {
                        "name": "idx_lichsu_khachhang_ngay",
                    },
                ),
                (
                    [("MaKQ", ASCENDING)],
                    {
                        "name": "idx_lichsu_makq",
                    },
                ),
            ],
            "GOIY_CAITHIEN": [
                (
                    [
                        ("MaKQ", ASCENDING),
                        ("DoUuTien", ASCENDING),
                    ],
                    {
                        "name": "idx_goiy_ketqua_uutien",
                    },
                )
            ],
            "LOG_ADMIN": [
                (
                    [
                        ("MaADM", ASCENDING),
                        ("ThoiDiemThucHien", ASCENDING),
                    ],
                    {
                        "name": "idx_logadmin_admin_time",
                    },
                )
            ],
            "LOG_KH": [
                (
                    [
                        ("MaKH", ASCENDING),
                        ("ThoiDiemThucHien", ASCENDING),
                    ],
                    {
                        "name": "idx_logkh_khachhang_time",
                    },
                )
            ],
            "DANHGIASP": MVP_INDEXES["DANHGIASP"],
            "SUKIEN_SANPHAM": MVP_INDEXES["SUKIEN_SANPHAM"],
            "GOIDV": MVP_INDEXES["GOIDV"],
        }

        # =============================================================
        # TẠO COLLECTION, INDEX VÀ UPSERT DỮ LIỆU
        # =============================================================

        existing_collections = await db.list_collection_names()

        for item in collections:
            collection_name = item["name"]
            documents = item.get("documents", [])

            if collection_name not in existing_collections:
                await db.create_collection(collection_name)
                print(f"Created collection: {collection_name}")
            else:
                print(f"Collection already exists: {collection_name}")

            collection = db[collection_name]

            if collection_name == "DANHGIASP":
                await drop_legacy_feedback_unique_index(collection)

            if collection_name == "DIEMDANHGIA":
                existing_indexes = await collection.list_indexes().to_list(length=50)
                if any(index.get("name") == "uq_diemdanhgia_makynang" for index in existing_indexes):
                    await collection.drop_index("uq_diemdanhgia_makynang")

            # Tạo index (xóa index cũ nếu trùng tên nhưng khác cấu hình)
            for keys, options in indexes.get(collection_name, []):
                index_name = options.get("name")
                if index_name:
                    try:
                        await collection.create_index(keys, **options)
                    except Exception as idx_err:
                        if "IndexKeySpecsConflict" in str(idx_err) or "already exists" in str(idx_err).lower():
                            await collection.drop_index(index_name)
                            await collection.create_index(keys, **options)
                        else:
                            raise
                else:
                    await collection.create_index(keys, **options)

            inserted_count = 0
            updated_count = 0

            # Dùng upsert để chạy script nhiều lần không bị trùng dữ liệu
            for document in documents:
                document_id = document["_id"]

                payload = {
                    key: value
                    for key, value in document.items()
                    if key != "_id"
                }

                set_payload = {}
                set_on_insert_payload = {}
                for k, v in payload.items():
                    if k in ("NgayBatDau", "HanSuDung", "NgayDangKy", "NgayTao", "CreatedAt"):
                        set_on_insert_payload[k] = v
                    else:
                        set_payload[k] = v

                # GOIDV is Admin-managed configuration. Re-running the setup
                # script may add a missing default plan, but must never reset
                # prices, quotas, benefits or status already edited by Admin.
                if collection_name == "GOIDV":
                    set_on_insert_payload = payload
                    set_payload = {}
                
                update_doc = {}
                if set_payload:
                    update_doc["$set"] = set_payload
                if set_on_insert_payload:
                    update_doc["$setOnInsert"] = set_on_insert_payload

                result = await collection.update_one(
                    {"_id": document_id},
                    update_doc,
                    upsert=True
                )

                if collection_name == "GOIDV":
                    await collection.update_one(
                        {"_id": document_id, "SapRaMat": {"$exists": False}},
                        {"$set": {"SapRaMat": payload.get("SapRaMat", "")}},
                    )
                    await collection.update_one(
                        {"_id": document_id, "HanSuDung": {"$ne": payload["HanSuDung"]}},
                        {"$set": {"HanSuDung": payload["HanSuDung"]}},
                    )

                if result.upserted_id is not None:
                    inserted_count += 1
                elif result.modified_count > 0:
                    updated_count += 1

            print(
                f"Seeded {collection_name}: "
                f"inserted={inserted_count}, updated={updated_count}"
            )

        print(
            f"\nDatabase '{MONGODB_DB}' initialized successfully."
        )

    except Exception as error:
        print(f"MongoDB initialization failed: {error}")
        raise

    finally:
        # close() của Motor không phải hàm async
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
