from datetime import date
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from django.contrib.auth import get_user_model

from expenses.models import Expense


@pytest.mark.django_db
def test_create_expense_authenticated_jwt():
    user = get_user_model().objects.create_user(username="jwtuser", password="123")
    client = APIClient()
    response = client.post("/api/token/", {"username": "jwtuser", "password": "123"}, format="json")
    assert response.status_code == 200
    access = response.data["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    data = {
        "value": 77.77,
        "category": "transporte",
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
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_update_expense_owner():
    user = get_user_model().objects.create_user(username="owner", password="123")
    expense = Expense.objects.create(user=user, value=10, category="alimentacao", date=date.today())
    client = APIClient()
    client.force_authenticate(user=user)
    data = {
        "value": 99.99,
        "category": "alimentacao",
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
        user=owner, value=10, category="alimentacao", date=date.today()
    )
    client = APIClient()
    client.force_authenticate(user=other)
    data = {
        "value": 50,
        "category": "alimentacao",
        "date": date.today(),
        "description": "Hack",
    }
    response = client.put(f"/api/expenses/{expense.id}/", data, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_delete_expense_owner():
    user = get_user_model().objects.create_user(username="delowner", password="123")
    expense = Expense.objects.create(user=user, value=10, category="alimentacao", date=date.today())
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
        user=owner, value=10, category="alimentacao", date=date.today()
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
        "category": "alimentacao",
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
    Expense.objects.create(user=user1, value=10, category="alimentacao", date=date.today())
    Expense.objects.create(user=user2, value=20, category="transporte", date=date.today())
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
        "category": "alimentacao",
        "date": date.today(),
        "description": "Lanche",
    }
    response = client.post("/api/expenses/", data, format="json")
    assert response.status_code in (401, 403)


@pytest.mark.django_db
def test_bulk_patch_expenses_owner():
    user = get_user_model().objects.create_user(username="bulkpatch", password="123")
    client = APIClient()
    client.force_authenticate(user=user)
    exp1 = Expense.objects.create(
        user=user, value=10, category="alimentacao", date=date.today(), description="A"
    )
    exp2 = Expense.objects.create(
        user=user, value=20, category="transporte", date=date.today(), description="B"
    )
    ids = [exp1.id, exp2.id]
    patch_data = {"category": "moradia", "description": "Editado em massa"}
    response = client.patch(
        "/api/expenses/bulk_update/", {"ids": ids, "data": patch_data}, format="json"
    )
    assert response.status_code == 200
    exp1.refresh_from_db()
    exp2.refresh_from_db()
    assert exp1.category == "moradia"
    assert exp2.category == "moradia"
    assert exp1.description == "Editado em massa"
    assert exp2.description == "Editado em massa"


@pytest.mark.django_db
def test_bulk_patch_expenses_not_owner():
    owner = get_user_model().objects.create_user(username="bulkowner", password="123")
    other = get_user_model().objects.create_user(username="bulkother", password="123")
    exp1 = Expense.objects.create(
        user=owner, value=10, category="alimentacao", date=date.today(), description="A"
    )
    exp2 = Expense.objects.create(
        user=owner, value=20, category="transporte", date=date.today(), description="B"
    )
    ids = [exp1.id, exp2.id]
    client = APIClient()
    client.force_authenticate(user=other)
    patch_data = {"category": "moradia"}
    response = client.patch(
        "/api/expenses/bulk_update/", {"ids": ids, "data": patch_data}, format="json"
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_bulk_delete_expenses_owner():
    user = get_user_model().objects.create_user(username="bulkdel", password="123")
    client = APIClient()
    client.force_authenticate(user=user)
    exp1 = Expense.objects.create(user=user, value=10, category="alimentacao", date=date.today())
    exp2 = Expense.objects.create(user=user, value=20, category="transporte", date=date.today())
    ids = [exp1.id, exp2.id]
    response = client.delete("/api/expenses/bulk_delete/", {"ids": ids}, format="json")
    assert response.status_code == 200
    assert not Expense.objects.filter(id__in=ids).exists()


@pytest.mark.django_db
def test_bulk_delete_expenses_not_owner():
    owner = get_user_model().objects.create_user(username="bulkdelowner", password="123")
    other = get_user_model().objects.create_user(username="bulkdelother", password="123")
    exp1 = Expense.objects.create(user=owner, value=10, category="alimentacao", date=date.today())
    exp2 = Expense.objects.create(user=owner, value=20, category="transporte", date=date.today())
    ids = [exp1.id, exp2.id]
    client = APIClient()
    client.force_authenticate(user=other)
    response = client.delete("/api/expenses/bulk_delete/", {"ids": ids}, format="json")
    assert response.status_code == 403
