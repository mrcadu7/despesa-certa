from django.contrib import admin

from .models import Expense
from .models_history import ExpenseHistory


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "category", "value", "date")
    list_filter = ("category", "date", "user")
    search_fields = ("category", "description", "user__username")
    date_hierarchy = "date"
    ordering = ("-date",)


@admin.register(ExpenseHistory)
class ExpenseHistoryAdmin(admin.ModelAdmin):
    list_display = ("expense", "user", "action", "date")
    list_filter = ("action", "date", "user")
    search_fields = ("expense__description", "user__username", "action")
    readonly_fields = ("expense", "user", "action", "date", "data")
