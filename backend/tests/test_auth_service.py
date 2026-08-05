from __future__ import annotations

import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import jwt
from fastapi import HTTPException

from app.services import auth_service
from app.services.email_service import get_smtp_settings


class StubCollection:
    def __init__(self, *, find_one_values=None):
        values = list(find_one_values or [])
        self.find_one = AsyncMock(side_effect=values if values else None)
        if not values:
            self.find_one.return_value = None
        self.insert_one = AsyncMock()
        self.update_one = AsyncMock()
        self.update_many = AsyncMock()


class StubDb:
    def __init__(self, **collections):
        self.collections = collections

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = StubCollection()
        return self.collections[name]


class AuthServiceTests(unittest.IsolatedAsyncioTestCase):
    def test_accepts_normal_non_gmail_addresses(self):
        self.assertTrue(auth_service.is_valid_email("candidate@company.vn"))
        self.assertTrue(auth_service.is_valid_email("student@university.edu"))
        self.assertFalse(auth_service.is_valid_email("candidate@company"))

    def test_legacy_account_without_flag_remains_compatible(self):
        self.assertTrue(auth_service.is_email_verified({"Role": "registered"}))
        self.assertFalse(
            auth_service.is_email_verified({"Role": "registered", "EmailVerified": False})
        )
        self.assertTrue(auth_service.is_email_verified({"Role": "admin", "EmailVerified": False}))

    def test_naive_mongodb_datetime_expiry_is_normalized(self):
        now = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
        self.assertTrue(auth_service.is_expired(datetime(2026, 8, 4, 11, 59), now=now))
        self.assertFalse(auth_service.is_expired(datetime(2026, 8, 4, 12, 1), now=now))
        self.assertTrue(auth_service.is_expired(None, now=now))

    def test_access_token_lasts_one_day(self):
        now = datetime(2026, 8, 4, 12, 0, tzinfo=timezone.utc)
        account = {
            "_id": "TK_TEST",
            "MaKH": "KH_TEST",
            "Role": "registered",
            "AuthVersion": 0,
        }
        with (
            patch.object(auth_service, "ACCESS_TOKEN_MINUTES", 1440),
            patch.object(auth_service, "utc_now", return_value=now),
        ):
            token, expires_at = auth_service.issue_access_token(account)

        payload = jwt.decode(
            token,
            auth_service.JWT_SECRET_KEY,
            algorithms=[auth_service.JWT_ALGORITHM],
            options={"verify_exp": False},
        )
        self.assertEqual(expires_at, now + timedelta(days=1))
        self.assertEqual(payload["exp"] - payload["iat"], 24 * 60 * 60)

    async def test_registration_stores_only_hashed_verification_token(self):
        accounts = StubCollection()
        customers = StubCollection()
        logs = StubCollection()
        db = StubDb(TAIKHOAN=accounts, KHACHHANG=customers, LOG_KH=logs)

        with (
            patch.object(auth_service, "ensure_email_delivery_configured"),
            patch.object(auth_service, "send_verification_email", new=AsyncMock()) as send_email,
        ):
            result = await auth_service.register_user(
                db,
                full_name="Nguyễn Văn A",
                email="candidate@company.vn",
                password="StrongPass1",
                password_confirmation="StrongPass1",
                terms_accepted=True,
            )

        account = accounts.insert_one.await_args.args[0]
        self.assertFalse(account["EmailVerified"])
        self.assertEqual(account["TrangThai"], "pending_verification")
        self.assertIn("EmailVerificationTokenHash", account)
        self.assertNotIn("EmailVerificationToken", account)
        self.assertGreater(account["EmailVerificationExpiresAt"], account["CreatedAt"])
        self.assertFalse(result["user"]["email_verified"])
        send_email.assert_awaited_once()

    async def test_registration_retry_resends_for_pending_account_after_delivery_failure(self):
        now = datetime(2026, 8, 5, 1, 0, tzinfo=timezone.utc)
        account = {
            "_id": "TK_TEST",
            "MaKH": "KH_TEST",
            "Email": "candidate@company.vn",
            "Role": "registered",
            "TrangThai": "pending_verification",
            "EmailVerified": False,
            "EmailVerificationExpiresAt": now + timedelta(minutes=10),
            "VerificationEmailLastSentAt": None,
        }
        customer = {
            "_id": "KH_TEST",
            "HoTen": "Nguyễn Văn A",
            "Email": "candidate@company.vn",
            "LoaiKH": "registered",
        }
        accounts = StubCollection(find_one_values=[account])
        customers = StubCollection(find_one_values=[customer])
        db = StubDb(TAIKHOAN=accounts, KHACHHANG=customers)
        resend_result = {
            "message": "Email xác thực mới đã được gửi. Vui lòng kiểm tra hộp thư.",
            "expires_at": now + timedelta(minutes=15),
        }

        with patch.object(
            auth_service,
            "resend_verification_email",
            new=AsyncMock(return_value=resend_result),
        ) as resend:
            result = await auth_service.register_user(
                db,
                full_name="Nguyễn Văn A",
                email="candidate@company.vn",
                password="StrongPass1",
                password_confirmation="StrongPass1",
                terms_accepted=True,
            )

        resend.assert_awaited_once_with(db, "candidate@company.vn")
        accounts.insert_one.assert_not_awaited()
        customers.insert_one.assert_not_awaited()
        self.assertEqual(result["message"], resend_result["message"])
        self.assertFalse(result["user"]["email_verified"])

    async def test_repeated_registration_is_idempotent_when_verification_email_was_sent(self):
        now = datetime(2026, 8, 5, 1, 0, tzinfo=timezone.utc)
        account = {
            "_id": "TK_TEST",
            "MaKH": "KH_TEST",
            "Email": "candidate@company.vn",
            "Role": "registered",
            "TrangThai": "pending_verification",
            "EmailVerified": False,
            "EmailVerificationExpiresAt": now + timedelta(minutes=10),
            "VerificationEmailLastSentAt": now - timedelta(seconds=5),
        }
        customer = {
            "_id": "KH_TEST",
            "HoTen": "Nguyễn Văn A",
            "Email": "candidate@company.vn",
            "LoaiKH": "registered",
        }
        accounts = StubCollection(find_one_values=[account])
        customers = StubCollection(find_one_values=[customer])
        db = StubDb(TAIKHOAN=accounts, KHACHHANG=customers)

        with (
            patch.object(auth_service, "utc_now", return_value=now),
            patch.object(
                auth_service,
                "resend_verification_email",
                new=AsyncMock(),
            ) as resend,
        ):
            result = await auth_service.register_user(
                db,
                full_name="Nguyễn Văn A",
                email="candidate@company.vn",
                password="StrongPass1",
                password_confirmation="StrongPass1",
                terms_accepted=True,
            )

        resend.assert_not_awaited()
        accounts.insert_one.assert_not_awaited()
        self.assertIn("đang chờ xác thực", result["message"])
        self.assertEqual(result["verification_expires_at"], account["EmailVerificationExpiresAt"])

    async def test_email_verification_token_is_unset_after_use(self):
        token = "verification-token-with-enough-entropy-for-test"
        account = {
            "_id": "TK_TEST",
            "MaKH": "KH_TEST",
            "Email": "candidate@company.vn",
            "Role": "registered",
            "TrangThai": "pending_verification",
            "EmailVerified": False,
            "EmailVerificationTokenHash": auth_service.token_hash(token),
            # A naive timestamp mirrors Motor's default MongoDB decoding.
            "EmailVerificationExpiresAt": datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(minutes=10),
        }
        verified_account = {
            **account,
            "TrangThai": "active",
            "EmailVerified": True,
        }
        accounts = StubCollection(find_one_values=[account, verified_account])
        customer = {"_id": "KH_TEST", "HoTen": "Nguyễn Văn A", "LoaiKH": "registered"}
        customers = StubCollection(find_one_values=[customer])
        db = StubDb(TAIKHOAN=accounts, KHACHHANG=customers)

        result = await auth_service.verify_email(db, token)

        update = accounts.update_one.await_args.args[1]
        self.assertIn("EmailVerificationTokenHash", update["$unset"])
        self.assertIn("EmailVerificationExpiresAt", update["$unset"])
        self.assertTrue(result["user"]["email_verified"])

    async def test_login_rejects_explicitly_unverified_account(self):
        account = {
            "_id": "TK_TEST",
            "MaKH": "KH_TEST",
            "Email": "candidate@company.vn",
            "Role": "registered",
            "TrangThai": "pending_verification",
            "EmailVerified": False,
            "MatKhauHash": auth_service.hash_password("StrongPass1"),
            "FailedLoginCount": 0,
        }
        accounts = StubCollection(find_one_values=[account])
        db = StubDb(TAIKHOAN=accounts)

        with self.assertRaises(HTTPException) as raised:
            await auth_service.login_user(
                db,
                email="candidate@company.vn",
                password="StrongPass1",
                remember_me=False,
            )

        self.assertEqual(raised.exception.status_code, 403)
        self.assertEqual(raised.exception.detail["code"], "AUTH_EMAIL_UNVERIFIED")

    async def test_legacy_account_is_lazily_marked_verified_on_login(self):
        account = {
            "_id": "TK_LEGACY",
            "MaKH": "KH_LEGACY",
            "Email": "legacy@example.com",
            "Role": "registered",
            "TrangThai": "active",
            "MatKhauHash": auth_service.hash_password("StrongPass1"),
            "FailedLoginCount": 0,
        }
        accounts = StubCollection(find_one_values=[account, account])
        customers = StubCollection()
        db = StubDb(TAIKHOAN=accounts, KHACHHANG=customers)

        with patch.object(
            auth_service,
            "build_session_response",
            new=AsyncMock(return_value={"access_token": "test"}),
        ):
            await auth_service.login_user(
                db,
                email="legacy@example.com",
                password="StrongPass1",
                remember_me=False,
            )

        update = accounts.update_one.await_args.args[1]["$set"]
        self.assertTrue(update["EmailVerified"])
        self.assertEqual(update["TrangThai"], "active")

    async def test_forgot_password_does_not_expose_a_demo_token(self):
        db = StubDb(TAIKHOAN=StubCollection())
        result = await auth_service.forgot_password(db, "unknown@company.vn")
        self.assertNotIn("demo_reset_token", result)
        self.assertEqual(result["delivery"], "smtp_email_sent_if_account_exists")


class EmailSettingsTests(unittest.TestCase):
    def test_smtp_settings_are_loaded_from_environment(self):
        values = {
            "AUTH_SMTP_HOST": "smtp.gmail.com",
            "AUTH_SMTP_PORT": "465",
            "AUTH_SMTP_USER": "sender@example.com",
            "AUTH_SMTP_PASS": "app-password",
        }
        with patch.dict(os.environ, values, clear=False):
            settings = get_smtp_settings()
        self.assertEqual(settings.host, "smtp.gmail.com")
        self.assertEqual(settings.port, 465)
        self.assertTrue(settings.use_ssl)


if __name__ == "__main__":
    unittest.main()
