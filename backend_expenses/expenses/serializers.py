from rest_framework import serializers
from .models import Expense
from .schemas import ExpenseSchema


class ExpenseSerializer(serializers.ModelSerializer):
    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Expense
        fields = ['id', 'user', 'value', 'category', 'date', 'description', 'created', 'modified']
        read_only_fields = ['id', 'user', 'created', 'modified']

    def validate(self, data):
        if data.get('category', '').lower() == 'proibida':
            raise serializers.ValidationError({'category': 'Categoria não permitida.'})
        try:
            ExpenseSchema(**data)
        except Exception as e:
            raise serializers.ValidationError({'pydantic': str(e)})
        return data
