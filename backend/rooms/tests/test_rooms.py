import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from users.models import User
from rooms.models import Room

@pytest.mark.django_db
class TestRoomOperations:
    
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='RoomTestUser',
            email='roomtest@example.com',
            password='RoomPass@123'
        )
        # Login to get token
        login_response = self.client.post(reverse('login'), {
            "email": "roomtest@example.com",
            "password": "RoomPass@123"
        })
        self.token = login_response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def test_create_room_success(self):
        """Test room creation"""
        url = reverse('room-create')
        data = {
            "title": "Test Meeting Room",
            "max_participants": 10
        }
        response = self.client.post(url, data, format='json')
        
        assert response.status_code == 201
        assert Room.objects.filter(title="Test Meeting Room").exists()
        assert "id" in response.data
    
    def test_create_room_unauthorized(self):
        """Test room creation without auth fails"""
        client = APIClient()  # No auth
        url = reverse('room-create')
        data = {"title": "Unauthorized Room"}
        response = client.post(url, data, format='json')
        assert response.status_code == 401
    
    def test_list_rooms(self):
        """Test listing active rooms"""
        Room.objects.create(host=self.user, title="Room 1", is_active=True)
        Room.objects.create(host=self.user, title="Room 2", is_active=True)
        
        url = reverse('room-list')
        response = self.client.get(url)
        
        assert response.status_code == 200
        assert len(response.data) >= 2
    
    def test_join_room_success(self):
        """Test joining a room"""
        room = Room.objects.create(
            host=self.user,
            title="Join Test Room",
            max_participants=5
        )
        
        url = reverse('room-join', kwargs={'room_id': room.id})
        response = self.client.post(url)
        
        assert response.status_code == 200
        assert "room_id" in response.data
    
    def test_join_full_room(self):
        """Test joining a full room fails"""
        # Create a room with max 1 participant
        room = Room.objects.create(host=self.user, title="Full Room", max_participants=1)
    
        # Fill the room with the host (already a participant)
        room.participants.add(self.user)
    
        # Create a new user who will attempt to join
        new_user = User.objects.create_user(
            username="AnotherUser",
            email="another@example.com",
            password="AnotherPass@123"
        )
    
        # Authenticate as the new user
        self.client.force_authenticate(user=new_user)
    
        url = reverse('room-join', kwargs={'room_id': room.id})
        response = self.client.post(url)
    
        assert response.status_code == 400
        assert "error" in response.data
