import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)

class VideoRoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        Handle WebSocket connection for video rooms
        """
        try:
            # Import inside method to avoid circular imports
            from .models import Room
            
            self.room_id = self.scope['url_route']['kwargs']['room_id']
            self.room_group_name = f'room_{self.room_id}'
            
            logger.info(f"WebSocket connection attempt for room: {self.room_id}")
            
            # Check if room exists
            try:
                room = await sync_to_async(Room.objects.get)(id=self.room_id)
                logger.info(f"Room found: {room.id}")
            except Exception as e:
                logger.error(f"Room {self.room_id} does not exist or error: {e}")
                await self.close(code=4004)
                return

            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            # Accept the connection
            await self.accept()
            logger.info(f"WebSocket connected successfully to room: {self.room_id}")
            
            # Update participant count with error handling
            try:
                # Get current count safely
                current_count = await sync_to_async(lambda: room.participants.count())()
            
                # Update the room's participant_count field if it exists
                if hasattr(room, 'participant_count'):
                    room.participant_count = current_count
                    await sync_to_async(room.save)()
            
                logger.info(f"Participant count for room {self.room_id}: {current_count}")
            
                # Notify all clients
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'participant_update',
                        'participant_count': current_count,
                        'message': f'New user joined room. Total participants: {current_count}'
                    }
                )
            
            except Exception as e:
                logger.error(f"Error updating participant count: {str(e)}")

        except Exception as e:
            logger.error(f"Unexpected error in connect: {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection
        """
        try:
            # Import inside method to avoid circular imports
            from .models import Room
            
            logger.info(f"WebSocket disconnecting from room: {self.room_id}, close code: {close_code}")
            
            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            # Update participant count
            try:
                room = await sync_to_async(Room.objects.get)(id=self.room_id)
                if room.participant_count > 0:
                    room.participant_count -= 1
                    await sync_to_async(room.save)()
                    logger.info(f"Updated participant count for room {self.room_id}: {room.participant_count}")
                    
                    # Notify all clients in the room about the updated participant count
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'participant_update',
                            'participant_count': room.participant_count,
                            'message': f'User left room. Total participants: {room.participant_count}'
                        }
                    )
            except Exception as e:
                logger.error(f"Error updating participant count during disconnect: {str(e)}")

        except Exception as e:
            logger.error(f"Unexpected error in disconnect: {str(e)}")

    async def receive(self, text_data):
        """
        Handle messages received from WebSocket
        """
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'chat_message')
            
            logger.info(f"Received message of type '{message_type}' in room {self.room_id}")
            
            if message_type == 'chat_message':
                message = text_data_json.get('message', '')
                username = text_data_json.get('username', 'Anonymous')
                
                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                        'username': username
                    }
                )
            
            elif message_type == 'webrtc_offer':
                # Handle WebRTC offer
                offer = text_data_json.get('offer', {})
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'webrtc_offer',
                        'offer': offer,
                        'sender_channel': self.channel_name
                    }
                )
            
            elif message_type == 'webrtc_answer':
                # Handle WebRTC answer
                answer = text_data_json.get('answer', {})
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'webrtc_answer',
                        'answer': answer,
                        'sender_channel': self.channel_name
                    }
                )
            
            elif message_type == 'ice_candidate':
                # Handle ICE candidate
                candidate = text_data_json.get('candidate', {})
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'ice_candidate',
                        'candidate': candidate,
                        'sender_channel': self.channel_name
                    }
                )

        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f"Error processing received message: {str(e)}")
            await self.send(text_data=json.dumps({
                'error': 'Failed to process message'
            }))

    async def chat_message(self, event):
        """
        Handle chat messages from room group
        """
        try:
            message = event['message']
            username = event['username']
            
            # Send message to WebSocket
            await self.send(text_data=json.dumps({
                'type': 'chat_message',
                'message': message,
                'username': username
            }))
        except Exception as e:
            logger.error(f"Error sending chat message: {str(e)}")

    async def webrtc_offer(self, event):
        """
        Handle WebRTC offers from room group
        """
        try:
            # Only send to other clients, not back to sender
            if event['sender_channel'] != self.channel_name:
                await self.send(text_data=json.dumps({
                    'type': 'webrtc_offer',
                    'offer': event['offer']
                }))
        except Exception as e:
            logger.error(f"Error sending WebRTC offer: {str(e)}")

    async def webrtc_answer(self, event):
        """
        Handle WebRTC answers from room group
        """
        try:
            # Only send to other clients, not back to sender
            if event['sender_channel'] != self.channel_name:
                await self.send(text_data=json.dumps({
                    'type': 'webrtc_answer',
                    'answer': event['answer']
                }))
        except Exception as e:
            logger.error(f"Error sending WebRTC answer: {str(e)}")

    async def ice_candidate(self, event):
        """
        Handle ICE candidates from room group
        """
        try:
            # Only send to other clients, not back to sender
            if event['sender_channel'] != self.channel_name:
                await self.send(text_data=json.dumps({
                    'type': 'ice_candidate',
                    'candidate': event['candidate']
                }))
        except Exception as e:
            logger.error(f"Error sending ICE candidate: {str(e)}")

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
            logger.error(f"Error sending participant update: {str(e)}")