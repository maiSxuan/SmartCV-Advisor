"""Routes for CV analysis history, result detail, and suggestions."""

# Định nghĩa route cho phân tích, so sánh kỹ năng và kết quả.

from fastapi import APIRouter, Depends, HTTPException, Query
from app.db import db  # Import instance kết nối MongoDB
from app.routes.dependencies import get_current_user
from app.services.analysis_service import (
    DATABASE_ERRORS,
    LEGACY_ROLE_ID_ALIASES,
    get_analysis_detail,
    get_role_by_id,
    list_career_roles,
    resolve_quota_state,
)
from app.services.product_analytics_service import record_product_event_safely

router = APIRouter(prefix="/api/v1/analyses", tags=["Analysis"])

@router.get("", summary="UC-024: Xem lịch sử phân tích")
async def get_analysis_history(
    user: dict = Depends(get_current_user),
    limit: int = Query(10, ge=1, le=50)
):
    user_id = user["user_id"]
    
    # Sử dụng Aggregation Pipeline của MongoDB để JOIN bảng KETQUA_PTCV và bảng CV
    pipeline = [
        {
            "$lookup": {
                "from": "CV",
                "localField": "MaCV",
                "foreignField": "_id",
                "as": "cv_info"
            }
        },
        # Chuyển mảng cv_info thành object
        {"$unwind": "$cv_info"},

        {
            "$lookup": {
                "from": "NGANHNGHIET",
                "localField": "MaNganh",
                "foreignField": "_id",
                "as": "role_info"
            }
        },
        {"$unwind": {"path": "$role_info", "preserveNullAndEmptyArrays": True}},
        
        # Chỉ lấy CV của user hiện tại đang đăng nhập
        {"$match": {"cv_info.MaKH": user_id}},
        
        # Sắp xếp mới nhất lên đầu
        {"$sort": {"ThoiDiemPT": -1}},
        
        # Format lại dữ liệu trả về cho Frontend
        {
            "$project": {
                "_id": 0,
                "analysis_id": "$_id",
                "cv_id": "$cv_info._id",
                "cv_name": "$cv_info.TenFileGoc",
                "overall_score": "$DiemTongQuan",
                "classification": "$XepLoai",
                "role_id": {"$ifNull": ["$MaNganh", "$cv_info.MaNganh"]},
                "role_name": "$role_info.TenNganh",
                "created_at": "$ThoiDiemPT",
                "status": "$cv_info.TrangThai"
            }
        }
    ]
    
    # Thực thi truy vấn với AsyncIOMotorClient
    try:
        cursor = db["KETQUA_PTCV"].aggregate(pipeline)
        # Lịch sử không phải quyền lợi Premium: trả toàn bộ cho mọi gói.
        history_list = await cursor.to_list(length=None)
    except DATABASE_ERRORS:
        return {
            "data": [],
            "access_level": user["current_plan"],
            "meta": {
                "visible_count": 0,
                "locked_count": 0,
                "free_history_limit": 3
            },
            "message": "Chưa kết nối được cơ sở dữ liệu lịch sử phân tích."
        }
    
    # Format datetime object sang ISO string cho JSON response
    for item in history_list:
        if hasattr(item["created_at"], "isoformat"):
            item["created_at"] = item["created_at"].isoformat()

    if any(not item.get("role_name") and item.get("role_id") for item in history_list):
        roles = await list_career_roles(db)
        role_name_by_id = {role["role_id"]: role["name"] for role in roles}
        for item in history_list:
            if not item.get("role_name") and item.get("role_id"):
                resolved_role_id = LEGACY_ROLE_ID_ALIASES.get(item["role_id"], item["role_id"])
                item["role_name"] = role_name_by_id.get(resolved_role_id)

    return {
        "data": history_list,
        "access_level": user["current_plan"],
        "meta": {
            "visible_count": len(history_list),
            "locked_count": 0,
            "free_history_limit": 3
        },
        "message": "Toàn bộ lịch sử phân tích được hiển thị cho cả gói Free và Premium."
    }

@router.get("/{analysis_id}", summary="UC-015: Xem điểm tổng quan, điểm thành phần và lỗi cơ bản")
async def get_analysis_result(analysis_id: str, user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    effective_plan = user.get("current_plan")
    if user.get("role") != "admin":
        quota_state = await resolve_quota_state(db, user["user_id"], datetime.now(timezone.utc))
        effective_plan = quota_state["account_type"]
    detail = await get_analysis_detail(
        db=db,
        analysis_id=analysis_id,
        user_id=user["user_id"],
        current_plan=effective_plan,
        allow_admin=user.get("role") == "admin",
    )
    if not detail.get("role_name") and detail.get("role_id"):
        try:
            role = await get_role_by_id(db, detail["role_id"])
            detail["role_name"] = role["name"]
            detail["role_description"] = role["description"]
        except HTTPException:
            pass
    # The result payload already contains the actionable suggestions shown by
    # AnalysisResultPage, so this is the real "view suggestions" funnel step.
    if user.get("role") != "admin":
        await record_product_event_safely(
            db,
            event_name="suggestions_viewed",
            user_id=user["user_id"],
            analysis_id=analysis_id,
            role_id=detail.get("role_id"),
        )
    return {"data": detail, "access_level": effective_plan, "error": None}

@router.get("/{analysis_id}/suggestions", summary="UC-016: Xem gợi ý cải thiện CV")
async def get_suggestions(analysis_id: str, user: dict = Depends(get_current_user)):
    from datetime import datetime, timezone

    effective_plan = user.get("current_plan")
    if user.get("role") != "admin":
        quota_state = await resolve_quota_state(db, user["user_id"], datetime.now(timezone.utc))
        effective_plan = quota_state["account_type"]
    # Ownership is checked before exposing suggestions or recording analytics.
    detail = await get_analysis_detail(
        db=db,
        analysis_id=analysis_id,
        user_id=user["user_id"],
        current_plan=effective_plan,
        allow_admin=user.get("role") == "admin",
    )
    # Truy xuất trực tiếp các gợi ý từ collection GOIY_CAITHIEN
    cursor = db["GOIY_CAITHIEN"].find({"MaKQ": analysis_id}).sort("DoUuTien", 1)
    suggestions_from_db = await cursor.to_list(length=100)
    
    if not suggestions_from_db:
        raise HTTPException(status_code=404, detail="Không tìm thấy gợi ý nào cho kết quả này.")

    formatted_suggestions = []
    for sug in suggestions_from_db:
        formatted_sug = {
            "suggestion_id": sug["_id"],
            "category": sug.get("Loai", "Nội dung"),
            "issue": sug.get("MoTaVanDe", ""),
            "basic_fix": sug.get("GiaiPhap", ""),
            # Nếu database chưa seed trường example_rewrite, mình fallback một chuỗi mặc định
            "premium_rewrite": sug.get("example_rewrite", "Đây là câu mẫu VIP từ AI (Chuẩn STAR)..."), 
            "is_premium": sug.get("is_premium", False)
        }
        
        # Ràng buộc phân quyền nội dung: khóa premium_rewrite nếu user đang dùng gói Free
        if formatted_sug["is_premium"] and effective_plan != "premium":
            formatted_sug["premium_rewrite"] = "Tính năng khóa. Vui lòng nâng cấp Premium để xem câu mẫu chuẩn ATS."
            
        formatted_suggestions.append(formatted_sug)

    if user.get("role") != "admin":
        await record_product_event_safely(
            db,
            event_name="suggestions_viewed",
            user_id=user["user_id"],
            analysis_id=analysis_id,
            role_id=detail.get("role_id"),
        )

    return {"data": formatted_suggestions, "access_level": effective_plan}
