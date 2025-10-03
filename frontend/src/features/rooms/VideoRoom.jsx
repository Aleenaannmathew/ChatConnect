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
    const ws = useRef(null);

    // Use a Map to track multiple peer connections
    const peerConnections = useRef(new Map());
    const remoteStreams = useRef(new Map());

    // Track connection states
    const connectionStates = useRef(new Map());

    const [localStream, setLocalStream] = useState(null);
    const [remoteStreamsList, setRemoteStreamsList] = useState([]);
    const [isStreamReady, setIsStreamReady] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [roomLink, setRoomLink] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const initializeCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            setLocalStream(stream);
            setIsStreamReady(true); // Add this

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.play().catch(e => console.error('Error playing local video:', e));
            }

            console.log('Camera initialized successfully');

            // Add local stream to all existing peer connections
            peerConnections.current.forEach((pc, userId) => {
                addLocalStreamToPeerConnection(pc, stream); // Pass stream directly
            });

        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera and microphone. Please check permissions.');
        }
    };
    // WebSocket connection and room validation
    useEffect(() => {
        if (!roomId || roomId === 'undefined') {
            console.error('Invalid room ID:', roomId);
            alert('Invalid room ID. Please create a new meeting.');
            navigate('/');
            return;
        }

        const init = async () => {
            console.log('Room ID:', roomId);
            // Initialize camera FIRST
            await initializeCamera();
            // Then connect WebSocket
            connectWebSocket();
        };

        init();

        return () => {
            cleanup();
        };
    }, [roomId, navigate]);

    // Add this new useEffect after the main one
useEffect(() => {
    if (localStream && isStreamReady) {
        console.log('Local stream is ready, adding to existing peer connections');
        // Add stream to any peer connections that were created while waiting
        peerConnections.current.forEach((pc, userId) => {
            addLocalStreamToPeerConnection(pc, localStream);
        });
    }
}, [localStream, isStreamReady]);

    const cleanup = () => {
        // Close all peer connections
        peerConnections.current.forEach((pc, userId) => {
            pc.close();
        });
        peerConnections.current.clear();
        remoteStreams.current.clear();
        connectionStates.current.clear();

        // Close WebSocket
        if (ws.current) {
            ws.current.close();
        }

        // Stop local stream
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
    };

    const connectWebSocket = () => {
        const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/room/${roomId}/`;
        console.log('Connecting to WebSocket:', wsUrl);

        // Close existing connection if any
        if (ws.current) {
            ws.current.close();
        }

        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received:', data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.current.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            setIsConnected(false);

            // Try to reconnect after 2 seconds
            setTimeout(() => {
                if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
                    console.log('Attempting to reconnect WebSocket...');
                    connectWebSocket();
                }
            }, 2000);
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
                setCurrentUserId(data.userId); // Store the user ID from server
                joinRoomHandler();
                break;

            case 'participant_update':
                console.log('Participant count updated:', data.participant_count);
                setParticipantCount(data.participant_count);
                break;

            case 'offer':
                console.log('Received WebRTC offer from:', data.userId);
                handleOffer(data.offer, data.userId);
                break;

            case 'answer':
                console.log('Received WebRTC answer from:', data.userId);
                handleAnswer(data.answer, data.userId);
                break;

            case 'ice_candidate':
                console.log('Received ICE candidate from:', data.userId);
                handleIceCandidate(data.candidate, data.userId);
                break;

            case 'user_joined':
                console.log('User joined:', data.username, 'with ID:', data.userId);
                if (data.userId && data.userId !== currentUserId) {
                    setTimeout(() => {
                        createOfferForUser(data.userId);
                    }, 1000);
                }
                break;

            case 'user_left':
                console.log('User left:', data.userId);
                removeUserConnection(data.userId);
                break;

            default:
                console.log('Unknown message type:', data.type, data);
        }
    };

    const createPeerConnection = (userId) => {
        if (peerConnections.current.has(userId)) {
            console.log('Peer connection already exists for user:', userId);
            return peerConnections.current.get(userId);
        }

        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        const pc = new RTCPeerConnection(configuration);
        console.log('Created new peer connection for user:', userId);

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log('🎥 ONTRACK EVENT from user:', userId);
            console.log('Streams received:', event.streams.length);
            console.log('Track kind:', event.track.kind);
            console.log('Track enabled:', event.track.enabled);
            console.log('Track readyState:', event.track.readyState);

            if (event.streams && event.streams[0]) {
                const remoteStream = event.streams[0];
                console.log('Remote stream tracks:', remoteStream.getTracks().map(t => ({
                    kind: t.kind,
                    id: t.id,
                    enabled: t.enabled,
                    readyState: t.readyState
                })));

                remoteStreams.current.set(userId, remoteStream);
                updateRemoteStreamsList();
                console.log('✅ Remote stream added for user:', userId);
            } else {
                console.error('❌ No stream in ontrack event');
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && ws.current?.readyState === WebSocket.OPEN) {
                console.log('Sending ICE candidate to user:', userId);
                sendWebSocketMessage({
                    type: 'ice_candidate',
                    candidate: event.candidate,
                    targetUserId: userId
                });
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            console.log(`WebRTC connection state for user ${userId}:`, state);
            connectionStates.current.set(userId, state);

            if (state === 'connected') {
                console.log(`WebRTC connection established with user: ${userId}`);
            } else if (state === 'failed') {
                console.error(`WebRTC connection failed with user: ${userId}`);
            }
        };

        // Add local stream to peer connection
        if (localStream) {
            addLocalStreamToPeerConnection(pc);
        }

        peerConnections.current.set(userId, pc);
        return pc;
    };

    const addLocalStreamToPeerConnection = (pc, stream = localStream) => {
        if (!pc || !stream) {
            console.log('Cannot add stream - missing pc or stream');
            return;
        }

        try {
            // Get existing senders
            const existingSenders = pc.getSenders();
            const existingTrackIds = new Set(
                existingSenders.map(s => s.track?.id).filter(Boolean)
            );

            // Add tracks that aren't already being sent
            stream.getTracks().forEach(track => {
                if (!existingTrackIds.has(track.id)) {
                    console.log('Adding local track to peer connection:', track.kind, track.id);
                    pc.addTrack(track, stream);
                } else {
                    console.log('Track already added:', track.kind);
                }
            });

            console.log('Local stream tracks added/verified');
        } catch (error) {
            console.error('Error adding local stream to peer connection:', error);
        }
    };

    const createOfferForUser = async (userId) => {
    // Check if stream is ready
    if (!isStreamReady || !localStream) {
        console.log(`Stream not ready (ready: ${isStreamReady}, stream: ${!!localStream}). Retrying for user: ${userId}`);
        
        // Only retry a limited number of times
        const retryCount = window[`retry_${userId}`] || 0;
        if (retryCount < 10) { // Max 10 retries = 5 seconds
            window[`retry_${userId}`] = retryCount + 1;
            setTimeout(() => createOfferForUser(userId), 500);
        } else {
            console.error(`Failed to create offer for ${userId} after 10 retries`);
            delete window[`retry_${userId}`];
        }
        return;
    }
    
    // Clear retry counter on success
    delete window[`retry_${userId}`];

    const pc = createPeerConnection(userId);
    if (!pc) return;

    try {
        console.log('Creating WebRTC offer for user:', userId);

        if (pc.signalingState !== 'stable') {
            console.log('Cannot create offer - signaling state not stable:', pc.signalingState);
            return;
        }

        // Add local stream
        addLocalStreamToPeerConnection(pc, localStream);

        const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });

        await pc.setLocalDescription(offer);

        console.log('Sending offer to user:', userId);
        sendWebSocketMessage({
            type: 'offer',
            offer: offer,
            targetUserId: userId
        });
    } catch (error) {
        console.error('Error creating offer for user:', userId, error);
    }
};

    const handleOffer = async (offer, fromUserId) => {
    if (!fromUserId) {
        console.error('No user ID provided with offer');
        return;
    }

    // Check if stream is ready
    if (!isStreamReady || !localStream) {
        console.log(`Stream not ready when handling offer from ${fromUserId}. Retrying...`);
        
        const retryCount = window[`retry_offer_${fromUserId}`] || 0;
        if (retryCount < 10) {
            window[`retry_offer_${fromUserId}`] = retryCount + 1;
            setTimeout(() => handleOffer(offer, fromUserId), 500);
        } else {
            console.error(`Failed to handle offer from ${fromUserId} after 10 retries`);
            delete window[`retry_offer_${fromUserId}`];
        }
        return;
    }
    
    delete window[`retry_offer_${fromUserId}`];

    const pc = createPeerConnection(fromUserId);
    if (!pc) return;

    try {
        console.log('Handling remote offer from user:', fromUserId);

        if (pc.signalingState !== 'stable') {
            console.log('Cannot handle offer - signaling state not stable:', pc.signalingState);
            return;
        }

        // Add local stream BEFORE setting remote description
        addLocalStreamToPeerConnection(pc, localStream);

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        console.log('Sending answer to user:', fromUserId);
        sendWebSocketMessage({
            type: 'answer',
            answer: answer,
            targetUserId: fromUserId
        });
    } catch (error) {
        console.error('Error handling offer from user:', fromUserId, error);
    }
};

    const handleAnswer = async (answer, fromUserId) => {
        if (!fromUserId) {
            console.error('No user ID provided with answer');
            return;
        }

        const pc = peerConnections.current.get(fromUserId);
        if (!pc) {
            console.error('No peer connection found for user:', fromUserId);
            return;
        }

        try {
            console.log('Handling remote answer from user:', fromUserId);

            // Only set remote description if we're expecting an answer
            if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            } else {
                console.log('Ignoring answer - wrong signaling state:', pc.signalingState);
            }
        } catch (error) {
            console.error('Error handling answer from user:', fromUserId, error);
        }
    };

    const handleIceCandidate = async (candidate, fromUserId) => {
        if (!fromUserId) {
            console.error('No user ID provided with ICE candidate');
            return;
        }

        const pc = peerConnections.current.get(fromUserId);
        if (!pc) {
            console.error('No peer connection found for user:', fromUserId);
            return;
        }

        try {
            console.log('Adding ICE candidate from user:', fromUserId);
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding ICE candidate from user:', fromUserId, error);
        }
    };

    const removeUserConnection = (userId) => {
        const pc = peerConnections.current.get(userId);
        if (pc) {
            pc.close();
            peerConnections.current.delete(userId);
        }

        remoteStreams.current.delete(userId);
        connectionStates.current.delete(userId);
        updateRemoteStreamsList();

        console.log('Removed connection for user:', userId);
    };

    const updateRemoteStreamsList = () => {
        const streams = Array.from(remoteStreams.current.values());
        setRemoteStreamsList(streams);
    };

    const sendWebSocketMessage = (message) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
            console.log('WebSocket message sent:', message.type, 'to:', message.targetUserId);
        } else {
            console.error('WebSocket not connected, cannot send message');
        }
    };

    const joinRoomHandler = async () => {
        try {
            console.log('Joining room:', roomId);

            // Join room in backend (camera already initialized)
            const joinResult = await dispatch(joinRoom(roomId)).unwrap();
            console.log('Room join result:', joinResult);

            setRoomLink(`${window.location.origin}/join?room=${roomId}`);

        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room. Please try again.');
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
        navigator.clipboard.writeText(link).then(() => {
            alert('Meeting link copied to clipboard! Share this with others.');
        }).catch(err => {
            console.error('Failed to copy link:', err);
        });
    };

    const leaveRoom = () => {
        // Send user left notification
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            sendWebSocketMessage({
                type: 'user_left',
                userId: currentUserId
            });
        }

        cleanup();
        navigate('/');
    };

    const shareScreen = async () => {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            const videoTrack = screenStream.getVideoTracks()[0];

            // Replace video track in all peer connections
            peerConnections.current.forEach((pc, userId) => {
                const sender = pc.getSenders().find(s =>
                    s.track && s.track.kind === 'video'
                );
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });

            setIsScreenSharing(true);
            console.log('Screen sharing started');

            // Handle when user stops sharing
            videoTrack.onended = () => {
                if (localStream) {
                    const localVideoTrack = localStream.getVideoTracks()[0];
                    peerConnections.current.forEach((pc, userId) => {
                        const sender = pc.getSenders().find(s =>
                            s.track && s.track.kind === 'video'
                        );
                        if (sender && localVideoTrack) {
                            sender.replaceTrack(localVideoTrack);
                        }
                    });
                    setIsScreenSharing(false);
                    console.log('Screen sharing stopped, reverting to camera');
                }
            };

        } catch (error) {
            console.error('Error sharing screen:', error);
        }
    };

    const retryAllConnections = () => {
        console.log('Retrying all connections...');
        // Get all user IDs from peer connections
        const allUserIds = Array.from(peerConnections.current.keys());

        allUserIds.forEach(userId => {
            const pc = peerConnections.current.get(userId);
            if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
                console.log('Retrying connection for user:', userId);
                createOfferForUser(userId);
            }
        });
    };

    const getConnectionStatusText = () => {
        const connectedPeers = Array.from(connectionStates.current.values())
            .filter(state => state === 'connected').length;

        if (connectedPeers > 0) {
            return `Connected to ${connectedPeers} participant${connectedPeers > 1 ? 's' : ''}`;
        }

        return 'Connecting...';
    };

    const getConnectionStatusColor = () => {
        const connectedPeers = Array.from(connectionStates.current.values())
            .filter(state => state === 'connected').length;

        if (connectedPeers > 0) return 'bg-green-500';
        return 'bg-yellow-500';
    };

    // Calculate grid columns based on number of participants
    const getGridColumns = () => {
        const totalParticipants = 1 + remoteStreamsList.length;
        if (totalParticipants <= 2) return 'grid-cols-1 md:grid-cols-2';
        if (totalParticipants <= 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2';
        if (totalParticipants <= 6) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
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
                            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                            <span className="text-sm text-gray-400">
                                {getConnectionStatusText()} | Participants: {participantCount}
                                {isScreenSharing && ' | Screen Sharing'}
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
            <div className={`grid ${getGridColumns()} gap-4 mb-20`}>
                {/* Local Video */}
                <div className="bg-black rounded-lg overflow-hidden relative">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-64 object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        You ({user?.username || 'User'})
                        {!isVideoOn && ' | Video Off'}
                        {isScreenSharing && ' | Sharing Screen'}
                    </div>
                </div>

                {/* Remote Videos */}
                {remoteStreamsList.map((stream, index) => (
                    <div key={index} className="bg-black rounded-lg overflow-hidden relative">
                        <video
                            autoPlay
                            playsInline
                            ref={el => {
                                if (el) {
                                    el.srcObject = stream;
                                    el.play().catch(e => console.error('Error playing remote video:', e));
                                }
                            }}
                            className="w-full h-64 object-cover"
                        />
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                            Participant {index + 1}
                        </div>
                    </div>
                ))}

                {/* Waiting message when no remote streams but other participants exist */}
                {remoteStreamsList.length === 0 && participantCount > 1 && (
                    <div className="bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                        <div className="text-white text-center p-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                            <p>Connecting to participants...</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {participantCount - 1} other participant{participantCount - 1 > 1 ? 's' : ''} in room
                            </p>
                            <button
                                onClick={retryAllConnections}
                                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                                Retry Connection
                            </button>
                        </div>
                    </div>
                )}
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
                        className={`p-3 rounded-full transition-colors ${isScreenSharing ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-600 text-white hover:bg-gray-500'
                            }`}
                        title="Share Screen"
                    >
                        🖥️
                    </button>

                    <button
                        onClick={retryAllConnections}
                        className="bg-yellow-600 text-white p-3 rounded-full hover:bg-yellow-500 transition-colors"
                        title="Retry Connections"
                    >
                        🔄
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
        </div>
    );
}