import django_filters

from .models import Expense, MonthlyIncome


class MonthlyIncomeFilter(django_filters.FilterSet):
    date_start = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_end = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    is_recurring = django_filters.BooleanFilter(field_name="is_recurring")
    income_type = django_filters.CharFilter(field_name="income_type", lookup_expr="exact")
    description = django_filters.CharFilter(field_name="description", lookup_expr="icontains")

    class Meta:
        model = MonthlyIncome
        fields = ["date", "income_type", "is_recurring", "description", "date_start", "date_end"]


class ExpenseFilter(django_filters.FilterSet):
    created_date = django_filters.DateFilter(field_name="created", lookup_expr="date")
    modified_date = django_filters.DateFilter(field_name="modified", lookup_expr="date")

    class Meta:
        model = Expense
        fields = ["date", "category", "value", "created_date", "modified_date"]
