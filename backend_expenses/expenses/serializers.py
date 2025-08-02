from rest_framework import serializers

from .models import Expense, FinancialAlert, MonthlyIncome
from .schemas import ExpenseSchema, MonthlyIncomeSchema


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
        try:
            ExpenseSchema(**data)
        except Exception as e:
            raise serializers.ValidationError({"validation": str(e)})
        return data


class MonthlyIncomeSerializer(serializers.ModelSerializer):
    """Serializer para renda mensal."""

    class Meta:
        model = MonthlyIncome
        fields = [
            "id",
            "user",
            "month",
            "amount",
            "created",
            "modified",
        ]
        read_only_fields = ["id", "user", "created", "modified"]

    def validate(self, data):
        try:
            MonthlyIncomeSchema(**data)
        except Exception as e:
            raise serializers.ValidationError({"validation": str(e)})

        if "month" in data:
            data["month"] = data["month"].replace(day=1)

        if self.instance is None:
            user = self.context["request"].user
            month = data.get("month")
            if (
                month
                and MonthlyIncome.objects.filter(
                    user=user, month__year=month.year, month__month=month.month
                ).exists()
            ):
                raise serializers.ValidationError(
                    {"month": "Já existe uma renda registrada para este mês."}
                )

        return data


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
