from rest_framework import serializers
from .models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ['id', 'user', 'value', 'category', 'date', 'description']
        read_only_fields = ['id', 'user']
