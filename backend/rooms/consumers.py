import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
import uuid

logger = logging.getLogger(__name__)

class VideoRoomConsumer(AsyncWebsocketConsumer):
    # Class-level storage for active users per room
    active_users = {}  # {room_id: set(user_ids)}

    async def connect(self):
        """Handle WebSocket connection for video rooms"""
        try:
            from .models import Room
        
            self.room_id = self.scope['url_route']['kwargs']['room_id']
            self.room_group_name = f'room_{self.room_id}'
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
                room.participant_count += 1
                await sync_to_async(room.save)()
                
                # Add user to active users list
                if self.room_id not in self.active_users:
                    self.active_users[self.room_id] = set()
                
                # Get existing users before adding new one
                existing_users = list(self.active_users[self.room_id])
                print(f"Existing users in room: {existing_users}")
                
                self.active_users[self.room_id].add(self.user_id)
                
                print(f"Updated participant count for room {self.room_id}: {room.participant_count}")
                
                # Send connection confirmation WITH USER ID and EXISTING USERS
                await self.send(text_data=json.dumps({
                    'type': 'connection_established',
                    'message': 'Connected to room successfully',
                    'room_id': self.room_id,
                    'userId': self.user_id,
                    'participant_count': room.participant_count,
                    'existing_users': existing_users  # Send list of existing users
                }))
                
                # Notify ALL clients (including sender) about participant update
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'participant_update',
                        'participant_count': room.participant_count,
                        'message': f'Total participants: {room.participant_count}'
                    }
                )
                
                # Notify OTHER clients that a new user joined
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_joined_notification',
                        'userId': self.user_id,
                        'username': f'User_{self.user_id[:8]}',
                        'participant_count': room.participant_count,
                        'sender_channel': self.channel_name
                    }
                )
                
            except Exception as e:
                print(f"Error updating participant count: {str(e)}")

        except Exception as e:
            print(f"Unexpected error in connect: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            from .models import Room
            
            print(f"WebSocket disconnecting from room: {self.room_id}, close code: {close_code}")
            
            # Remove user from active users
            if self.room_id in self.active_users:
                self.active_users[self.room_id].discard(self.user_id)
                if not self.active_users[self.room_id]:
                    del self.active_users[self.room_id]
            
            # Notify others BEFORE leaving the group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left_notification',
                    'userId': self.user_id,
                    'sender_channel': self.channel_name
                }
            )
            
            # Update participant count
            try:
                room = await sync_to_async(Room.objects.get)(id=self.room_id)
                if room.participant_count > 0:
                    room.participant_count -= 1
                    await sync_to_async(room.save)()
                    print(f"Updated participant count for room {self.room_id}: {room.participant_count}")
                    
                    # Notify all clients about updated participant count
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'participant_update',
                            'participant_count': room.participant_count,
                            'message': f'User left room. Total participants: {room.participant_count}'
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
        """Handle messages received from WebSocket"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', '')
            
            print(f"Received message type '{message_type}' from user {self.user_id}")
            
            # Add sender info
            data['senderUserId'] = self.user_id
            data['sender_channel'] = self.channel_name
            
            # Route message based on type
            if message_type == 'offer':
                await self.handle_offer(data)
            elif message_type == 'answer':
                await self.handle_answer(data)
            elif message_type == 'ice_candidate':
                await self.handle_ice_candidate(data)
            elif message_type == 'chat_message':
                await self.handle_chat_message(data)
            else:
                print(f"Unknown message type: {message_type}")

        except json.JSONDecodeError:
            print("Invalid JSON received")
            await self.send(text_data=json.dumps({'error': 'Invalid JSON format'}))
        except Exception as e:
            print(f"Error processing received message: {str(e)}")

    async def handle_offer(self, data):
        """Handle WebRTC offer"""
        target_user_id = data.get('targetUserId')
        if not target_user_id:
            print("No target user ID in offer")
            return
            
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_offer',
                'offer': data.get('offer'),
                'sender_user_id': self.user_id,
                'target_user_id': target_user_id,
                'sender_channel': self.channel_name
            }
        )

    async def handle_answer(self, data):
        """Handle WebRTC answer"""
        target_user_id = data.get('targetUserId')
        if not target_user_id:
            print("No target user ID in answer")
            return
            
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_answer',
                'answer': data.get('answer'),
                'sender_user_id': self.user_id,
                'target_user_id': target_user_id,
                'sender_channel': self.channel_name
            }
        )

    async def handle_ice_candidate(self, data):
        """Handle ICE candidate"""
        target_user_id = data.get('targetUserId')
        if not target_user_id:
            print("No target user ID in ICE candidate")
            return
            
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_ice',
                'candidate': data.get('candidate'),
                'sender_user_id': self.user_id,
                'target_user_id': target_user_id,
                'sender_channel': self.channel_name
            }
        )

    async def handle_chat_message(self, data):
        """Handle chat message"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message_broadcast',
                'message': data.get('message', ''),
                'username': data.get('username', 'Anonymous'),
                'sender_channel': self.channel_name
            }
        )

    # Group message handlers
    async def webrtc_offer(self, event):
        """Send offer to specific target user"""
        if self.user_id == event['target_user_id']:
            await self.send(text_data=json.dumps({
                'type': 'offer',
                'offer': event['offer'],
                'userId': event['sender_user_id']
            }))

    async def webrtc_answer(self, event):
        """Send answer to specific target user"""
        if self.user_id == event['target_user_id']:
            await self.send(text_data=json.dumps({
                'type': 'answer',
                'answer': event['answer'],
                'userId': event['sender_user_id']
            }))

    async def webrtc_ice(self, event):
        """Send ICE candidate to specific target user"""
        if self.user_id == event['target_user_id']:
            await self.send(text_data=json.dumps({
                'type': 'ice_candidate',
                'candidate': event['candidate'],
                'userId': event['sender_user_id']
            }))

    async def user_joined_notification(self, event):
        """Notify about new user (exclude sender)"""
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'userId': event['userId'],
                'username': event.get('username', 'Anonymous'),
                'participant_count': event.get('participant_count', 0)
            }))

    async def user_left_notification(self, event):
        """Notify about user leaving (exclude sender)"""
        if event['sender_channel'] != self.channel_name:
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'userId': event['userId']
            }))

    async def participant_update(self, event):
        """Send participant count update to all"""
        await self.send(text_data=json.dumps({
            'type': 'participant_update',
            'participant_count': event['participant_count'],
            'message': event.get('message', '')
        }))

    async def chat_message_broadcast(self, event):
        """Broadcast chat message to all"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message'],
            'username': event['username']
        }))