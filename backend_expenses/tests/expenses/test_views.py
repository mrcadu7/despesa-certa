from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from expenses.models import Expense
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_create_expense_authenticated_jwt():
    user = get_user_model().objects.create_user(username="jwtuser", password="123")
    client = APIClient()
    response = client.post(
        "/api/token/", {"username": "jwtuser", "password": "123"}, format="json"
    )
    assert response.status_code == 200
    access = response.data["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    data = {
        "value": 77.77,
        "category": "Transporte",
        "date": date.today(),
        "description": "Uber",
    }
    response = client.post("/api/expenses/", data, format="json")
    assert response.status_code == 201
    assert Expense.objects.filter(user=user, value=77.77).exists()


@pytest.mark.django_db
def test_create_expense_jwt_invalid_token():
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer invalidtoken")
    data = {
        "value": 99.99,
        "category": "Teste",
        "date": date.today(),
        "description": "Falha JWT",
    }
    response = client.post("/api/expenses/", data, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_update_expense_owner():
    user = get_user_model().objects.create_user(username="owner", password="123")
    expense = Expense.objects.create(
        user=user, value=10, category="Alimentação", date=date.today()
    )
    client = APIClient()
    client.force_authenticate(user=user)
    data = {
        "value": 99.99,
        "category": "Alimentação",
        "date": date.today(),
        "description": "Editado",
    }
    response = client.put(f"/api/expenses/{expense.id}/", data, format="json")
    assert response.status_code == 200
    expense.refresh_from_db()
    assert expense.value == Decimal("99.99")
    assert expense.description == "Editado"


@pytest.mark.django_db
def test_update_expense_not_owner():
    owner = get_user_model().objects.create_user(username="owner2", password="123")
    other = get_user_model().objects.create_user(username="other", password="123")
    expense = Expense.objects.create(
        user=owner, value=10, category="Alimentação", date=date.today()
    )
    client = APIClient()
    client.force_authenticate(user=other)
    data = {
        "value": 50,
        "category": "Alimentação",
        "date": date.today(),
        "description": "Hack",
    }
    response = client.put(f"/api/expenses/{expense.id}/", data, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_delete_expense_owner():
    user = get_user_model().objects.create_user(username="delowner", password="123")
    expense = Expense.objects.create(
        user=user, value=10, category="Alimentação", date=date.today()
    )
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.delete(f"/api/expenses/{expense.id}/")
    assert response.status_code == 204
    assert not Expense.objects.filter(id=expense.id).exists()


@pytest.mark.django_db
def test_delete_expense_not_owner():
    owner = get_user_model().objects.create_user(username="delowner2", password="123")
    other = get_user_model().objects.create_user(username="delother", password="123")
    expense = Expense.objects.create(
        user=owner, value=10, category="Alimentação", date=date.today()
    )
    client = APIClient()
    client.force_authenticate(user=other)
    response = client.delete(f"/api/expenses/{expense.id}/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_create_expense_authenticated():
    user = get_user_model().objects.create_user(username="apiuser", password="123")
    client = APIClient()
    client.force_authenticate(user=user)
    data = {
        "value": 50.0,
        "category": "Alimentação",
        "date": date.today(),
        "description": "Jantar",
    }
    response = client.post("/api/expenses/", data, format="json")
    assert response.status_code == 201
    assert Expense.objects.filter(user=user, value=50.0).exists()


@pytest.mark.django_db
def test_list_expenses_only_own():
    user1 = get_user_model().objects.create_user(username="user1", password="123")
    user2 = get_user_model().objects.create_user(username="user2", password="123")
    Expense.objects.create(
        user=user1, value=10, category="Alimentação", date=date.today()
    )
    Expense.objects.create(
        user=user2, value=20, category="Transporte", date=date.today()
    )
    client = APIClient()
    client.force_authenticate(user=user1)
    response = client.get("/api/expenses/")
    assert response.status_code == 200
    results = response.data["results"] if "results" in response.data else response.data
    assert all(exp["user"] == user1.id for exp in results)


@pytest.mark.django_db
def test_create_expense_unauthenticated():
    client = APIClient()
    data = {
        "value": 30.0,
        "category": "Alimentação",
        "date": date.today(),
        "description": "Lanche",
    }
    response = client.post("/api/expenses/", data, format="json")
    assert response.status_code in (401, 403)
