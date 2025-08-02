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
        "category": "alimentacao",
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
        "category": "transporte",
        "date": date.today() + timedelta(days=1),
        "description": "Futuro",
    }
    serializer = ExpenseSerializer(data=data)
    assert not serializer.is_valid()
    assert "validation" in serializer.errors


@pytest.mark.django_db
def test_expense_serializer_negative_value():
    user = get_user_model().objects.create_user(username="test4", password="123")
    data = {
        "user": user.id,
        "value": -50.0,
        "category": "alimentacao",
        "date": date.today(),
        "description": "Valor negativo",
    }
    serializer = ExpenseSerializer(data=data)
    assert not serializer.is_valid()
    assert "validation" in serializer.errors


@pytest.mark.django_db
def test_expense_serializer_missing_description():
    user = get_user_model().objects.create_user(username="test5", password="123")
    data = {
        "user": user.id,
        "value": 10.0,
        "category": "alimentacao",
        "date": date.today(),
        # 'description' ausente
    }
    serializer = ExpenseSerializer(data=data)
    assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
def test_expense_serializer_empty_description():
    user = get_user_model().objects.create_user(username="test6", password="123")
    data = {
        "user": user.id,
        "value": 10.0,
        "category": "alimentacao",
        "date": date.today(),
        "description": "",
    }
    serializer = ExpenseSerializer(data=data)
    assert serializer.is_valid(), serializer.errors
