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
        data = {"date": "2025-08-01", "amount": "5000.00"}

        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED

        income = MonthlyIncome.objects.get(user=self.user)
        assert income.amount == Decimal("5000.00")

    def test_monthly_income_list(self):
        """Testa listagem de rendas mensais."""
        MonthlyIncome.objects.create(user=self.user, date=self.month, amount=Decimal("5000.00"))

        url = reverse("monthlyincome-list")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

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

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1

    def test_financial_summary_view(self):
        """Testa a view de resumo financeiro."""
        MonthlyIncome.objects.create(user=self.user, date=self.month, amount=Decimal("5000.00"))

        url = reverse("financial-summary")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_200_OK

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
            assert key in response.data

    def test_generate_alerts_view(self):
        """Testa a view de geração de alertas."""
        MonthlyIncome.objects.create(user=self.user, date=self.month, amount=Decimal("5000.00"))

        url = reverse("generate-alerts")
        data = {"month": "2025-08"}
        response = self.client.post(url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "message" in response.data
        assert "alerts" in response.data

    def test_unauthorized_access(self):
        """Testa acesso não autorizado."""
        self.client.credentials()

        url = reverse("financial-summary")
        response = self.client.get(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN


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
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_too_high_amount(self):
        """Testa validação de valor muito alto."""
        url = reverse("monthlyincome-list")
        data = {"date": "2025-08-01", "amount": "10000001.00"}
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_zero_amount(self):
        """Testa validação de valor zero."""
        url = reverse("monthlyincome-list")
        data = {"date": "2025-08-01", "amount": "0.00"}
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_future_date_allowed(self):
        """Testa que datas futuras são permitidas na criação."""
        url = reverse("monthlyincome-list")
        future_date = (datetime.date.today() + datetime.timedelta(days=10)).isoformat()
        data = {"date": future_date, "amount": "1000.00"}
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED

    def test_patch_invalid_amount(self):
        """Testa PATCH parcial com valor inválido."""
        url = reverse("monthlyincome-list")
        # Cria renda válida
        data = {"date": "2025-08-01", "amount": "1000.00"}
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        income_id = response.data["id"]
        # PATCH valor inválido
        patch_url = reverse("monthlyincome-detail", args=[income_id])
        patch_data = {"amount": "-500.00"}
        patch_response = self.client.patch(patch_url, patch_data, format="json")
        assert patch_response.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_future_date_allowed(self):
        """Testa PATCH parcial permitindo data futura."""
        url = reverse("monthlyincome-list")
        data = {"date": "2025-08-01", "amount": "1000.00"}
        response = self.client.post(url, data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        income_id = response.data["id"]
        patch_url = reverse("monthlyincome-detail", args=[income_id])
        future_date = (datetime.date.today() + datetime.timedelta(days=10)).isoformat()
        patch_data = {"date": future_date}
        patch_response = self.client.patch(patch_url, patch_data, format="json")
        assert patch_response.status_code == status.HTTP_200_OK
