"""Shared FastAPI dependencies for request context."""

from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status

from app.db import db
from app.services.auth_service import get_current_user_from_token


async def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, str]:
    """Return authenticated user context, with a demo fallback for existing MVP flows."""
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            return await get_current_user_from_token(db, token)

    return {"user_id": "KH001", "account_id": "TK_KH001", "role": "registered", "current_plan": "free"}


async def get_authenticated_user(authorization: str | None = Header(default=None)) -> dict[str, str]:
    """Require a real bearer token for write-sensitive Step-4 endpoints."""
    if authorization:
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() == "bearer" and token:
            return await get_current_user_from_token(db, token)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "AUTH_REQUIRED", "message": "Vui lòng đăng nhập để tiếp tục."},
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_customer_user(
    user: dict[str, str] = Depends(get_authenticated_user),
) -> dict[str, str]:
    """Require an authenticated customer rather than an Admin account."""
    if user.get("role") == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "CUSTOMER_REQUIRED", "message": "Chức năng này chỉ dành cho người dùng sản phẩm."},
        )
    return user
