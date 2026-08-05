"""Authentication service for UC-008, UC-009, and UC-010."""

from __future__ import annotations

import base64
import hashlib
import hmac
import html
import os
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode
from uuid import uuid4

import jwt
from fastapi import HTTPException, status

from app.services.analysis_service import DATABASE_ERRORS
from app.services.email_service import (
    EmailConfigurationError,
    EmailDeliveryError,
    ensure_email_delivery_configured,
    send_auth_email,
)


JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "smartcv-local-development-only-change-this-key",
)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
# User and Admin access sessions share the same one-day lifetime.  Deployments
# can still override this explicitly when their security policy requires it.
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "1440"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))
REMEMBER_ME_REFRESH_DAYS = int(os.getenv("REMEMBER_ME_REFRESH_DAYS", "30"))
TEMP_LOCK_MINUTES = int(os.getenv("AUTH_TEMP_LOCK_MINUTES", "15"))
MAX_FAILED_LOGIN_ATTEMPTS = int(os.getenv("AUTH_MAX_FAILED_LOGIN_ATTEMPTS", "5"))
PASSWORD_RESET_TOKEN_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_MINUTES", "30"))
EMAIL_VERIFICATION_TOKEN_MINUTES = int(
    os.getenv("EMAIL_VERIFICATION_TOKEN_MINUTES", os.getenv("EMAIL_TOKEN_MINUTES", "30"))
)
VERIFICATION_RESEND_COOLDOWN_SECONDS = int(os.getenv("AUTH_EMAIL_RESEND_COOLDOWN_SECONDS", "60"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").strip().rstrip("/")
PASSWORD_HASH_PREFIX = "scrypt"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: Any) -> datetime | None:
    """Normalize MongoDB datetimes, which may be returned without tzinfo."""

    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def is_expired(value: Any, *, now: datetime | None = None) -> bool:
    normalized = as_utc(value)
    return normalized is None or normalized <= (now or utc_now())


def normalize_email(email: str) -> str:
    return email.strip().lower()


def is_valid_email(email: str) -> bool:
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email.strip()) is not None


def validate_password_strength(password: str) -> None:
    has_letter = re.search(r"[A-Za-zÀ-ỹ]", password) is not None
    has_digit = re.search(r"\d", password) is not None
    if len(password) < 8 or not has_letter or not has_digit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "AUTH_PASSWORD_WEAK",
                "message": "Mật khẩu phải có tối thiểu 8 ký tự, bao gồm chữ và số.",
            },
        )


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not local or not domain:
        return email
    visible = local[0]
    return f"{visible}{'*' * max(2, len(local) - 1)}@{domain}"


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def is_email_verified(account: dict[str, Any]) -> bool:
    """Keep legacy active accounts usable while enforcing new registrations.

    EmailVerified did not exist in the original data model.  A missing field is
    therefore treated as a verified legacy account, while an explicit False is
    always treated as an unverified new account.
    """

    if account.get("Role") == "admin" or account.get("MaADM"):
        return True
    if "EmailVerified" not in account:
        return True
    return account.get("EmailVerified") is True


def auth_email_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, EmailConfigurationError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "AUTH_EMAIL_NOT_CONFIGURED",
                "message": "Dịch vụ email chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
            },
        )
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "code": "AUTH_EMAIL_DELIVERY_FAILED",
            "message": "Chưa thể gửi email. Vui lòng thử lại sau.",
        },
    )


def frontend_link(path: str, **query: str) -> str:
    return f"{FRONTEND_URL}/{path.lstrip('/')}?{urlencode(query)}"


async def send_verification_email(*, email: str, full_name: str, token: str) -> None:
    verification_url = frontend_link("verify-email", token=token, email=email)
    safe_name = html.escape(full_name or "bạn")
    safe_url = html.escape(verification_url, quote=True)
    expiry_minutes = EMAIL_VERIFICATION_TOKEN_MINUTES
    await send_auth_email(
        recipient=email,
        subject="Xác thực tài khoản SmartCV Advisor",
        text_body=(
            f"Xin chào {full_name or 'bạn'},\n\n"
            "Vui lòng xác thực địa chỉ email để kích hoạt tài khoản SmartCV Advisor:\n"
            f"{verification_url}\n\n"
            f"Liên kết có hiệu lực trong {expiry_minutes} phút. "
            "Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này."
        ),
        html_body=(
            "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#0f172a\">"
            f"<h2>Xin chào {safe_name},</h2>"
            "<p>Vui lòng xác thực địa chỉ email để kích hoạt tài khoản SmartCV Advisor.</p>"
            f"<p><a href=\"{safe_url}\" style=\"display:inline-block;padding:12px 20px;"
            "background:#2563eb;color:#fff;text-decoration:none;border-radius:10px\">"
            "Xác thực email</a></p>"
            f"<p>Liên kết có hiệu lực trong {expiry_minutes} phút.</p>"
            "<p>Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.</p>"
            "</div>"
        ),
    )


async def send_password_reset_email(*, email: str, full_name: str, token: str) -> None:
    reset_url = frontend_link("reset-password", token=token, email=email)
    safe_name = html.escape(full_name or "bạn")
    safe_url = html.escape(reset_url, quote=True)
    expiry_minutes = PASSWORD_RESET_TOKEN_MINUTES
    await send_auth_email(
        recipient=email,
        subject="Đặt lại mật khẩu SmartCV Advisor",
        text_body=(
            f"Xin chào {full_name or 'bạn'},\n\n"
            "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn:\n"
            f"{reset_url}\n\n"
            f"Liên kết có hiệu lực trong {expiry_minutes} phút và chỉ dùng được một lần. "
            "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email."
        ),
        html_body=(
            "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#0f172a\">"
            f"<h2>Xin chào {safe_name},</h2>"
            "<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>"
            f"<p><a href=\"{safe_url}\" style=\"display:inline-block;padding:12px 20px;"
            "background:#2563eb;color:#fff;text-decoration:none;border-radius:10px\">"
            "Đặt lại mật khẩu</a></p>"
            f"<p>Liên kết có hiệu lực trong {expiry_minutes} phút và chỉ dùng được một lần.</p>"
            "<p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>"
            "</div>"
        ),
    )


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    key = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return "$".join(
        [
            PASSWORD_HASH_PREFIX,
            "16384",
            "8",
            "1",
            base64.urlsafe_b64encode(salt).decode("ascii"),
            base64.urlsafe_b64encode(key).decode("ascii"),
        ]
    )


def verify_password(password: str, stored_hash: str | None) -> bool:
    if not stored_hash or not stored_hash.startswith(f"{PASSWORD_HASH_PREFIX}$"):
        return False

    try:
        _, n_value, r_value, p_value, salt_value, hash_value = stored_hash.split("$", 5)
        salt = base64.urlsafe_b64decode(salt_value.encode("ascii"))
        expected = base64.urlsafe_b64decode(hash_value.encode("ascii"))
        actual = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=int(n_value),
            r=int(r_value),
            p=int(p_value),
            dklen=len(expected),
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def account_query_by_email(email: str) -> dict[str, Any]:
    normalized = normalize_email(email)
    return {
        "$or": [
            {"EmailNormalized": normalized},
            {"Email": {"$regex": f"^{re.escape(normalized)}$", "$options": "i"}},
        ]
    }


def public_user(customer: dict[str, Any] | None, account: dict[str, Any]) -> dict[str, Any]:
    role = account.get("Role") or ("admin" if account.get("MaADM") else "registered")
    plan = "admin" if role == "admin" else str((customer or {}).get("LoaiKH", "registered")).lower()
    return {
        "user_id": account.get("MaKH") or account.get("MaADM"),
        "account_id": account.get("_id"),
        "full_name": (customer or {}).get("HoTen") or account.get("HoTen") or account.get("Email"),
        "email": account.get("Email"),
        "role": role,
        "account_type": plan,
        "status": account.get("TrangThai", "active"),
        "email_verified": is_email_verified(account),
    }


async def find_account_by_email(db: Any, email: str) -> dict[str, Any] | None:
    return await db["TAIKHOAN"].find_one(account_query_by_email(email))


async def find_customer_for_account(db: Any, account: dict[str, Any]) -> dict[str, Any] | None:
    if account.get("MaKH"):
        return await db["KHACHHANG"].find_one({"_id": account["MaKH"]})
    if account.get("MaADM"):
        return await db["ADMIN"].find_one({"_id": account["MaADM"]})
    return None


def issue_access_token(account: dict[str, Any]) -> tuple[str, datetime]:
    expires_at = utc_now() + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {
        "sub": account["_id"],
        "user_id": account.get("MaKH") or account.get("MaADM"),
        "role": account.get("Role") or ("admin" if account.get("MaADM") else "registered"),
        "type": "access",
        "auth_version": int(account.get("AuthVersion", 0) or 0),
        "exp": expires_at,
        "iat": utc_now(),
        "jti": uuid4().hex,
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM), expires_at


async def issue_refresh_token(db: Any, account: dict[str, Any], remember_me: bool) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(48)
    expires_at = utc_now() + timedelta(days=REMEMBER_ME_REFRESH_DAYS if remember_me else REFRESH_TOKEN_DAYS)
    await db["REFRESH_TOKENS"].insert_one(
        {
            "_id": f"RT_{uuid4().hex[:16].upper()}",
            "TokenHash": token_hash(token),
            "MaTK": account["_id"],
            "MaKH": account.get("MaKH"),
            "MaADM": account.get("MaADM"),
            "CreatedAt": utc_now(),
            "ExpiresAt": expires_at,
            "RevokedAt": None,
            "RememberMe": remember_me,
        }
    )
    return token, expires_at


async def build_session_response(db: Any, account: dict[str, Any], remember_me: bool) -> dict[str, Any]:
    customer = await find_customer_for_account(db, account)
    access_token, access_expires_at = issue_access_token(account)
    refresh_token, refresh_expires_at = await issue_refresh_token(db, account, remember_me)
    return {
        "user": public_user(customer, account),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_at": access_expires_at,
        "refresh_expires_at": refresh_expires_at,
    }


def ensure_account_can_login(account: dict[str, Any]) -> None:
    locked_until = as_utc(account.get("LockedUntil"))
    if locked_until and locked_until > utc_now():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "AUTH_ACCOUNT_TEMP_LOCKED",
                "message": "Tài khoản của bạn đã bị tạm khóa.",
                "locked_until": locked_until,
            },
        )

    status_value = str(account.get("TrangThai", "active")).lower()
    if status_value in {"locked", "khoa", "khóa", "da_khoa", "đã khóa"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "AUTH_ACCOUNT_LOCKED", "message": "Tài khoản của bạn đã bị tạm khóa."},
        )


async def register_user(
    db: Any,
    *,
    full_name: str,
    email: str,
    password: str,
    password_confirmation: str,
    terms_accepted: bool,
) -> dict[str, Any]:
    normalized_email = normalize_email(email)
    clean_name = full_name.strip()

    if not clean_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH_REQUIRED_FIELD", "message": "Vui lòng nhập đầy đủ thông tin bắt buộc."},
        )
    if not is_valid_email(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH_EMAIL_INVALID", "message": "Email không đúng định dạng."},
        )
    if password != password_confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH_PASSWORD_MISMATCH", "message": "Mật khẩu xác nhận không khớp."},
        )
    if not terms_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH_TERMS_REQUIRED", "message": "Bạn cần đồng ý với điều khoản để đăng ký."},
        )
    validate_password_strength(password)

    try:
        existing_account = await find_account_by_email(db, normalized_email)
        if existing_account:
            if not is_email_verified(existing_account):
                existing_expiry = as_utc(existing_account.get("EmailVerificationExpiresAt"))
                last_sent_at = as_utc(existing_account.get("VerificationEmailLastSentAt"))
                customer = await find_customer_for_account(db, existing_account)

                # A successful email is already in flight. Treat a repeated
                # form submission as idempotent instead of returning 409.
                if last_sent_at and existing_expiry and existing_expiry > utc_now():
                    return {
                        "user": public_user(customer, existing_account),
                        "message": "Tài khoản đang chờ xác thực. Vui lòng kiểm tra hộp thư hoặc thư rác.",
                        "verification_expires_at": existing_expiry,
                    }

                # If the first SMTP delivery failed after the pending account
                # was persisted, a retry issues a fresh token and sends again.
                resend_result = await resend_verification_email(db, normalized_email)
                return {
                    "user": public_user(customer, existing_account),
                    "message": resend_result["message"],
                    "verification_expires_at": resend_result.get("expires_at") or existing_expiry,
                }
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "AUTH_EMAIL_EXISTS", "message": "Email này đã được sử dụng."},
            )

        # Validate configuration before inserting an account that could not be
        # activated.  Actual network delivery happens only after the token is
        # safely persisted.
        ensure_email_delivery_configured()

        now = utc_now()
        customer_id = f"KH_{uuid4().hex[:10].upper()}"
        account_id = f"TK_{customer_id}"
        verification_token = secrets.token_urlsafe(48)
        verification_expires_at = now + timedelta(minutes=EMAIL_VERIFICATION_TOKEN_MINUTES)

        customer = {
            "_id": customer_id,
            "HoTen": clean_name,
            "Email": normalized_email,
            "EmailNormalized": normalized_email,
            "TrangThai": "Chờ xác thực email",
            "LoaiKH": "registered",
            "TrinhDoHV": "",
            "ViTriNN": "",
            "NNQuanTam": "",
            "AvatarUrl": None,
            "NgayDangKy": now,
            "NgayCapNhat": now,
        }
        account = {
            "_id": account_id,
            "Email": normalized_email,
            "EmailNormalized": normalized_email,
            "MatKhauHash": hash_password(password),
            "MaKH": customer_id,
            "Role": "registered",
            "TrangThai": "pending_verification",
            "EmailVerified": False,
            "VerifiedAt": None,
            "EmailVerificationTokenHash": token_hash(verification_token),
            "EmailVerificationExpiresAt": verification_expires_at,
            "VerificationEmailLastSentAt": None,
            "FailedLoginCount": 0,
            "LockedUntil": None,
            "AuthVersion": 0,
            "CreatedAt": now,
            "UpdatedAt": now,
        }

        await db["KHACHHANG"].insert_one(customer)
        await db["TAIKHOAN"].insert_one(account)
        await send_verification_email(
            email=normalized_email,
            full_name=clean_name,
            token=verification_token,
        )
        sent_at = utc_now()
        await db["TAIKHOAN"].update_one(
            {"_id": account_id},
            {"$set": {"VerificationEmailLastSentAt": sent_at, "UpdatedAt": sent_at}},
        )
        account["VerificationEmailLastSentAt"] = sent_at
        account["UpdatedAt"] = sent_at
        await db["LOG_KH"].insert_one(
            {
                "_id": f"LOG_{account_id}_{uuid4().hex[:8].upper()}",
                "HanhDong": "Đăng ký tài khoản - chờ xác thực email",
                "DuLieuTruoc": None,
                "DuLieuSau": {"Email": normalized_email, "TrangThai": "pending_verification"},
                "KetQua": "Thanh cong",
                "ThoiDiemThucHien": now,
                "MaKH": customer_id,
                "DoiTuong": "TAIKHOAN",
                "MaDoiTuong": account_id,
            }
        )
    except HTTPException:
        raise
    except (EmailConfigurationError, EmailDeliveryError) as exc:
        raise auth_email_http_error(exc) from exc
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa tạo được tài khoản vì MongoDB chưa sẵn sàng."},
        ) from exc

    return {
        "user": public_user(customer, account),
        "message": "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
        "verification_expires_at": verification_expires_at,
    }


async def verify_email(db: Any, token: str) -> dict[str, Any]:
    """Activate a newly registered account using a one-time email token."""

    digest = token_hash(token.strip())
    try:
        account = await db["TAIKHOAN"].find_one(
            {
                "$or": [
                    {"EmailVerificationTokenHash": digest},
                    {"LastEmailVerificationTokenHash": digest},
                ]
            }
        )
        if not account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "AUTH_VERIFICATION_INVALID",
                    "message": "Liên kết xác thực không hợp lệ hoặc đã được sử dụng.",
                },
            )
        # Opening the same link twice (for example, React Strict Mode issuing a
        # development retry) is safe and idempotent.  The token can no longer
        # change account state, but the user still sees the successful result.
        if (
            account.get("LastEmailVerificationTokenHash") == digest
            and is_email_verified(account)
        ):
            customer = await find_customer_for_account(db, account)
            return {
                "message": "Email đã được xác thực. Bạn có thể đăng nhập.",
                "user": public_user(customer, account),
            }
        if is_expired(account.get("EmailVerificationExpiresAt")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "AUTH_VERIFICATION_EXPIRED",
                    "message": "Liên kết xác thực đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực.",
                    "email_masked": mask_email(str(account.get("Email", ""))),
                    "can_resend": True,
                },
            )

        now = utc_now()
        verification_result = await db["TAIKHOAN"].update_one(
            {"_id": account["_id"], "EmailVerificationTokenHash": digest},
            {
                "$set": {
                    "EmailVerified": True,
                    "VerifiedAt": now,
                    "TrangThai": "active",
                    "LastEmailVerificationTokenHash": digest,
                    "EmailVerificationConsumedAt": now,
                    "UpdatedAt": now,
                },
                "$unset": {
                    "EmailVerificationTokenHash": "",
                    "EmailVerificationExpiresAt": "",
                },
            },
        )
        if getattr(verification_result, "matched_count", 1) == 0:
            # A concurrent request may have consumed the token after our read.
            # Treat that completed verification as an idempotent success.
            concurrently_verified = await db["TAIKHOAN"].find_one(
                {"LastEmailVerificationTokenHash": digest, "EmailVerified": True}
            )
            if not concurrently_verified:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={
                        "code": "AUTH_VERIFICATION_INVALID",
                        "message": "Liên kết xác thực không hợp lệ hoặc đã được sử dụng.",
                    },
                )
            account = concurrently_verified
        if account.get("MaKH"):
            await db["KHACHHANG"].update_one(
                {"_id": account["MaKH"]},
                {"$set": {"TrangThai": "Hoạt động", "NgayCapNhat": now}},
            )

        fresh_account = await db["TAIKHOAN"].find_one({"_id": account["_id"]}) or {
            **account,
            "EmailVerified": True,
            "VerifiedAt": now,
            "TrangThai": "active",
        }
        customer = await find_customer_for_account(db, fresh_account)
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_UNAVAILABLE",
                "message": "Chưa xác thực được email vì MongoDB chưa sẵn sàng.",
            },
        ) from exc

    return {
        "message": "Xác thực email thành công. Bạn có thể đăng nhập.",
        "user": public_user(customer, fresh_account),
    }


async def resend_verification_email(db: Any, email: str) -> dict[str, Any]:
    """Issue a fresh verification token for an unverified account."""

    normalized_email = normalize_email(email)
    if not is_valid_email(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH_EMAIL_INVALID", "message": "Email không đúng định dạng."},
        )

    try:
        account = await find_account_by_email(db, normalized_email)
        if not account:
            return {
                "message": "Nếu tài khoản tồn tại và chưa xác thực, email xác thực mới sẽ được gửi.",
                "email_masked": mask_email(normalized_email),
            }
        if is_email_verified(account):
            return {
                "message": "Email đã được xác thực. Bạn có thể đăng nhập.",
                "email_masked": mask_email(normalized_email),
            }

        ensure_email_delivery_configured()
        now = utc_now()
        last_sent_at = as_utc(account.get("VerificationEmailLastSentAt"))
        if last_sent_at:
            retry_after = VERIFICATION_RESEND_COOLDOWN_SECONDS - int((now - last_sent_at).total_seconds())
            if retry_after > 0:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={
                        "code": "AUTH_VERIFICATION_RATE_LIMITED",
                        "message": "Vui lòng chờ trước khi yêu cầu gửi lại email xác thực.",
                        "retry_after_seconds": retry_after,
                    },
                )

        verification_token = secrets.token_urlsafe(48)
        expires_at = now + timedelta(minutes=EMAIL_VERIFICATION_TOKEN_MINUTES)
        await db["TAIKHOAN"].update_one(
            {"_id": account["_id"]},
            {
                "$set": {
                    "EmailVerificationTokenHash": token_hash(verification_token),
                    "EmailVerificationExpiresAt": expires_at,
                    "UpdatedAt": now,
                }
            },
        )
        customer = await find_customer_for_account(db, account)
        await send_verification_email(
            email=normalized_email,
            full_name=str((customer or {}).get("HoTen") or account.get("HoTen") or "bạn"),
            token=verification_token,
        )
        sent_at = utc_now()
        await db["TAIKHOAN"].update_one(
            {"_id": account["_id"]},
            {"$set": {"VerificationEmailLastSentAt": sent_at, "UpdatedAt": sent_at}},
        )
    except HTTPException:
        raise
    except (EmailConfigurationError, EmailDeliveryError) as exc:
        raise auth_email_http_error(exc) from exc
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "DATABASE_UNAVAILABLE",
                "message": "Chưa gửi lại được email xác thực vì MongoDB chưa sẵn sàng.",
            },
        ) from exc

    return {
        "message": "Email xác thực mới đã được gửi. Vui lòng kiểm tra hộp thư.",
        "email_masked": mask_email(normalized_email),
        "expires_at": expires_at,
    }


async def login_user(db: Any, *, email: str, password: str, remember_me: bool) -> dict[str, Any]:
    normalized_email = normalize_email(email)
    if not is_valid_email(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH_EMAIL_INVALID", "message": "Email không đúng định dạng."},
        )

    try:
        account = await find_account_by_email(db, normalized_email)
        if not account:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "AUTH_INVALID_CREDENTIALS", "message": "Thông tin đăng nhập không chính xác."},
            )

        ensure_account_can_login(account)
        stored_hash = account.get("MatKhauHash") or account.get("Matkhau")
        if not verify_password(password, stored_hash):
            failed_count = int(account.get("FailedLoginCount", 0) or 0) + 1
            updates: dict[str, Any] = {"FailedLoginCount": failed_count, "UpdatedAt": utc_now()}
            if failed_count >= MAX_FAILED_LOGIN_ATTEMPTS:
                updates["LockedUntil"] = utc_now() + timedelta(minutes=TEMP_LOCK_MINUTES)
            await db["TAIKHOAN"].update_one({"_id": account["_id"]}, {"$set": updates})
            if failed_count >= MAX_FAILED_LOGIN_ATTEMPTS:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "AUTH_ACCOUNT_TEMP_LOCKED",
                        "message": "Tài khoản của bạn đã bị tạm khóa.",
                        "attempts": failed_count,
                    },
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "AUTH_INVALID_CREDENTIALS",
                    "message": "Thông tin đăng nhập không chính xác.",
                    "attempts_remaining": max(0, MAX_FAILED_LOGIN_ATTEMPTS - failed_count),
                },
            )

        if not is_email_verified(account):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "AUTH_EMAIL_UNVERIFIED",
                    "message": "Tài khoản chưa được xác thực. Vui lòng kiểm tra email hoặc gửi lại email xác thực.",
                    "email_masked": mask_email(normalized_email),
                    "can_resend": True,
                },
            )

        now = utc_now()
        login_updates: dict[str, Any] = {"FailedLoginCount": 0, "LockedUntil": None, "LastLoginAt": now, "UpdatedAt": now}
        # Accounts created before email verification was introduced do not
        # have the field.  Migrate them lazily without blocking existing users.
        if "EmailVerified" not in account:
            login_updates.update({"EmailVerified": True, "VerifiedAt": now, "TrangThai": "active"})
        await db["TAIKHOAN"].update_one(
            {"_id": account["_id"]},
            {"$set": login_updates},
        )
        if account.get("MaKH"):
            await db["KHACHHANG"].update_one(
                {"_id": account["MaKH"]},
                {"$set": {"LanDangNhapCuoi": now, "TrangThai": "Hoạt động"}},
            )

        fresh_account = await db["TAIKHOAN"].find_one({"_id": account["_id"]}) or account
        return await build_session_response(db, fresh_account, remember_me)
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa đăng nhập được vì MongoDB chưa sẵn sàng."},
        ) from exc


async def refresh_session(db: Any, refresh_token: str) -> dict[str, Any]:
    digest = token_hash(refresh_token)
    try:
        token_doc = await db["REFRESH_TOKENS"].find_one(
            {"TokenHash": digest, "RevokedAt": None, "ExpiresAt": {"$gt": utc_now()}}
        )
        if not token_doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "AUTH_REFRESH_INVALID", "message": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."},
            )

        account = await db["TAIKHOAN"].find_one({"_id": token_doc["MaTK"]})
        if not account:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "AUTH_REFRESH_INVALID", "message": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."},
            )
        ensure_account_can_login(account)

        await db["REFRESH_TOKENS"].update_one({"_id": token_doc["_id"]}, {"$set": {"RevokedAt": utc_now()}})
        return await build_session_response(db, account, bool(token_doc.get("RememberMe")))
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa làm mới phiên vì MongoDB chưa sẵn sàng."},
        ) from exc


async def logout_user(db: Any, refresh_token: str | None) -> dict[str, str]:
    if refresh_token:
        try:
            await db["REFRESH_TOKENS"].update_many(
                {"TokenHash": token_hash(refresh_token), "RevokedAt": None},
                {"$set": {"RevokedAt": utc_now()}},
            )
        except DATABASE_ERRORS as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa đăng xuất được vì MongoDB chưa sẵn sàng."},
            ) from exc
    return {"message": "Đăng xuất thành công."}


async def forgot_password(db: Any, email: str) -> dict[str, Any]:
    normalized_email = normalize_email(email)
    if not is_valid_email(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH_EMAIL_INVALID", "message": "Email không đúng định dạng."},
        )

    expires_at = utc_now() + timedelta(minutes=PASSWORD_RESET_TOKEN_MINUTES)
    try:
        account = await find_account_by_email(db, normalized_email)
        if account:
            ensure_email_delivery_configured()
            reset_token = secrets.token_urlsafe(48)
            now = utc_now()
            expires_at = now + timedelta(minutes=PASSWORD_RESET_TOKEN_MINUTES)
            await db["TAIKHOAN"].update_one(
                {"_id": account["_id"]},
                {
                    "$set": {
                        "PasswordResetTokenHash": token_hash(reset_token),
                        "PasswordResetExpiresAt": expires_at,
                        "UpdatedAt": now,
                    }
                },
            )
            customer = await find_customer_for_account(db, account)
            await send_password_reset_email(
                email=normalized_email,
                full_name=str((customer or {}).get("HoTen") or account.get("HoTen") or "bạn"),
                token=reset_token,
            )
            sent_at = utc_now()
            await db["TAIKHOAN"].update_one(
                {"_id": account["_id"]},
                {"$set": {"PasswordResetEmailSentAt": sent_at, "UpdatedAt": sent_at}},
            )
    except (EmailConfigurationError, EmailDeliveryError) as exc:
        raise auth_email_http_error(exc) from exc
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa gửi được liên kết đặt lại mật khẩu vì MongoDB chưa sẵn sàng."},
        ) from exc

    return {
        # Keep the same response for known and unknown addresses to prevent
        # account enumeration from the forgot-password endpoint.
        "message": "Nếu email đã đăng ký, liên kết đặt lại mật khẩu sẽ được gửi. Vui lòng kiểm tra hộp thư.",
        "email_masked": mask_email(normalized_email),
        "delivery": "smtp_email_sent_if_account_exists",
        "expires_at": expires_at,
    }


async def reset_password(
    db: Any,
    *,
    token: str,
    password: str,
    password_confirmation: str,
) -> dict[str, str]:
    if password != password_confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "AUTH_PASSWORD_MISMATCH", "message": "Mật khẩu xác nhận không khớp."},
        )
    validate_password_strength(password)

    try:
        reset_token_hash = token_hash(token)
        account = await db["TAIKHOAN"].find_one({"PasswordResetTokenHash": reset_token_hash})
        if not account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "AUTH_RESET_INVALID", "message": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."},
            )
        expires_at = account.get("PasswordResetExpiresAt")
        if is_expired(expires_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "AUTH_RESET_EXPIRED", "message": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."},
            )

        reset_result = await db["TAIKHOAN"].update_one(
            {"_id": account["_id"], "PasswordResetTokenHash": reset_token_hash},
            {
                "$set": {"MatKhauHash": hash_password(password), "FailedLoginCount": 0, "LockedUntil": None, "UpdatedAt": utc_now()},
                "$unset": {"PasswordResetTokenHash": "", "PasswordResetExpiresAt": ""},
                "$inc": {"AuthVersion": 1},
            },
        )
        if getattr(reset_result, "matched_count", 1) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "AUTH_RESET_INVALID",
                    "message": "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.",
                },
            )
        await db["REFRESH_TOKENS"].update_many(
            {"MaTK": account["_id"], "RevokedAt": None},
            {"$set": {"RevokedAt": utc_now()}},
        )
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa đặt lại được mật khẩu vì MongoDB chưa sẵn sàng."},
        ) from exc

    return {"message": "Cập nhật mật khẩu thành công."}


async def get_current_user_from_token(db: Any, token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise jwt.InvalidTokenError("Invalid token type")
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_SESSION_EXPIRED", "message": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."},
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTH_TOKEN_INVALID", "message": "Phiên đăng nhập không hợp lệ."},
        ) from exc

    account_id = payload.get("sub")
    try:
        account = await db["TAIKHOAN"].find_one({"_id": account_id})
        if not account:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"code": "AUTH_TOKEN_INVALID", "message": "Phiên đăng nhập không hợp lệ."},
            )
        token_auth_version = int(payload.get("auth_version", 0) or 0)
        account_auth_version = int(account.get("AuthVersion", 0) or 0)
        if token_auth_version != account_auth_version:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "code": "AUTH_SESSION_REVOKED",
                    "message": "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.",
                },
            )
        ensure_account_can_login(account)
        customer = await find_customer_for_account(db, account)
    except HTTPException:
        raise
    except DATABASE_ERRORS as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "DATABASE_UNAVAILABLE", "message": "Chưa xác thực được phiên vì MongoDB chưa sẵn sàng."},
        ) from exc

    public = public_user(customer, account)
    return {
        "user_id": public["user_id"],
        "account_id": public["account_id"],
        "role": public["role"],
        "current_plan": public["account_type"],
        "email": public["email"],
        "full_name": public["full_name"],
    }
