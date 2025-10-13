import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from users.models import User

@pytest.mark.django_db
class TestCompleteAuthFlow:
    
    def setup_method(self):
        self.client = APIClient()
    
    def test_register_user_success(self):
        """Test successful user registration"""
        url = reverse('register')
        data = {
            "username": "NewUser",
            "email": "newuser@example.com",
            "password": "SecurePass@123",
            "confirm_password": "SecurePass@123"
        }
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == 201
        assert User.objects.filter(email='newuser@example.com').exists()
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["username"] == "NewUser"
    
    def test_register_duplicate_email(self):
        """Test registration with duplicate email fails"""
        User.objects.create_user(
            username='ExistingUser',
            email='existing@example.com',
            password='Pass123@'
        )
        
        url = reverse('register')
        data = {
            "username": "NewUser",
            "email": "existing@example.com",
            "password": "Pass123@",
            "confirm_password": "Pass123@"
        }
        response = self.client.post(url, data, format='json')
        assert response.status_code == 400
    
    def test_register_password_mismatch(self):
        """Test registration fails when passwords don't match"""
        url = reverse('register')
        data = {
            "username": "TestUser",
            "email": "test@example.com",
            "password": "Pass123@",
            "confirm_password": "DifferentPass123@"
        }
        response = self.client.post(url, data, format='json')
        assert response.status_code == 400
    
    def test_login_success(self):
        """Test successful login"""
        user = User.objects.create_user(
            username='LoginTest',
            email='login@example.com',
            password='LoginPass@123'
        )
        
        url = reverse('login')
        data = {
            "email": "login@example.com",
            "password": "LoginPass@123"
        }
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data
        assert response.data["user"]["email"] == "login@example.com"
    
    def test_login_wrong_password(self):
        """Test login with wrong password fails"""
        User.objects.create_user(
            username='UserWrong',
            email='wrong@example.com',
            password='CorrectPass@123'
        )
        
        url = reverse('login')
        data = {
            "email": "wrong@example.com",
            "password": "WrongPassword"
        }
        response = self.client.post(url, data, format='json')
        assert response.status_code == 401
    
    def test_logout_success(self):
        """Test successful logout with token blacklisting"""
        user = User.objects.create_user(
            username='LogoutUser',
            email='logout@example.com',
            password='LogoutPass@123'
        )
        
        # Login first
        login_url = reverse('login')
        login_data = {
            "email": "logout@example.com",
            "password": "LogoutPass@123"
        }
        login_response = self.client.post(login_url, login_data, format='json')
        refresh_token = login_response.data["refresh"]
        access_token = login_response.data["access"]
        
        # Now logout
        logout_url = reverse('logout')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = self.client.post(
            logout_url, 
            {"refresh": refresh_token}, 
            format='json'
        )
        
        assert logout_response.status_code == 205
        assert "message" in logout_response.data
    
    def test_logout_without_token(self):
        """Test logout fails without providing refresh token"""
        user = User.objects.create_user(
            username='NoTokenUser',
            email='notoken@example.com',
            password='Pass@123'
        )
        
        # Login first to get access token
        login_response = self.client.post(reverse('login'), {
            "email": "notoken@example.com",
            "password": "Pass@123"
        })
        access_token = login_response.data["access"]
        
        # Try logout without refresh token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        logout_response = self.client.post(reverse('logout'), {}, format='json')
        
        assert logout_response.status_code == 400
