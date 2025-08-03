import datetime
from decimal import Decimal

from django_extensions.db.models import TimeStampedModel

from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.forms.models import model_to_dict
from django.utils import timezone


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


class MonthlyIncome(TimeStampedModel, models.Model):
    """Modelo para armazenar a renda mensal do usuário."""

    user = models.ForeignKey(
        get_user_model(), on_delete=models.CASCADE, related_name="monthly_incomes"
    )
    date = models.DateField()  # Data real da renda
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    income_type = models.CharField(max_length=50, blank=True)
    is_recurring = models.BooleanField(default=False)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user.username} - {self.date.strftime('%d/%m/%Y')} - R$ {self.amount}"


class FinancialAlert(models.Model):
    """Modelo para armazenar alertas financeiros gerados."""

    ALERT_TYPES = [
        ("warning", "Atenção"),
        ("danger", "Crítico"),
        ("info", "Informativo"),
        ("success", "Positivo"),
    ]

    user = models.ForeignKey(
        get_user_model(), on_delete=models.CASCADE, related_name="financial_alerts"
    )
    alert_type = models.CharField(max_length=10, choices=ALERT_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    month = models.DateField()  # Mês de referência do alerta
    created = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created"]

    def __str__(self):
        return f"{self.user.username} - {self.title}"


class Expense(TimeStampedModel, models.Model):
    CATEGORY_CHOICES = [
        ("moradia", "Moradia"),
        ("alimentacao", "Alimentação"),
        ("transporte", "Transporte"),
        ("saude", "Saúde"),
        ("educacao", "Educação"),
        ("lazer", "Lazer"),
        ("vestuario", "Vestuário"),
        ("servicos", "Serviços"),
        ("dividas", "Dívidas"),
        ("investimentos", "Investimentos"),
        ("outros", "Outros"),
    ]

    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name="expenses")
    value = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    date = models.DateField()
    description = models.TextField(blank=True)

    objects = ExpenseQuerySet.as_manager()

    def __str__(self):
        return f"{self.get_category_display()} - R$ {self.value} em {self.date}"

    class Meta:
        ordering = ["-date"]
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"


class ExpenseHistory(models.Model):
    ACTION_CHOICES = [
        ("created", "Created"),
        ("updated", "Updated"),
        ("deleted", "Deleted"),
    ]
    expense = models.ForeignKey(
        "expenses.Expense", on_delete=models.CASCADE, related_name="history"
    )
    user = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    date = models.DateTimeField(auto_now_add=True)
    data = models.JSONField()

    def __str__(self):
        return f"{self.expense} - {self.action} em {self.date:%Y-%m-%d %H:%M}"


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


@receiver(pre_delete, sender=Expense)
def expense_pre_delete(sender, instance, **kwargs):
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
