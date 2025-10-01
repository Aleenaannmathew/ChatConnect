from rest_framework import serializers
from .models import Room
from users.models import User

class RoomSerializer(serializers.ModelSerializer):
    host_name = serializers.CharField(source='host.username', read_only=True)
    participant_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ['id', 'host', 'host_name', 'title', 'participant_count', 'created_at', 'max_participants']
        read_only_fields = ['id', 'host', 'created_at']

    def get_participant_count(self, obj):
        return obj.participants.count()

class RoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['title', 'max_participants']