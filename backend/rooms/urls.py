from django.urls import path
from .views import RoomCreateView, RoomListView, RoomDetailView, RoomJoinView

urlpatterns = [
    path('create/', RoomCreateView.as_view(), name='room-create'),
    path('list/', RoomListView.as_view(), name='room-list'),
    path('<uuid:id>/', RoomDetailView.as_view(), name='room-detail'),
    path('<uuid:room_id>/join/', RoomJoinView.as_view(), name='room-join'),
]