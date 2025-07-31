from django.contrib.auth import get_user_model
from django.db import models
from django_extensions.db.models import TimeStampedModel


class ExpenseQuerySet(models.QuerySet):
    def for_user(self, user):
        if user.is_staff or user.is_superuser:
            return self.all()
        return self.filter(user=user)

    def by_category(self, category):
        return self.filter(category=category)

    def by_period(self, start_date, end_date):
        return self.filter(date__gte=start_date, date__lte=end_date)

    def with_min_value(self, min_value):
        return self.filter(value__gte=min_value)

    def with_max_value(self, max_value):
        return self.filter(value__lte=max_value)

    def search_description(self, text):
        return self.filter(description__icontains=text)


class Expense(TimeStampedModel, models.Model):
    user = models.ForeignKey(
        get_user_model(), on_delete=models.CASCADE, related_name="expenses"
    )
    value = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=50)
    date = models.DateField()
    description = models.TextField(blank=True)

    objects = ExpenseQuerySet.as_manager()

    def __str__(self):
        return f"{self.category} - ${self.value} on {self.date}"

    class Meta:
        ordering = ["-date"]
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"
