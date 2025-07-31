from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from expenses.serializers import ExpenseSerializer


@pytest.mark.django_db
def test_expense_serializer_valid():
    user = get_user_model().objects.create_user(username="test", password="123")
    data = {
        "user": user.id,
        "value": 100.0,
        "category": "Alimentação",
        "date": date.today(),
        "description": "Almoço",
    }
    serializer = ExpenseSerializer(data=data)
    assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
def test_expense_serializer_invalid_category():
    user = get_user_model().objects.create_user(username="test2", password="123")
    data = {
        "user": user.id,
        "value": 100.0,
        "category": "Proibida",
        "date": date.today(),
        "description": "Teste",
    }
    serializer = ExpenseSerializer(data=data)
    assert not serializer.is_valid()
    assert "category" in serializer.errors


@pytest.mark.django_db
def test_expense_serializer_invalid_date():
    user = get_user_model().objects.create_user(username="test3", password="123")
    data = {
        "user": user.id,
        "value": 100.0,
        "category": "Transporte",
        "date": date.today() + timedelta(days=1),
        "description": "Futuro",
    }
    serializer = ExpenseSerializer(data=data)
    assert not serializer.is_valid()
    assert "pydantic" in serializer.errors
