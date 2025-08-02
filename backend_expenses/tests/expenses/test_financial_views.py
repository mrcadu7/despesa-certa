import datetime
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from django.contrib.auth import get_user_model
from django.urls import reverse

from expenses.models import FinancialAlert, MonthlyIncome

User = get_user_model()


class FinancialViewsTestCase(APITestCase):
    """Testes para as views de análise financeira."""

    def setUp(self):
        """Configuração inicial."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

        # Autenticar usuário
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        self.month = datetime.date(2025, 8, 1)

    def test_monthly_income_create(self):
        """Testa criação de renda mensal."""
        url = reverse("monthlyincome-list")
        data = {"month": "2025-08-01", "amount": "5000.00"}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verificar se foi criado no banco
        income = MonthlyIncome.objects.get(user=self.user)
        self.assertEqual(income.amount, Decimal("5000.00"))

    def test_monthly_income_list(self):
        """Testa listagem de rendas mensais."""
        MonthlyIncome.objects.create(user=self.user, month=self.month, amount=Decimal("5000.00"))

        url = reverse("monthlyincome-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_financial_alerts_list(self):
        """Testa listagem de alertas financeiros."""
        FinancialAlert.objects.create(
            user=self.user,
            alert_type="warning",
            title="Teste",
            message="Mensagem de teste",
            month=self.month,
        )

        url = reverse("financialalert-list")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_financial_summary_view(self):
        """Testa a view de resumo financeiro."""
        MonthlyIncome.objects.create(user=self.user, month=self.month, amount=Decimal("5000.00"))

        url = reverse("financial-summary")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        expected_keys = [
            "month",
            "income",
            "total_expenses",
            "balance",
            "expenses_by_category",
            "category_percentages",
            "alerts",
            "financial_health",
        ]

        for key in expected_keys:
            self.assertIn(key, response.data)

    def test_generate_alerts_view(self):
        """Testa a view de geração de alertas."""
        MonthlyIncome.objects.create(user=self.user, month=self.month, amount=Decimal("5000.00"))

        url = reverse("generate-alerts")
        data = {"month": "2025-08"}
        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.assertIn("alerts", response.data)

    def test_unauthorized_access(self):
        """Testa acesso não autorizado."""
        self.client.credentials()

        url = reverse("financial-summary")
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class MonthlyIncomeValidationTestCase(APITestCase):
    """Testes para validações de renda mensal."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_invalid_amount(self):
        """Testa validação de valor inválido."""
        url = reverse("monthlyincome-list")
        data = {"month": "2025-08-01", "amount": "-1000.00"}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_month(self):
        """Testa criação de renda duplicada para o mesmo mês."""
        url = reverse("monthlyincome-list")
        data = {"month": "2025-01-01", "amount": "5000.00"}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data["amount"] = "6000.00"
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
