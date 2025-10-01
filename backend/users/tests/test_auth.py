import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from users.models import User

@pytest.mark.django_db
def test_register_user():
    client = APIClient()
    url=reverse('register')
    data = {
        "username": "TestUser",
        "email": "testuser@example.com",
        "password": "TestPass@123",
        "confirm_password": "TestPass@123"
    }
    response = client.post(url, data, format='json')
    assert response.status_code == 201
    assert User.objects.filter(email='testuser@example.com').exists()

@pytest.mark.django_db
def test_login_user():
    user = User.objects.create_user(username='TestUser2', email="testuser2@example.com", password="TestPass@123")
    client = APIClient()
    url = reverse('login')
    data = {
        "email": "testuser2@example.com",
        "password": "TestPass@123"
    } 
    response = client.post(url, data, format='json')
    assert response.status_code == 200
    assert "access" in response.data
    assert "refresh"  in response.data