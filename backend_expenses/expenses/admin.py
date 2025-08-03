from django.contrib import admin

from .models import Expense, ExpenseHistory, FinancialAlert, MonthlyIncome


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


@admin.register(MonthlyIncome)
class MonthlyIncomeAdmin(admin.ModelAdmin):
    list_display = ("user", "date", "amount", "created")
    list_filter = ("date", "user")
    search_fields = ("user__username",)
    date_hierarchy = "date"
    ordering = ("-date",)


@admin.register(FinancialAlert)
class FinancialAlertAdmin(admin.ModelAdmin):
    list_display = ("user", "alert_type", "title", "month", "is_read", "created")
    list_filter = ("alert_type", "is_read", "month", "user")
    search_fields = ("user__username", "title", "message")
    date_hierarchy = "created"
    ordering = ("-created",)
    readonly_fields = ("created",)
