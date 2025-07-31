import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from expenses.models import Expense
from datetime import date

@pytest.mark.django_db
def test_create_expense_authenticated():
    user = get_user_model().objects.create_user(username='apiuser', password='123')
    client = APIClient()
    client.force_authenticate(user=user)
    data = {
        'value': 50.0,
        'category': 'Alimentação',
        'date': date.today(),
        'description': 'Jantar',
    }
    response = client.post('/api/expenses/', data, format='json')
    assert response.status_code == 201
    assert Expense.objects.filter(user=user, value=50.0).exists()

@pytest.mark.django_db
def test_list_expenses_only_own():
    user1 = get_user_model().objects.create_user(username='user1', password='123')
    user2 = get_user_model().objects.create_user(username='user2', password='123')
    Expense.objects.create(user=user1, value=10, category='Alimentação', date=date.today())
    Expense.objects.create(user=user2, value=20, category='Transporte', date=date.today())
    client = APIClient()
    client.force_authenticate(user=user1)
    response = client.get('/api/expenses/')
    assert response.status_code == 200
    assert all(exp['user'] == user1.id for exp in response.data)

@pytest.mark.django_db
def test_create_expense_unauthenticated():
    client = APIClient()
    data = {
        'value': 30.0,
        'category': 'Alimentação',
        'date': date.today(),
        'description': 'Lanche',
    }
    response = client.post('/api/expenses/', data, format='json')
    assert response.status_code in (401, 403)
