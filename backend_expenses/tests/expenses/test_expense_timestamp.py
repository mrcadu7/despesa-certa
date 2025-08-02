from datetime import date, timedelta

import pytest
from rest_framework.test import APIClient

from django.contrib.auth import get_user_model
from django.utils import timezone

from expenses.models import Expense


@pytest.mark.django_db
def test_filter_expense_by_created():
    user = get_user_model().objects.create_user(username="filteruser", password="123")

    now_local = timezone.localtime(timezone.now())

    old_created = now_local - timedelta(days=1)

    expense1 = Expense.objects.create(
        user=user, value=10, category="alimentacao", date=date.today()
    )

    Expense.objects.create(user=user, value=20, category="transporte", date=date.today())

    Expense.objects.filter(id=expense1.id).update(created=old_created)
    expense1.refresh_from_db()

    client = APIClient()
    client.force_authenticate(user=user)

    created_str = old_created.date().isoformat()
    response = client.get(f"/api/expenses/?created_date={created_str}")
    assert response.status_code == 200

    results = response.data["results"] if "results" in response.data else response.data

    assert len(results) == 1, f"Esperado 1 resultado, mas obteve {len(results)}"

    returned_expense = results[0]
    assert (
        returned_expense["id"] == expense1.id
    ), f"Esperado expense1 (ID {expense1.id}), mas obteve ID {returned_expense['id']}"
    assert returned_expense["category"] == "alimentacao", "Categoria incorreta retornada"


@pytest.mark.django_db
def test_expense_created_and_modified_in_response():
    user = get_user_model().objects.create_user(username="checkfields", password="123")
    expense = Expense.objects.create(user=user, value=15, category="lazer", date=date.today())
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get(f"/api/expenses/{expense.id}/")
    assert response.status_code == 200
    assert "created" in response.data
    assert "modified" in response.data
