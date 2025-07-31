from django.contrib import admin

from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "category", "value", "date")
    list_filter = ("category", "date", "user")
    search_fields = ("category", "description", "user__username")
    date_hierarchy = "date"
    ordering = ("-date",)


# Register your models here.
