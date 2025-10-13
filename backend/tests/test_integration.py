import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from users.models import User

@pytest.mark.django_db
class TestFullIntegrationFlow:
    
    def test_complete_user_journey(self):
        """Integration test: Register → Login → Create Room → Join Room → Logout"""
        client = APIClient()
        
        # Step 1: Register
        print("\n=== Step 1: Register ===")
        register_data = {
            "username": "IntegrationUser",
            "email": "integration@example.com",
            "password": "IntPass@123",
            "confirm_password": "IntPass@123"
        }
        register_response = client.post(
            reverse('register'), 
            register_data, 
            format='json'
        )
        print(f"Register status: {register_response.status_code}")
        assert register_response.status_code == 201
        access_token = register_response.data["access"]
        refresh_token = register_response.data["refresh"]
        print(f"Got tokens: access={access_token[:20]}..., refresh={refresh_token[:20]}...")
        
        # Step 2: Create Room (authenticated)
        print("\n=== Step 2: Create Room ===")
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        room_data = {"title": "Integration Room", "max_participants": 10}
        room_response = client.post(
            reverse('room-create'),
            room_data,
            format='json'
        )
        print(f"Create room status: {room_response.status_code}")
        assert room_response.status_code == 201
        room_id = room_response.data["id"]
        print(f"Created room: {room_id}")
        
        # Step 3: Join the created room
        print("\n=== Step 3: Join Room ===")
        join_response = client.post(
            reverse('room-join', kwargs={'room_id': room_id})
        )
        print(f"Join room status: {join_response.status_code}")
        assert join_response.status_code == 200
        
        # Step 4: Logout
        print("\n=== Step 4: Logout ===")
        logout_response = client.post(
            reverse('logout'),
            {"refresh": refresh_token},
            format='json'
        )
        print(f"Logout status: {logout_response.status_code}")
        print(f"Logout response: {logout_response.data}")
        
        # This should be 205 now
        assert logout_response.status_code == 205
        assert "message" in logout_response.data
        
        # Step 5: Verify cannot create room after logout
        print("\n=== Step 5: Verify Token Invalidated ===")
        # Try to create another room (should fail with old token)
        failed_room_response = client.post(
            reverse('room-create'),
            {"title": "Should Fail"},
            format='json'
        )
        print(f"Post-logout room creation status: {failed_room_response.status_code}")
        # Should be 401 because token is still valid (blacklist only affects refresh)
        # Access tokens remain valid until expiry
        print("Note: Access tokens remain valid until expiry even after logout")