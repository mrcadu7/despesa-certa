from django.db import models


from django.contrib.auth import get_user_model

class Expense(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='expenses')
    value = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=50)
    date = models.DateField()
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.category} - ${self.value} on {self.date}"
