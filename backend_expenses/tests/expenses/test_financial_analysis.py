import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from expenses.models import Expense, FinancialAlert, MonthlyIncome
from expenses.services import FinancialAnalysisService

User = get_user_model()


class FinancialAnalysisServiceTestCase(TestCase):
    """Testes para o serviço de análise financeira."""

    def setUp(self):
        """Configuração inicial para os testes."""
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

        self.month = datetime.date(2025, 8, 1)

        # Criar renda mensal
        MonthlyIncome.objects.create(user=self.user, date=self.month, amount=Decimal("5000.00"))

        # Criar algumas despesas
        self.expenses = [
            Expense.objects.create(
                user=self.user,
                value=Decimal("1800.00"),
                category="moradia",
                description="Aluguel",
                date=datetime.date(2025, 8, 15),
            ),
            Expense.objects.create(
                user=self.user,
                value=Decimal("800.00"),
                category="alimentacao",
                description="Supermercado",
                date=datetime.date(2025, 8, 10),
            ),
            Expense.objects.create(
                user=self.user,
                value=Decimal("400.00"),
                category="transporte",
                description="Combustível",
                date=datetime.date(2025, 8, 5),
            ),
        ]

    def test_get_monthly_income(self):
        """Testa se a renda mensal é obtida corretamente."""
        service = FinancialAnalysisService(self.user, self.month)
        income = service.get_monthly_income()
        assert income == Decimal("5000.00")

    def test_get_monthly_income_not_found(self):
        """Testa comportamento quando não há renda cadastrada."""
        user_without_income = User.objects.create_user(
            username="noincomeuser", email="noincome@example.com", password="testpass123"
        )

        service = FinancialAnalysisService(user_without_income, self.month)
        income = service.get_monthly_income()
        assert income == Decimal("0.00")

    def test_get_expenses_by_category(self):
        """Testa se as despesas por categoria são calculadas corretamente."""
        service = FinancialAnalysisService(self.user, self.month)
        expenses_by_category = service.get_expenses_by_category()

        expected = {
            "moradia": Decimal("1800.00"),
            "alimentacao": Decimal("800.00"),
            "transporte": Decimal("400.00"),
        }

        assert expenses_by_category == expected

    def test_get_total_expenses(self):
        """Testa se o total de despesas é calculado corretamente."""
        service = FinancialAnalysisService(self.user, self.month)
        total = service.get_total_expenses()
        assert total == Decimal("3000.00")

    def test_calculate_balance(self):
        """Testa se o saldo é calculado corretamente."""
        service = FinancialAnalysisService(self.user, self.month)
        balance = service.calculate_balance()
        assert balance == Decimal("2000.00")

    def test_calculate_category_percentage(self):
        """Testa se a porcentagem por categoria é calculada corretamente."""
        service = FinancialAnalysisService(self.user, self.month)

        percentage = service.calculate_category_percentage(Decimal("1800.00"), Decimal("5000.00"))
        assert percentage == Decimal("36.00")

    def test_generate_financial_alerts_housing_warning(self):
        """Testa se alerta de moradia é gerado corretamente."""
        service = FinancialAnalysisService(self.user, self.month)
        alerts = service.generate_financial_alerts()

        housing_alerts = [a for a in alerts if "moradia" in a["title"].lower()]
        assert len(housing_alerts) > 0
        assert housing_alerts[0]["type"] == "warning"

    def test_generate_financial_alerts_no_income(self):
        """Testa alertas quando não há renda cadastrada."""
        user_without_income = User.objects.create_user(
            username="noincomeuser2", email="noincome2@example.com", password="testpass123"
        )

        service = FinancialAnalysisService(user_without_income, self.month)
        alerts = service.generate_financial_alerts()

        assert len(alerts) == 1
        assert alerts[0]["type"] == "warning"
        assert "Renda não informada" in alerts[0]["title"]

    def test_save_alerts_to_database(self):
        """Testa se os alertas são salvos no banco de dados."""
        service = FinancialAnalysisService(self.user, self.month)
        alerts = service.generate_financial_alerts()

        assert FinancialAlert.objects.filter(user=self.user).count() == 0

        service.save_alerts_to_database(alerts)

        saved_alerts = FinancialAlert.objects.filter(user=self.user, month=self.month)
        assert saved_alerts.count() == len(alerts)

    def test_get_financial_summary(self):
        """Testa se o resumo financeiro é gerado corretamente."""
        service = FinancialAnalysisService(self.user, self.month)
        summary = service.get_financial_summary()

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
            assert key in summary

        assert summary["income"] == Decimal("5000.00")
        assert summary["total_expenses"] == Decimal("3000.00")
        assert summary["balance"] == Decimal("2000.00")
        assert summary["financial_health"] == "excellent"

    def test_financial_health_calculation(self):
        """Testa diferentes cenários de saúde financeira."""
        service = FinancialAnalysisService(self.user, self.month)

        health = service._calculate_financial_health(Decimal("5000.00"), Decimal("3000.00"))
        assert health == "excellent"

        health = service._calculate_financial_health(Decimal("5000.00"), Decimal("6000.00"))
        assert health == "critical"

        health = service._calculate_financial_health(Decimal("0.00"), Decimal("1000.00"))
        assert health == "unknown"


class MonthlyIncomeModelTestCase(TestCase):
    """Testes para o modelo MonthlyIncome."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

    def test_create_monthly_income(self):
        """Testa criação de renda mensal."""
        income = MonthlyIncome.objects.create(
            user=self.user, date=datetime.date(2025, 8, 1), amount=Decimal("5000.00")
        )

        assert income.user == self.user
        assert income.amount == Decimal("5000.00")
        assert str(income) == f"{self.user.username} - 01/08/2025 - R$ 5000.00"


class FinancialAlertModelTestCase(TestCase):
    """Testes para o modelo FinancialAlert."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )

    def test_create_financial_alert(self):
        """Testa criação de alerta financeiro."""
        alert = FinancialAlert.objects.create(
            user=self.user,
            alert_type="warning",
            title="Teste de Alerta",
            message="Mensagem de teste",
            month=datetime.date(2025, 8, 1),
        )

        assert alert.user == self.user
        assert alert.alert_type == "warning"
        assert alert.is_read is False
        assert str(alert) == f"{self.user.username} - Teste de Alerta"
