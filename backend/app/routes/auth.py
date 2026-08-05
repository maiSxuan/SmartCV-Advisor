"""Routes for authentication and user sessions."""

from __future__ import annotations

from typing import Any

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.db import db
from app.services.auth_service import (
    find_account_by_email,
    forgot_password,
    login_user,
    logout_user,
    refresh_session,
    register_user,
    resend_verification_email,
    reset_password,
    verify_email,
)
from app.services.product_analytics_service import record_product_event_safely


router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    password_confirmation: str = Field(..., min_length=8, max_length=128)
    terms_accepted: bool
    analytics_session_id: str | None = Field(default=None, max_length=120)
    source: str | None = Field(default=None, max_length=120)
    campaign: str | None = Field(default=None, max_length=160)
    message_variant: str | None = Field(default=None, max_length=160)


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=1, max_length=128)
    remember_me: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=8)


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=8)
    password: str = Field(..., min_length=8, max_length=128)
    password_confirmation: str = Field(..., min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str = Field(..., min_length=32, max_length=256)


class ResendVerificationRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)


@router.post("/register", status_code=status.HTTP_201_CREATED, summary="UC-008: Đăng ký tài khoản")
async def register(payload: RegisterRequest) -> dict[str, Any]:
    result = await register_user(
        db,
        full_name=payload.full_name,
        email=payload.email,
        password=payload.password,
        password_confirmation=payload.password_confirmation,
        terms_accepted=payload.terms_accepted,
    )
    await record_product_event_safely(
        db,
        event_name="registration_completed",
        user_id=result["user"]["user_id"],
        session_id=payload.analytics_session_id,
        source=payload.source,
        campaign=payload.campaign,
        message_variant=payload.message_variant,
    )
    return {
        "data": result["user"],
        "meta": {
            "next_step": "verify_email",
            "message": result["message"],
            "verification_expires_at": result["verification_expires_at"],
        },
        "error": None,
    }


@router.post("/verify-email", summary="Xác thực email đăng ký")
async def verify_email_route(payload: VerifyEmailRequest) -> dict[str, Any]:
    result = await verify_email(db, payload.token)
    return {
        "data": result,
        "meta": {"next_step": "login"},
        "error": None,
    }


@router.post("/resend-verification", summary="Gửi lại email xác thực")
async def resend_verification_route(payload: ResendVerificationRequest) -> dict[str, Any]:
    result = await resend_verification_email(db, payload.email)
    return {
        "data": result,
        "meta": {"next_step": "verify_email"},
        "error": None,
    }


@router.post("/login", summary="UC-009: Đăng nhập")
async def login(payload: LoginRequest) -> dict[str, Any]:
    result = await login_user(
        db,
        email=payload.email,
        password=payload.password,
        remember_me=payload.remember_me,
    )
    return {
        "data": result,
        "meta": {"next_step": "dashboard"},
        "error": None,
    }


@router.post("/refresh", summary="UC-009: Làm mới phiên đăng nhập")
async def refresh(payload: RefreshRequest) -> dict[str, Any]:
    result = await refresh_session(db, payload.refresh_token)
    return {"data": result, "meta": {"next_step": "continue"}, "error": None}


@router.post("/logout", summary="UC-010: Đăng xuất")
async def logout(payload: LogoutRequest) -> dict[str, Any]:
    result = await logout_user(db, payload.refresh_token)
    return {"data": result, "meta": {"next_step": "login"}, "error": None}


@router.post("/forgot-password", summary="UC-009: Quên mật khẩu")
async def forgot_password_route(payload: ForgotPasswordRequest) -> dict[str, Any]:
    result = await forgot_password(db, payload.email)
    return {"data": result, "meta": {"next_step": "reset_password"}, "error": None}


@router.post("/reset-password", summary="UC-009: Tạo mật khẩu mới")
async def reset_password_route(payload: ResetPasswordRequest) -> dict[str, Any]:
    result = await reset_password(
        db,
        token=payload.token,
        password=payload.password,
        password_confirmation=payload.password_confirmation,
    )
    return {"data": result, "meta": {"next_step": "login"}, "error": None}


class CheckEmailRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=254)


@router.post("/check-email", summary="Guest: Kiểm tra email đã có tài khoản chưa để điều hướng đúng")
async def check_email(payload: CheckEmailRequest) -> dict[str, Any]:
    """Trả về exists=True nếu email đã có tài khoản, False nếu chưa.
    Không lộ bất kỳ thông tin user nào. Dùng cho luồng Guest CTA smart routing."""
    account = await find_account_by_email(db, payload.email)
    return {
        "data": {"exists": account is not None},
        "error": None,
    }
