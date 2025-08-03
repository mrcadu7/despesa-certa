from rest_framework import serializers

from django.db.models import Sum

from .models import Expense, FinancialAlert, MonthlyIncome
from .schemas import ExpensePartialSchema, ExpenseSchema, MonthlyIncomeSchema


class ExpenseSerializer(serializers.ModelSerializer):
    """Serializer para despesas."""

    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "user",
            "value",
            "category",
            "date",
            "description",
            "created",
            "modified",
        ]
        read_only_fields = ["id", "user", "created", "modified"]

    def validate(self, data):
        input_data = {**getattr(self, "initial_data", {}), **data}
        if self.partial:
            schema = ExpensePartialSchema
        else:
            schema = ExpenseSchema
        try:
            schema(**input_data)
        except Exception as e:
            raise serializers.ValidationError({"validation": str(e)})
        return data


class MonthlyIncomeSerializer(serializers.ModelSerializer):
    """Serializer para renda mensal."""

    total_month_income = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyIncome
        fields = [
            "id",
            "user",
            "date",
            "amount",
            "description",
            "income_type",
            "is_recurring",
            "created",
            "modified",
            "total_month_income",
        ]
        read_only_fields = ["id", "user", "created", "modified"]

    def validate(self, data):
        try:
            MonthlyIncomeSchema(**{**self.initial_data, **data})
        except Exception as e:
            raise serializers.ValidationError({"validation": str(e)})
        return data

    def get_total_month_income(self, obj):
        user = obj.user
        date = obj.date
        total = (
            MonthlyIncome.objects.filter(
                user=user, date__year=date.year, date__month=date.month
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )
        return total


class FinancialAlertSerializer(serializers.ModelSerializer):
    """Serializer para alertas financeiros."""

    class Meta:
        model = FinancialAlert
        fields = [
            "id",
            "alert_type",
            "title",
            "message",
            "month",
            "created",
            "is_read",
        ]
        read_only_fields = ["id", "created"]


class FinancialSummarySerializer(serializers.Serializer):
    """Serializer para o resumo financeiro."""

    month = serializers.DateField()
    income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    expenses_by_category = serializers.DictField()
    category_percentages = serializers.DictField()
    alerts = serializers.ListField()
    financial_health = serializers.CharField()
