from __future__ import annotations

import copy
import unittest
from types import SimpleNamespace
from typing import Any

from fastapi import HTTPException

from app.services.cv_service import delete_owned_cv


def matches(document: dict[str, Any], query: dict[str, Any]) -> bool:
    for key, expected in query.items():
        if key == "$or":
            if not any(matches(document, branch) for branch in expected):
                return False
            continue
        actual = document.get(key)
        if isinstance(expected, dict) and "$in" in expected:
            if actual not in expected["$in"]:
                return False
        elif actual != expected:
            return False
    return True


class FakeCursor:
    def __init__(self, documents: list[dict[str, Any]]) -> None:
        self.documents = documents

    async def to_list(self, length: int | None = None) -> list[dict[str, Any]]:
        return copy.deepcopy(self.documents if length is None else self.documents[:length])


class FakeCollection:
    def __init__(self, documents: list[dict[str, Any]] | None = None) -> None:
        self.documents = copy.deepcopy(documents or [])

    async def find_one(self, query: dict[str, Any], projection: dict[str, int] | None = None) -> dict[str, Any] | None:
        document = next((item for item in self.documents if matches(item, query)), None)
        if document is None:
            return None
        if projection:
            return {key: copy.deepcopy(document[key]) for key, include in projection.items() if include and key in document}
        return copy.deepcopy(document)

    def find(self, query: dict[str, Any], projection: dict[str, int] | None = None) -> FakeCursor:
        found: list[dict[str, Any]] = []
        for document in self.documents:
            if not matches(document, query):
                continue
            if projection:
                found.append({key: copy.deepcopy(document[key]) for key, include in projection.items() if include and key in document})
            else:
                found.append(copy.deepcopy(document))
        return FakeCursor(found)

    async def delete_many(self, query: dict[str, Any]) -> SimpleNamespace:
        before = len(self.documents)
        self.documents = [document for document in self.documents if not matches(document, query)]
        return SimpleNamespace(deleted_count=before - len(self.documents))

    async def delete_one(self, query: dict[str, Any]) -> SimpleNamespace:
        for index, document in enumerate(self.documents):
            if matches(document, query):
                self.documents.pop(index)
                return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)

    async def update_many(self, query: dict[str, Any], update: dict[str, Any]) -> SimpleNamespace:
        modified_count = 0
        for document in self.documents:
            if not matches(document, query):
                continue
            document.update(update.get("$set", {}))
            for key in update.get("$unset", {}):
                document.pop(key, None)
            modified_count += 1
        return SimpleNamespace(modified_count=modified_count)


class FakeDb(dict[str, FakeCollection]):
    def __getitem__(self, name: str) -> FakeCollection:
        if name not in self:
            self[name] = FakeCollection()
        return super().__getitem__(name)


class DeleteOwnedCvTests(unittest.IsolatedAsyncioTestCase):
    def build_db(self) -> FakeDb:
        return FakeDb(
            {
                "CV": FakeCollection(
                    [
                        {"_id": "CV_OWNER", "MaKH": "KH_OWNER", "TenFileGoc": "owner.pdf"},
                        {"_id": "CV_OTHER", "MaKH": "KH_OTHER", "TenFileGoc": "other.pdf"},
                    ]
                ),
                "KETQUA_PTCV": FakeCollection(
                    [
                        {"_id": "KQ_1", "MaCV": "CV_OWNER"},
                        {"_id": "KQ_2", "MaCV": "CV_OWNER"},
                        {"_id": "KQ_OTHER", "MaCV": "CV_OTHER"},
                    ]
                ),
                "GOIY_CAITHIEN": FakeCollection(
                    [{"_id": "GY_1", "MaKQ": "KQ_1"}, {"_id": "GY_OTHER", "MaKQ": "KQ_OTHER"}]
                ),
                "DANHGIASP": FakeCollection(
                    [{"_id": "DG_1", "MaKQ": "KQ_1", "MaKH": "KH_OWNER"}]
                ),
                "LICHSUPTCV": FakeCollection(
                    [
                        {"_id": "LS_1", "MaKQ": "KQ_1", "MaKH": "KH_OWNER"},
                        {"_id": "LS_2", "MaKQ": "KQ_2", "MaKH": "KH_OWNER"},
                        {"_id": "LS_OTHER", "MaKQ": "KQ_OTHER", "MaKH": "KH_OTHER"},
                    ]
                ),
                "SUKIEN_SANPHAM": FakeCollection(
                    [
                        {"_id": "EV_1", "MaCV": "CV_OWNER", "MaKH": "KH_OWNER"},
                        {"_id": "EV_OTHER", "MaCV": "CV_OTHER", "MaKH": "KH_OTHER"},
                    ]
                ),
                "LOG_KH": FakeCollection(
                    [{"_id": "LOG_1", "MaKH": "KH_OWNER", "DoiTuong": "CV", "MaDoiTuong": "CV_OWNER"}]
                ),
            }
        )

    async def test_owner_deletes_cv_and_derivatives_but_keeps_quota_ledger(self) -> None:
        db = self.build_db()

        result = await delete_owned_cv(db, cv_id="CV_OWNER", user_id="KH_OWNER")

        self.assertEqual(result["cleanup"]["analyses"], 2)
        self.assertFalse(any(item["_id"] == "CV_OWNER" for item in db["CV"].documents))
        self.assertEqual([item["_id"] for item in db["KETQUA_PTCV"].documents], ["KQ_OTHER"])
        owner_usage = [item for item in db["LICHSUPTCV"].documents if item["MaKH"] == "KH_OWNER"]
        self.assertEqual(len(owner_usage), 2)
        self.assertTrue(all(item.get("CVDeleted") is True and "MaKQ" not in item for item in owner_usage))
        self.assertEqual([item["_id"] for item in db["SUKIEN_SANPHAM"].documents], ["EV_OTHER"])

    async def test_user_cannot_delete_another_users_cv(self) -> None:
        db = self.build_db()

        with self.assertRaises(HTTPException) as raised:
            await delete_owned_cv(db, cv_id="CV_OTHER", user_id="KH_OWNER")

        self.assertEqual(raised.exception.status_code, 404)
        self.assertTrue(any(item["_id"] == "CV_OTHER" for item in db["CV"].documents))


if __name__ == "__main__":
    unittest.main()
