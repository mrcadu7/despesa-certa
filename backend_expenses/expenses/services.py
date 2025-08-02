from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Dict, List

from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone

from .models import Expense, FinancialAlert, MonthlyIncome

User = get_user_model()


class FinancialAnalysisService:
    """Serviço para análise financeira e geração de alertas."""

    def __init__(self, user: User, month: date = None):
        self.user = user
        self.month = month or timezone.now().date().replace(day=1)

    def get_monthly_income(self) -> Decimal:
        """Obtém a renda mensal do usuário para o mês especificado."""
        try:
            income = MonthlyIncome.objects.get(
                user=self.user, month__year=self.month.year, month__month=self.month.month
            )
            return income.amount
        except MonthlyIncome.DoesNotExist:
            return Decimal("0.00")

    def get_expenses_by_category(self) -> Dict[str, Decimal]:
        """Obtém gastos por categoria no mês especificado."""
        expenses = (
            Expense.objects.filter(
                user=self.user, date__year=self.month.year, date__month=self.month.month
            )
            .values("category")
            .annotate(total=Sum("value"))
        )

        category_totals = defaultdict(Decimal)
        for expense in expenses:
            category_totals[expense["category"]] = expense["total"] or Decimal("0.00")

        return dict(category_totals)

    def get_total_expenses(self) -> Decimal:
        """Obtém o total de gastos no mês especificado."""
        total = Expense.objects.filter(
            user=self.user, date__year=self.month.year, date__month=self.month.month
        ).aggregate(total=Sum("value"))["total"]

        return total or Decimal("0.00")

    def calculate_balance(self) -> Decimal:
        """Calcula o saldo mensal (renda - gastos)."""
        income = self.get_monthly_income()
        expenses = self.get_total_expenses()
        return income - expenses

    def calculate_category_percentage(self, category_amount: Decimal, income: Decimal) -> Decimal:
        """Calcula a porcentagem de uma categoria em relação à renda."""
        if income <= 0:
            return Decimal("0.00")
        return (category_amount / income) * Decimal("100")

    def generate_financial_alerts(self) -> List[Dict]:
        """Gera alertas financeiros baseados nas regras de negócio."""
        alerts = []
        income = self.get_monthly_income()

        if income <= 0:
            alerts.append(
                {
                    "type": "warning",
                    "title": "Renda não informada",
                    "message": "Informe sua renda mensal para receber análises personalizadas.",
                }
            )
            return alerts

        expenses_by_category = self.get_expenses_by_category()
        total_expenses = self.get_total_expenses()
        balance = self.calculate_balance()

        # Moradia acima de 30%
        housing_amount = expenses_by_category.get("moradia", Decimal("0.00"))
        housing_percentage = self.calculate_category_percentage(housing_amount, income)
        if housing_percentage > Decimal("30"):
            alerts.append(
                {
                    "type": "warning",
                    "title": "Gastos com moradia elevados",
                    "message": (
                        f"Seus gastos com moradia representam {housing_percentage:.1f}% da renda "
                        f"(ideal: até 30%). "
                        "Isso pode indicar instabilidade financeira."
                    ),
                }
            )

        # Alimentação acima de 20%
        food_amount = expenses_by_category.get("alimentacao", Decimal("0.00"))
        food_percentage = self.calculate_category_percentage(food_amount, income)
        if food_percentage > Decimal("20"):
            alerts.append(
                {
                    "type": "warning",
                    "title": "Gastos com alimentação elevados",
                    "message": (
                        f"Seus gastos com alimentação representam {food_percentage:.1f}% "
                        f"da renda (ideal: até 20%). "
                        "Considere revisar seus hábitos alimentares."
                    ),
                }
            )

        # Transporte acima de 15%
        transport_amount = expenses_by_category.get("transporte", Decimal("0.00"))
        transport_percentage = self.calculate_category_percentage(transport_amount, income)
        if transport_percentage > Decimal("15"):
            alerts.append(
                {
                    "type": "warning",
                    "title": "Gastos com transporte elevados",
                    "message": (
                        f"Seus gastos com transporte representam {transport_percentage:.1f}% "
                        f"da renda (ideal: até 15%). "
                        "Considere otimizar seus deslocamentos."
                    ),
                }
            )

        # Lazer acima de 10%
        leisure_amount = expenses_by_category.get("lazer", Decimal("0.00"))
        leisure_percentage = self.calculate_category_percentage(leisure_amount, income)
        if leisure_percentage > Decimal("10"):
            alerts.append(
                {
                    "type": "info",
                    "title": "Gastos com lazer elevados",
                    "message": (
                        f"Seus gastos com lazer representam {leisure_percentage:.1f}% "
                        f"da renda (ideal: até 10%). "
                        "Equilibre diversão e responsabilidade financeira."
                    ),
                }
            )

        # Dívidas acima de 20%
        debt_amount = expenses_by_category.get("dividas", Decimal("0.00"))
        debt_percentage = self.calculate_category_percentage(debt_amount, income)
        if debt_percentage > Decimal("20"):
            alerts.append(
                {
                    "type": "danger",
                    "title": "Gastos com dívidas elevados",
                    "message": (
                        f"Seus gastos com dívidas representam {debt_percentage:.1f}% "
                        f"da renda (ideal: até 20%). "
                        "Risco de sobre-endividamento!"
                    ),
                }
            )

        # Gastos totais vs renda
        total_percentage = self.calculate_category_percentage(total_expenses, income)
        if total_percentage > Decimal("100"):
            alerts.append(
                {
                    "type": "danger",
                    "title": "Gastos acima da renda",
                    "message": (
                        f"Seus gastos ({total_percentage:.1f}% da renda) excedem sua "
                        "renda mensal. Risco de inadimplência!"
                    ),
                }
            )
        elif total_percentage > Decimal("90"):
            alerts.append(
                {
                    "type": "warning",
                    "title": "Gastos muito altos",
                    "message": (
                        f"Seus gastos representam {total_percentage:.1f}% "
                        "da renda. Risco de endividamento."
                    ),
                }
            )

        # Saldo mensal
        if balance < 0:
            alerts.append(
                {
                    "type": "danger",
                    "title": "Saldo negativo",
                    "message": (
                        f"Seu saldo mensal é negativo (R$ {balance}). "
                        "Ajuste imediato necessário."
                    ),
                }
            )
        elif balance < (income * Decimal("0.1")):  # Menos de 10% da renda
            alerts.append(
                {
                    "type": "warning",
                    "title": "Saldo baixo",
                    "message": (
                        f"Seu saldo mensal é muito baixo (R$ {balance}). "
                        "Considere revisar seu orçamento."
                    ),
                }
            )

        # Poupança (se não há saldo positivo)
        if balance <= 0:
            alerts.append(
                {
                    "type": "info",
                    "title": "Sem capacidade de poupança",
                    "message": (
                        "Você não conseguiu poupar neste mês. Tente reduzir gastos "
                        "para criar uma reserva de emergência."
                    ),
                }
            )
        elif balance < (income * Decimal("0.1")):
            alerts.append(
                {
                    "type": "info",
                    "title": "Poupança abaixo do ideal",
                    "message": (
                        "Sua capacidade de poupança é "
                        f"{self.calculate_category_percentage(balance, income):.1f}% "
                        "da renda (ideal: pelo menos 10%)."
                    ),
                }
            )

        return alerts

    def save_alerts_to_database(self, alerts: List[Dict]) -> None:
        """Salva os alertas no banco de dados. A ideia aqui é
        evitar duplicação de alertas para o mesmo mês.
        """
        FinancialAlert.objects.filter(
            user=self.user, month__year=self.month.year, month__month=self.month.month
        ).delete()

        for alert_data in alerts:
            FinancialAlert.objects.create(
                user=self.user,
                alert_type=alert_data["type"],
                title=alert_data["title"],
                message=alert_data["message"],
                month=self.month,
            )

    def get_financial_summary(self) -> Dict:
        """Retorna um resumo financeiro completo."""
        income = self.get_monthly_income()
        expenses_by_category = self.get_expenses_by_category()
        total_expenses = self.get_total_expenses()
        balance = self.calculate_balance()
        alerts = self.generate_financial_alerts()

        return {
            "month": self.month,
            "income": income,
            "total_expenses": total_expenses,
            "balance": balance,
            "expenses_by_category": expenses_by_category,
            "category_percentages": (
                {
                    category: self.calculate_category_percentage(amount, income)
                    for category, amount in expenses_by_category.items()
                }
                if income > 0
                else {}
            ),
            "alerts": alerts,
            "financial_health": self._calculate_financial_health(income, total_expenses),
        }

    def _calculate_financial_health(self, income: Decimal, total_expenses: Decimal) -> str:
        """Calcula o status da saúde financeira."""
        if income <= 0:
            return "unknown"

        expense_ratio = Decimal(total_expenses) / Decimal(income)

        if expense_ratio > 1.0:
            return "critical"
        elif expense_ratio > 0.9:
            return "poor"
        elif expense_ratio > 0.8:
            return "fair"
        elif expense_ratio > 0.7:
            return "good"
        else:
            return "excellent"
