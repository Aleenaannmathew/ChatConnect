from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Room(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hosted_rooms')
    title = models.CharField(max_length=255, blank=True)
    participants = models.ManyToManyField(User, related_name='joined_rooms', blank=True)
    participant_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    max_participants = models.IntegerField(default=10)

    def __str__(self):
        return f"Room {self.id} - Host: {self.host.username}"
    
    def save(self, *args, **kwargs):
        # Update participant_count automatically
        if self.pk:
            self.participant_count = self.participants.count()
        super().save(*args, **kwargs)

        