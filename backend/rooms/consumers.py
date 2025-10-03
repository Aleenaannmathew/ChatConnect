import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
import uuid

logger = logging.getLogger(__name__)

class VideoRoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        Handle WebSocket connection for video rooms
        """
        try:
            from .models import Room
        
            self.room_id = self.scope['url_route']['kwargs']['room_id']
            self.room_group_name = f'room_{self.room_id}'
            # Generate a unique user ID for this connection
            self.user_id = str(uuid.uuid4())
        
            print(f"WebSocket connection attempt for room: {self.room_id}, user: {self.user_id}")
        
            # Check if room exists
            try:
                room = await sync_to_async(Room.objects.get)(id=self.room_id)
                print(f"Room found: {room.id}")
            except Exception as e:
                print(f"Room {self.room_id} does not exist or error: {e}")
                await self.close(code=4004)
                return

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
        
            # Accept the connection
            await self.accept()
            print(f"WebSocket connected successfully to room: {self.room_id}")
        
            # Update participant count
            try:
                # Increment participant count
                room.participant_count += 1
                await sync_to_async(room.save)()
                
                print(f"Updated participant count for room {self.room_id}: {room.participant_count}")
                
                # Send connection confirmation WITH USER ID
                await self.send(text_data=json.dumps({
                    'type': 'connection_established',
                    'message': 'Connected to room successfully',
                    'room_id': self.room_id,
                    'userId': self.user_id  # This is crucial
                }))
                
                # Notify all clients about the new participant count
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'participant_update',
                        'participant_count': room.participant_count,
                        'message': f'Total participants: {room.participant_count}'
                    }
                )
                
                # Send user_joined message to all OTHER clients
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_joined',
                        'userId': self.user_id,
                        'username': f'User_{self.user_id[:8]}',
                        'participant_count': room.participant_count,
                        'sender_channel': self.channel_name
                    }
                )
                
            except Exception as e:
                print(f"Error updating participant count: {str(e)}")
                await self.send(text_data=json.dumps({
                    'type': 'connection_established',
                    'message': 'Connected to room successfully',
                    'room_id': self.room_id,
                    'userId': self.user_id
                }))

        except Exception as e:
            print(f"Unexpected error in connect: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection
        """
        try:
            from .models import Room
            
            print(f"WebSocket disconnecting from room: {self.room_id}, close code: {close_code}")
            
            # Update participant count
            try:
                room = await sync_to_async(Room.objects.get)(id=self.room_id)
                if room.participant_count > 0:
                    room.participant_count -= 1
                    await sync_to_async(room.save)()
                    print(f"Updated participant count for room {self.room_id}: {room.participant_count}")
                    
                    # Notify all clients in the room about the updated participant count
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'participant_update',
                            'participant_count': room.participant_count,
                            'message': f'User left room. Total participants: {room.participant_count}'
                        }
                    )
                    
                    # Send user_left message to all OTHER clients
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'user_left',
                            'userId': self.user_id,
                            'sender_channel': self.channel_name
                        }
                    )
            except Exception as e:
                print(f"Error updating participant count during disconnect: {str(e)}")

            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

        except Exception as e:
            print(f"Unexpected error in disconnect: {str(e)}")

    async def receive(self, text_data):
        """
        Handle messages received from WebSocket
        """
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', '')
            
            print(f"Received message of type '{message_type}' in room {self.room_id} from user {self.user_id}")
            
            # Add sender user ID to the message
            text_data_json['senderUserId'] = self.user_id
            
            # Handle different message types
            if message_type in ['offer', 'answer', 'ice_candidate']:
                # Broadcast WebRTC signaling messages to the specific target user
                target_user_id = text_data_json.get('targetUserId')
                if target_user_id:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'webrtc_signal',
                            'data': text_data_json,
                            'sender_channel': self.channel_name,
                            'target_user_id': target_user_id
                        }
                    )
            elif message_type in ['user_joined', 'user_left']:
                # Broadcast user status messages to all clients
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'broadcast_message',
                        'message_type': message_type,
                        'data': text_data_json,
                        'sender_channel': self.channel_name
                    }
                )
            elif message_type == 'chat_message':
                message = text_data_json.get('message', '')
                username = text_data_json.get('username', 'Anonymous')
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                        'username': username
                    }
                )
            else:
                print(f"Unknown message type: {message_type}")

        except json.JSONDecodeError:
            print("Invalid JSON received")
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON format'
            }))
        except Exception as e:
            print(f"Error processing received message: {str(e)}")
            await self.send(text_data=json.dumps({
                'error': 'Failed to process message'
            }))

    async def webrtc_signal(self, event):
        """
        Handle WebRTC signaling messages (offer, answer, ice_candidate)
        Only send to the specific target user
        """
        try:
            target_user_id = event['target_user_id']
            data = event['data']
            
            # Only send if this connection is the target
            if self.user_id == target_user_id:
                await self.send(text_data=json.dumps({
                    'type': data['type'],
                    data['type']: data.get(data['type']),
                    'userId': event['data'].get('senderUserId'),  # The user who sent this signal
                    'targetUserId': target_user_id
                }))
        except Exception as e:
            print(f"Error sending WebRTC signal: {str(e)}")

    async def broadcast_message(self, event):
        """
        Broadcast general messages to all clients except sender
        """
        try:
            if event['sender_channel'] != self.channel_name:
                message_data = event['data'].copy()
                # Ensure the userId is included
                if 'userId' not in message_data:
                    message_data['userId'] = event['data'].get('senderUserId', '')
                
                await self.send(text_data=json.dumps({
                    'type': event['message_type'],
                    **message_data
                }))
        except Exception as e:
            print(f"Error broadcasting message: {str(e)}")

    async def user_joined(self, event):
        """
        Handle user joined messages - send to all OTHER clients
        """
        try:
            if event['sender_channel'] != self.channel_name:
                await self.send(text_data=json.dumps({
                    'type': 'user_joined',
                    'userId': event['userId'],
                    'username': event.get('username', 'Anonymous'),
                    'participant_count': event.get('participant_count', 0)
                }))
        except Exception as e:
            print(f"Error sending user joined message: {str(e)}")

    async def user_left(self, event):
        """
        Handle user left messages - send to all OTHER clients
        """
        try:
            if event['sender_channel'] != self.channel_name:
                await self.send(text_data=json.dumps({
                    'type': 'user_left',
                    'userId': event['userId']
                }))
        except Exception as e:
            print(f"Error sending user left message: {str(e)}")

    async def chat_message(self, event):
        """
        Handle chat messages from room group
        """
        try:
            message = event['message']
            username = event['username']
            
            await self.send(text_data=json.dumps({
                'type': 'chat_message',
                'message': message,
                'username': username
            }))
        except Exception as e:
            print(f"Error sending chat message: {str(e)}")

    async def participant_update(self, event):
        """
        Handle participant count updates
        """
        try:
            participant_count = event['participant_count']
            message = event.get('message', '')
            
            await self.send(text_data=json.dumps({
                'type': 'participant_update',
                'participant_count': participant_count,
                'message': message
            }))
        except Exception as e:
            print(f"Error sending participant update: {str(e)}")