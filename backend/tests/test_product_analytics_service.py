import unittest

from app.services.product_analytics_service import apply_role_names, calculate_conversion_rate


class CalculateConversionRateTests(unittest.TestCase):
    def test_returns_normal_percentage(self) -> None:
        self.assertEqual(calculate_conversion_rate(6, 10), 60.0)

    def test_caps_percentage_at_one_hundred(self) -> None:
        self.assertEqual(calculate_conversion_rate(15, 10), 100.0)

    def test_returns_zero_when_denominator_is_zero(self) -> None:
        self.assertEqual(calculate_conversion_rate(5, 0), 0.0)

    def test_does_not_return_negative_percentage(self) -> None:
        self.assertEqual(calculate_conversion_rate(-5, 10), 0.0)


class ApplyRoleNamesTests(unittest.TestCase):
    def test_replaces_internal_role_id_with_readable_name(self) -> None:
        result = apply_role_names(
            [{"name": "IT-ROLE-005", "count": 3}],
            {"IT-ROLE-005": "AI / Machine Learning Engineer"},
        )

        self.assertEqual(
            result,
            [{"_id": "IT-ROLE-005", "name": "AI / Machine Learning Engineer", "count": 3}],
        )

    def test_hides_unknown_internal_role_id(self) -> None:
        result = apply_role_names([{"name": "IT-ROLE-999", "count": 1}], {})

        self.assertEqual(result[0]["name"], "Vai trò chưa xác định")


if __name__ == "__main__":
    unittest.main()
