from datetime import date, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from expenses.models import Expense
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_filter_expense_by_created():
    user = get_user_model().objects.create_user(username="filteruser", password="123")
    expense1 = Expense.objects.create(
        user=user, value=10, category="Alimentação", date=date.today()
    )
    expense2 = Expense.objects.create(
        user=user, value=20, category="Transporte", date=date.today()
    )
    new_created = timezone.now() - timedelta(days=1)
    Expense.objects.filter(id=expense1.id).update(created=new_created)
    expense1.refresh_from_db()
    client = APIClient()
    client.force_authenticate(user=user)
    created_str = new_created.date().isoformat()
    response = client.get(f"/api/expenses/?created_date={created_str}")
    assert response.status_code == 200
    results = response.data["results"] if "results" in response.data else response.data
    ids = [exp["id"] for exp in results]
    assert expense1.id in ids
    assert expense2.id not in ids


@pytest.mark.django_db
def test_expense_created_and_modified_in_response():
    user = get_user_model().objects.create_user(username="checkfields", password="123")
    expense = Expense.objects.create(
        user=user, value=15, category="Lazer", date=date.today()
    )
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get(f"/api/expenses/{expense.id}/")
    assert response.status_code == 200
    assert "created" in response.data
    assert "modified" in response.data
