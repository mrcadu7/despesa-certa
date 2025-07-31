import django_filters

from .models import Expense


class ExpenseFilter(django_filters.FilterSet):
    created_date = django_filters.DateFilter(field_name="created", lookup_expr="date")
    modified_date = django_filters.DateFilter(field_name="modified", lookup_expr="date")

    class Meta:
        model = Expense
        fields = ["date", "category", "value", "created_date", "modified_date"]
