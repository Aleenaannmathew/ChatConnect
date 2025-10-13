🎥 ChatConnect - Video Meeting Application
A full-stack real-time video conferencing application built with Django REST Framework, Django Channels, and React. Features include JWT authentication, WebRTC peer-to-peer video calling, WebSocket signaling, and real-time room management.

📋 Table of Contents

Features
Tech Stack
Architecture
Setup Instructions
Running the Application
API Documentation
Testing
Project Structure
Environment Variables
Troubleshooting


✨ Features
Backend (Django)

✅ User registration with email and password validation
✅ JWT-based authentication (access & refresh tokens)
✅ Token blacklisting on logout
✅ WebSocket support via Django Channels for real-time signaling
✅ Room creation and management APIs
✅ Redis-backed channel layer for WebSocket communication
✅ Comprehensive test coverage with pytest

Frontend (React)

✅ User registration and login with client-side validation
✅ Toast notifications for user feedback (success/error messages)
✅ JWT token auto-refresh using Axios interceptors
✅ WebRTC peer-to-peer video calling
✅ Real-time WebSocket signaling for offer/answer/ICE candidates
✅ Room creation and joining interface
✅ Responsive UI with Tailwind CSS
✅ Redux Toolkit for state management


🛠️ Tech Stack
LayerTechnologiesFrontendReact 18, Redux Toolkit, Axios, React Toastify, Tailwind CSSBackendDjango 5.2, Django REST Framework, Simple JWTWebSocketDjango Channels, Channels RedisVideoWebRTC (peer-to-peer)DatabaseSQLite (development) / PostgreSQL (production)Testingpytest, pytest-django, pytest-asyncioDevOpsRedis (Channel Layer), Daphne (ASGI server)

🏗️ Architecture
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   React     │  HTTP   │   Django     │  Redis  │   WebSocket │
│   Frontend  │◄───────►│   Backend    │◄───────►│   Consumer  │
│             │  JWT    │   (REST API) │ Channels│             │
└─────────────┘         └──────────────┘         └─────────────┘
       │                                                  │
       │                  WebRTC (P2P)                   │
       └──────────────────────────────────────────────────┘
           Signaling via WebSocket (offer/answer/ICE)

🚀 Setup Instructions
Prerequisites

Python 3.10+
Node.js 18+
Redis server
Git

1️⃣ Clone the Repository
bashgit clone <your-repo-url>
cd chatconnect
2️⃣ Backend Setup
bashcd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start Redis (required for Channels)
# On macOS: brew services start redis
# On Ubuntu: sudo service redis-server start
# On Windows: Install Redis from https://github.com/microsoftarchive/redis/releases
3️⃣ Frontend Setup
bashcd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOL
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000
EOL

▶️ Running the Application
Start Backend (Terminal 1)
bashcd backend
source venv/bin/activate
python manage.py runserver
Backend will run at: http://localhost:8000
Start Frontend (Terminal 2)
bashcd frontend
npm run dev
Frontend will run at: http://localhost:5173
Ensure Redis is Running (Terminal 3)
bashredis-server

📡 API Documentation
Authentication Endpoints
EndpointMethodDescriptionAuth Required/api/auth/register/POSTRegister new userNo/api/auth/login/POSTLogin userNo/api/auth/logout/POSTLogout userYes
Register Request
json{
  "username": "testuser",
  "email": "test@example.com",
  "password": "SecurePass@123",
  "confirm_password": "SecurePass@123"
}
Login Request
json{
  "email": "test@example.com",
  "password": "SecurePass@123"
}
Logout Request
json{
  "refresh": "<refresh_token>"
}
Room Endpoints
EndpointMethodDescriptionAuth Required/api/rooms/create/POSTCreate new roomYes/api/rooms/list/GETList active roomsYes/api/rooms/<uuid:id>/GETGet room detailsYes/api/rooms/<uuid:id>/join/POSTJoin a roomYes
Create Room Request
json{
  "title": "Team Meeting",
  "max_participants": 10
}
WebSocket Endpoint
URL: ws://localhost:8000/ws/room/<room_id>/
Message Types:

offer - WebRTC offer
answer - WebRTC answer
ice_candidate - ICE candidate
user_joined - New user notification
user_left - User disconnect notification
participant_update - Participant count update


🧪 Testing
Run Backend Tests
bashcd backend
pytest

# With coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest users/tests/test_auth_complete.py

# Run with verbose output
pytest -v
Test Coverage

✅ User registration (success, validation errors, duplicate email)
✅ User login (success, wrong credentials)
✅ User logout with token blacklisting
✅ Room creation (authorized and unauthorized)
✅ Room listing and joining
✅ Full integration flow (register → login → create room → logout)


📁 Project Structure
chatconnect/
│
├── backend/
│   ├── config/                 # Django project settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py            # ASGI config for Channels
│   │   └── wsgi.py
│   │
│   ├── users/                  # Authentication app
│   │   ├── models.py          # Custom User model
│   │   ├── serializers.py     # User serializers
│   │   ├── views.py           # Register/Login/Logout views
│   │   ├── urls.py
│   │   └── tests/
│   │       └── test_auth_complete.py
│   │
│   ├── rooms/                  # Room management app
│   │   ├── models.py          # Room model
│   │   ├── serializers.py     # Room serializers
│   │   ├── views.py           # Room CRUD operations
│   │   ├── consumers.py       # WebSocket consumer
│   │   ├── routing.py         # WebSocket routing
│   │   ├── urls.py
│   │   └── tests/
│   │       └── test_rooms.py
│   │
│   ├── tests/
│   │   └── test_integration.py  # Integration tests
│   │
│   ├── manage.py
│   ├── requirements.txt
│   ├── pytest.ini
│   └── db.sqlite3
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── store.js       # Redux store
    │   │   └── axios.js       # Axios config with interceptors
    │   │
    │   ├── components/
    │   │   └── Navbar.jsx
    │   │
    │   ├── features/
    │   │   ├── auth/
    │   │   │   ├── authSlice.js
    │   │   │   ├── Login.jsx
    │   │   │   └── Signup.jsx
    │   │   │
    │   │   └── rooms/
    │   │       ├── roomSlice.js
    │   │       ├── CreateRoom.jsx
    │   │       ├── JoinRoom.jsx
    │   │       └── VideoRoom.jsx
    │   │
    │   ├── pages/
    │   │   └── Home.jsx
    │   │
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    │
    ├── package.json
    ├── vite.config.js
    └── .env

🔧 Environment Variables
Backend (.env - optional)
envSECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=sqlite:///db.sqlite3
Frontend (.env)
envVITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000

🐛 Troubleshooting
WebSocket Connection Failed
Solution: Ensure Redis is running
bashredis-cli ping  # Should return "PONG"
"CSRF token missing or incorrect"
Solution: Check CORS settings in settings.py
pythonCORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
Video not appearing in VideoRoom
Solution:

Check browser console for WebRTC errors
Ensure HTTPS or localhost (camera permissions)
Verify STUN server connectivity

JWT Token Expired
Solution: Token auto-refreshes via Axios interceptor. Check axios.js configuration.

📝 Notes & Assumptions

SQLite is used for development. For production, migrate to PostgreSQL.
STUN servers used are public (Google). For production, consider TURN servers.
Redis is required for Django Channels layer.
Token expiry: Access token expires in 60 minutes, refresh token in 7 days.
Room cleanup: Inactive rooms are not auto-deleted (implement background task if needed).


👨‍💻 Author
Aleena Mathew


📄 License
This project is created for a machine test evaluation.

🙏 Acknowledgments

Django REST Framework for robust API development
Django Channels for WebSocket support
WebRTC for peer-to-peer video communication
React and Redux Toolkit for frontend state management