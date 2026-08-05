# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from .db import db

# app = FastAPI(
#     title="SmartCV Advisor API",
#     version="0.1.0",
# )
# # Cho phép frontend React/Vite gọi backend
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# @app.get("/")
# def home() -> dict[str, str]:
#     return {
#         "message": "SmartCV Advisor Backend đang hoạt động"
#     }


# @app.get("/api/health")
# def health_check() -> dict[str, str]:
#     return {
#         "status": "ok"
#     }

#############################BÊN DƯỚI LÀ ĐĂNG KHOA CẬP NHẬT VÀO LÚC 1:06PM 19/07/2026
import os
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .db import MONGODB_DB, db
from .services.analysis_service import DATABASE_ERRORS
from .services.database_bootstrap import ensure_default_service_plans, ensure_mvp_collections
from .services.email_service import is_email_delivery_configured
from .services.gpt_service import OPENAI_IMAGE_MODEL, OPENAI_MODEL, is_gpt_configured

# 1. Import các router ông vừa viết
from .routes import admin, admin_plans, analysis, analytics, auth, cv, feedback, premium, user

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
DEFAULT_CORS_ORIGIN_REGEX = r"^http://(localhost|127\.0\.0\.1):517[0-9]$"


def get_cors_origins() -> list[str]:
    raw_origins = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
    if not raw_origins:
        return DEFAULT_CORS_ORIGINS

    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


app = FastAPI(
    title="SmartCV Advisor API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_origin_regex=os.getenv("CORS_ALLOW_ORIGIN_REGEX", DEFAULT_CORS_ORIGIN_REGEX),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Đăng ký (include) các router này vào app chính
app.include_router(analysis.router)
app.include_router(admin.router)
app.include_router(admin_plans.router)
app.include_router(analytics.router)
app.include_router(analytics.admin_router)
app.include_router(auth.router)
app.include_router(cv.router)
app.include_router(cv.career_role_router)
app.include_router(feedback.router)
app.include_router(premium.router)
app.include_router(user.router)


@app.on_event("startup")
async def bootstrap_mvp_database() -> None:
    """Create the Step-4 collections/indexes when MongoDB is reachable."""
    try:
        await ensure_mvp_collections(db)
        await ensure_default_service_plans(db)
        app.state.database_bootstrap_error = None
    except DATABASE_ERRORS as exc:
        # Keep the health endpoint available in degraded mode. Write paths call
        # the bootstrap again before relying on a uniqueness constraint.
        app.state.database_bootstrap_error = exc.__class__.__name__


@app.get("/")
def home() -> dict[str, str]:
    return {
        "message": "SmartCV Advisor Backend đang hoạt động"
    }


@app.get("/api/health")
async def health_check() -> dict[str, Any]:
    database = {
        "available": True,
        "name": MONGODB_DB,
        "error": None,
        "bootstrap_error": getattr(app.state, "database_bootstrap_error", None),
    }
    try:
        await db.command("ping")
    except DATABASE_ERRORS as exc:
        database = {
            "available": False,
            "name": MONGODB_DB,
            "error": exc.__class__.__name__,
            "bootstrap_error": getattr(app.state, "database_bootstrap_error", None),
        }

    return {
        "status": "ok" if database["available"] and not database["bootstrap_error"] else "degraded",
        "database": database,
        "email": {
            "provider": "smtp",
            "configured": is_email_delivery_configured(),
        },
        "gpt": {
            "configured": is_gpt_configured(),
            "text_model": OPENAI_MODEL,
            "image_model": OPENAI_IMAGE_MODEL,
        },
        "ocr": {
            "provider": "gpt_image_model",
            "configured": is_gpt_configured(),
            "image_model": OPENAI_IMAGE_MODEL,
        },
    }
