import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { joinRoom } from './roomSlice';

export default function VideoRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { currentRoom } = useSelector((state) => state.rooms);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const ws = useRef(null);
    const pc = useRef(null);

    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [roomLink, setRoomLink] = useState('');
    const [participants, setParticipants] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    // WebSocket connection and room validation
    useEffect(() => {
        if (!roomId || roomId === 'undefined') {
            console.error('Invalid room ID:', roomId);
            alert('Invalid room ID. Please create a new meeting.');
            navigate('/');
            return;
        }
        console.log('Room ID:', roomId); // Debug log

        connectWebSocket();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (pc.current) {
                pc.current.close();
            }
        };
    }, [roomId, navigate]);

    const connectWebSocket = () => {
        const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/room/${roomId}/`;
        console.log('Connecting to WebSocket:', wsUrl);

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            joinRoomHandler();
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };

        ws.current.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    };

    const handleWebSocketMessage = (data) => {
        console.log('WebSocket message received:', data);

        switch (data.type) {
            case 'connection_established':
                console.log('Successfully connected to room:', data.room_id);
                break;

            case 'participant_update':
                console.log('Participant count updated:', data.participant_count);
                break;

            case 'webrtc_offer':
                console.log('Received WebRTC offer');
                handleOffer(data.offer);
                break;

            case 'webrtc_answer':
                console.log('Received WebRTC answer');
                handleAnswer(data.answer);
                break;

            case 'ice_candidate':
                console.log('Received ICE candidate');
                handleIceCandidate(data.candidate);
                break;

            case 'chat_message':
                console.log('Chat message:', data.message, 'from:', data.username);
                break;

            default:
                console.log('Unknown message type:', data.type);
        }
    };

    // WebRTC setup
    const initializeWebRTC = async () => {
        try {
            // Check if WebRTC is supported
            if (!window.RTCPeerConnection) {
                throw new Error('WebRTC is not supported in this browser');
            }

            // Create RTCPeerConnection
            const configuration = {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            };

            pc.current = new RTCPeerConnection(configuration);
            console.log('WebRTC peer connection created');

            // Handle incoming tracks
            pc.current.ontrack = (event) => {
                console.log('Received remote stream:', event.streams[0]);
                setRemoteStream(event.streams[0]);
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            // Handle ICE candidates
            pc.current.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('Sending ICE candidate');
                    sendWebSocketMessage({
                        type: 'ice_candidate',
                        candidate: event.candidate
                    });
                }
            };

            // Handle connection state changes
            pc.current.onconnectionstatechange = () => {
                console.log('WebRTC connection state:', pc.current.connectionState);
            };

            // Add local stream to peer connection if available
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    pc.current.addTrack(track, localStream);
                });
                console.log('Local stream added to peer connection');
            }

        } catch (error) {
            console.error('Error initializing WebRTC:', error);
        }
    };

    const createOffer = async () => {
        try {
            if (!pc.current) {
                console.error('Peer connection not initialized');
                return;
            }

            const offer = await pc.current.createOffer();
            await pc.current.setLocalDescription(offer);

            sendWebSocketMessage({
                type: 'offer',
                offer: offer
            });

            console.log('WebRTC offer created and sent');
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    };

    const handleOffer = async (offer, sender) => {
        try {
            if (!pc.current) {
                console.error('Peer connection not initialized');
                return;
            }

            await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answer);

            sendWebSocketMessage({
                type: 'answer',
                answer: answer,
                sender: sender
            });

            console.log('WebRTC answer created and sent');
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    };

    const handleAnswer = async (answer) => {
        try {
            if (!pc.current) {
                console.error('Peer connection not initialized');
                return;
            }

            await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('WebRTC answer processed successfully');
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    };

    const handleIceCandidate = async (candidate) => {
        try {
            if (!pc.current) {
                console.error('Peer connection not initialized');
                return;
            }

            await pc.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('ICE candidate added successfully');
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    };

    const sendWebSocketMessage = (message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
            console.log('WebSocket message sent:', message.type);
        } else {
            console.error('WebSocket not connected');
        }
    };

    const joinRoomHandler = async () => {
        try {
            console.log('Joining room:', roomId);

            // Join room in backend
            const joinResult = await dispatch(joinRoom(roomId)).unwrap();
            console.log('Room join result:', joinResult);

            setRoomLink(`${window.location.origin}/room/${roomId}`);

            // Send user joined notification
            sendWebSocketMessage({
                type: 'user_joined',
                username: user?.username || 'Anonymous'
            });

            // Initialize camera first
            await initializeCamera();

            // Then initialize WebRTC
            await initializeWebRTC();

            // Only create offer if we have a valid peer connection
            if (pc.current) {
                setTimeout(() => {
                    console.log('Creating WebRTC offer');
                    createOffer();
                }, 2000);
            }

        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room. Please try again.');
        }
    };

    const initializeCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 1280,
                    height: 720
                },
                audio: true
            });

            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            console.log('Camera initialized successfully');

        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera and microphone. Please check permissions.');
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOn(!isVideoOn);
                console.log('Video toggled:', videoTrack.enabled);
            }
        }
    };

    const toggleAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioOn(!isAudioOn);
                console.log('Audio toggled:', audioTrack.enabled);
            }
        }
    };

    const copyRoomLink = () => {
        const link = `${window.location.origin}/join?room=${roomId}`;
        navigator.clipboard.writeText(link);
        alert('Meeting link copied to clipboard! Share this with others.');
    };
    const leaveRoom = () => {
        // Send user left notification
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            sendWebSocketMessage({
                type: 'user_left',
                username: user?.username || 'Anonymous'
            });
        }

        // Cleanup
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (pc.current) {
            pc.current.close();
        }
        if (ws.current) {
            ws.current.close();
        }

        navigate('/');
    };

    const shareScreen = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            // Replace video track with screen share
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = pc.current.getSenders().find(s =>
                s.track && s.track.kind === 'video'
            );

            if (sender) {
                await sender.replaceTrack(videoTrack);
            }

            // Handle when user stops sharing
            videoTrack.onended = () => {
                if (localStream) {
                    const localVideoTrack = localStream.getVideoTracks()[0];
                    if (sender && localVideoTrack) {
                        sender.replaceTrack(localVideoTrack);
                    }
                }
            };

            console.log('Screen sharing started');

        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 p-4">
            {/* Room Header */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white">Meeting Room</h1>
                        <p className="text-gray-400">Room ID: {roomId}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm text-gray-400">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={copyRoomLink}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Copy Invite Link
                        </button>
                        <button
                            onClick={leaveRoom}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Leave Meeting
                        </button>
                    </div>
                </div>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
                {/* Local Video */}
                <div className="bg-black rounded-lg overflow-hidden relative">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        className="w-full h-64 md:h-96 object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        You ({user?.username}) {!isVideoOn && '| Video Off'}
                    </div>
                </div>

                {/* Remote Video */}
                <div className="bg-black rounded-lg overflow-hidden relative">
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        className="w-full h-64 md:h-96 object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        {remoteStream ? 'Remote Participant' : 'Waiting for participants...'}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gray-800 rounded-full px-6 py-3 flex gap-4 shadow-lg">
                    <button
                        onClick={toggleAudio}
                        className={`p-3 rounded-full transition-colors ${isAudioOn ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-red-600 text-white hover:bg-red-500'
                            }`}
                        title={isAudioOn ? 'Mute Audio' : 'Unmute Audio'}
                    >
                        {isAudioOn ? '🎤' : '🔇'}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-3 rounded-full transition-colors ${isVideoOn ? 'bg-gray-600 text-white hover:bg-gray-500' : 'bg-red-600 text-white hover:bg-red-500'
                            }`}
                        title={isVideoOn ? 'Turn Off Video' : 'Turn On Video'}
                    >
                        {isVideoOn ? '📹' : '📷❌'}
                    </button>

                    <button
                        onClick={shareScreen}
                        className="bg-gray-600 text-white p-3 rounded-full hover:bg-gray-500 transition-colors"
                        title="Share Screen"
                    >
                        🖥️
                    </button>

                    <button
                        onClick={leaveRoom}
                        className="bg-red-600 text-white p-3 rounded-full hover:bg-red-500 transition-colors"
                        title="Leave Call"
                    >
                        📞
                    </button>
                </div>
            </div>

            {/* Participants List */}
            {participants.length > 0 && (
                <div className="fixed top-20 right-4 bg-gray-800 rounded-lg p-4 min-w-48">
                    <h3 className="text-white font-semibold mb-2">Participants ({participants.length + 1})</h3>
                    <ul className="text-gray-300 text-sm">
                        <li className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            You ({user?.username})
                        </li>
                        {participants.map(participant => (
                            <li key={participant.id} className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                {participant.username}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}