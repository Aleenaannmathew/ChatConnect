import os
import django
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
from django.urls import re_path
import rooms.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

application = ProtocolTypeRouter({
    # Handle HTTP requests
    'http': get_asgi_application(),
    
    # Handle WebSocket connections
    'websocket': AuthMiddlewareStack(
        URLRouter(
            rooms.routing.websocket_urlpatterns
        )
    ),
})