from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Room
from .serializers import RoomSerializer, RoomCreateSerializer

class RoomCreateView(generics.CreateAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(host=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = self.perform_create(serializer)
        
        # Return the full room data including ID
        response_serializer = RoomSerializer(room)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        return serializer.save(host=self.request.user)

class RoomListView(generics.ListAPIView):
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Room.objects.filter(is_active=True)

class RoomDetailView(generics.RetrieveAPIView):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

class RoomJoinView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, room_id):
        try:
            room = Room.objects.get(id=room_id, is_active=True)
            
            # Check if room is full using the participant_count field
            if room.participant_count >= room.max_participants:
                return Response(
                    {"error": "Room is full"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if user is already in the room
            if room.participants.filter(id=request.user.id).exists():
                return Response(
                    {"message": "Already in room", "room_id": str(room.id)},
                    status=status.HTTP_200_OK
                )
            
            # Add user to participants and update count
            room.participants.add(request.user)
            room.participant_count = room.participants.count()  # Update the count
            room.save()
            
            return Response({
                "message": "Joined room successfully", 
                "room_id": str(room.id),
                "room_title": room.title,
                "host_name": room.host.username,
                "participant_count": room.participant_count,
                "max_participants": room.max_participants
            })
            
        except Room.DoesNotExist:
            return Response(
                {"error": "Room not found or inactive"}, 
                status=status.HTTP_404_NOT_FOUND
            )