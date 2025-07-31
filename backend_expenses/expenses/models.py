import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.forms.models import model_to_dict
from django.utils import timezone
from django_extensions.db.models import TimeStampedModel

from .models_history import ExpenseHistory


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


# Signals para histórico de alterações
@receiver(post_save, sender=Expense)
def expense_post_save(sender, instance, created, **kwargs):
    action = "created" if created else "updated"
    user = getattr(instance, "user", None)
    data = model_to_dict(instance)
    for k, v in data.items():
        if isinstance(v, Decimal):
            data[k] = float(v)
        elif isinstance(v, (datetime.date, datetime.datetime)):
            data[k] = v.isoformat()
    ExpenseHistory.objects.create(
        expense=instance,
        user=user,
        action=action,
        data=data,
    )
    six_months_ago = timezone.now() - timezone.timedelta(days=180)
    qs = ExpenseHistory.objects.filter(expense=instance)
    qs.filter(date__lt=six_months_ago).delete()
    ids_to_keep = qs.order_by("-date").values_list("id", flat=True)[:100]
    qs.exclude(id__in=ids_to_keep).delete()


@receiver(post_delete, sender=Expense)
def expense_post_delete(sender, instance, **kwargs):
    user = getattr(instance, "user", None)
    data = model_to_dict(instance)
    for k, v in data.items():
        if isinstance(v, Decimal):
            data[k] = float(v)
        elif isinstance(v, (datetime.date, datetime.datetime)):
            data[k] = v.isoformat()
    ExpenseHistory.objects.create(
        expense=instance,
        user=user,
        action="deleted",
        data=data,
    )
