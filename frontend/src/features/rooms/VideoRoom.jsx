import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { joinRoom } from './roomSlice';

export default function VideoRoom() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const localVideoRef = useRef(null);
    const ws = useRef(null);
    const shouldReconnect = useRef(true);
    const currentUserIdRef = useRef(null);
    const localStreamRef = useRef(null);

    // Store peer connections and their retry timers
    const peerConnections = useRef(new Map());
    const remoteStreams = useRef(new Map());
    const offerRetryTimers = useRef(new Map());
    const pendingIceCandidates = useRef(new Map());
    const isRemoteDescSet = useRef(new Map());

    const [localStream, setLocalStream] = useState(null);
    const [remoteStreamsList, setRemoteStreamsList] = useState([]);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isAudioOn, setIsAudioOn] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Initializing...');

    // Initialize media and WebSocket
    useEffect(() => {
        if (!roomId || roomId === 'undefined') {
            console.error('Invalid room ID:', roomId);
            alert('Invalid room ID. Please create a new meeting.');
            navigate('/');
            return;
        }

        const init = async () => {
            await initializeMedia();
            connectWebSocket();
        };

        init();

        return () => cleanup();
    }, [roomId, navigate]);

    const initializeMedia = async () => {
        try {
            console.log('🔄 Initializing media devices...');
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: { echoCancellation: true, noiseSuppression: true }
            });

            console.log('✅ Media devices initialized');
            localStreamRef.current = stream;
            setLocalStream(stream);

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.play().catch(e => console.error('Error playing local video:', e));
            }

            setConnectionStatus('Media ready, connecting...');
        } catch (error) {
            console.error('❌ Error accessing media:', error);
            alert('Could not access camera and microphone. Please check permissions.');
            setConnectionStatus('Media access denied');
        }
    };

    const connectWebSocket = () => {
        if (ws.current?.readyState === WebSocket.OPEN || ws.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000'}/ws/room/${roomId}/`;
        console.log('🔌 Connecting to WebSocket:', wsUrl);

        shouldReconnect.current = true;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
            console.log('✅ WebSocket connected');
            setIsConnected(true);
            setConnectionStatus('Connected to room');
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('❌ Error parsing message:', error);
            }
        };

        ws.current.onclose = (event) => {
            console.log('🔌 WebSocket disconnected:', event.code, event.reason);
            setIsConnected(false);
            setConnectionStatus('Disconnected');
            ws.current = null;

            if (shouldReconnect.current && event.code !== 1000 && event.code !== 1011) {
                setTimeout(() => {
                    console.log('🔄 Reconnecting...');
                    connectWebSocket();
                }, 2000);
            } else if (event.code === 1011) {
                console.error('❌ Server error (1011). Check server logs.');
                setConnectionStatus('Server error');
            }
        };

        ws.current.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            setConnectionStatus('Connection error');
        };
    };

    const handleWebSocketMessage = (data) => {
        console.log('📨 Received:', data.type, data);

        switch (data.type) {
            case 'connection_established':
                console.log('✅ Connection established. User ID:', data.userId);
                currentUserIdRef.current = data.userId;
                setCurrentUserId(data.userId);
                setParticipantCount(data.participant_count || 1);
                setConnectionStatus('Ready');
                dispatch(joinRoom(roomId)).catch(console.error);
                
                // Connect to existing users
                if (data.existing_users && data.existing_users.length > 0) {
                    console.log('👥 Connecting to existing users:', data.existing_users);
                    setTimeout(() => {
                        const stream = localStreamRef.current;
                        if (stream) {
                            data.existing_users.forEach(existingUserId => {
                                console.log('🔗 Creating connection to existing user:', existingUserId);
                                createPeerConnection(existingUserId, true);
                            });
                        } else {
                            console.log('⏳ Waiting for stream to connect to existing users...');
                            const checkInterval = setInterval(() => {
                                const stream = localStreamRef.current;
                                if (stream) {
                                    clearInterval(checkInterval);
                                    data.existing_users.forEach(existingUserId => {
                                        console.log('🔗 Creating connection to existing user:', existingUserId);
                                        createPeerConnection(existingUserId, true);
                                    });
                                }
                            }, 500);
                            setTimeout(() => clearInterval(checkInterval), 5000);
                        }
                    }, 1000);
                }
                break;

            case 'participant_update':
                console.log('👥 Participant count:', data.participant_count);
                setParticipantCount(data.participant_count);
                break;

            case 'user_joined':
                console.log('🟢 User joined:', data.userId);
                if (data.userId && data.userId !== currentUserIdRef.current) {
                    console.log('🎯 Creating offer for new user:', data.userId);
                    setTimeout(() => {
                        const stream = localStreamRef.current;
                        if (stream) {
                            console.log('✅ Local stream available, creating peer connection');
                            createPeerConnection(data.userId, true);
                        } else {
                            console.log('⏳ Local stream not ready, setting up retry...');
                            const checkInterval = setInterval(() => {
                                const stream = localStreamRef.current;
                                if (stream) {
                                    console.log('✅ Local stream now ready, creating peer connection');
                                    clearInterval(checkInterval);
                                    createPeerConnection(data.userId, true);
                                }
                            }, 500);
                            setTimeout(() => clearInterval(checkInterval), 5000);
                        }
                    }, 1000);
                }
                break;

            case 'user_left':
                console.log('🔴 User left:', data.userId);
                closeConnection(data.userId);
                break;

            case 'offer':
                console.log('📨 Received offer from:', data.userId);
                handleOffer(data.offer, data.userId);
                break;

            case 'answer':
                console.log('📨 Received answer from:', data.userId);
                handleAnswer(data.answer, data.userId);
                break;

            case 'ice_candidate':
                console.log('📨 Received ICE candidate from:', data.userId);
                handleIceCandidate(data.candidate, data.userId);
                break;
        }
    };

    const createPeerConnection = (userId, isOfferer = false) => {
        // Check if peer connection already exists
        if (peerConnections.current.has(userId)) {
            const existingPc = peerConnections.current.get(userId);
            console.log(`ℹ️ Peer connection already exists for ${userId}, state: ${existingPc.signalingState}`);
            
            // If existing connection is in a bad state and we should be the offerer, recreate it
            if (isOfferer && (existingPc.signalingState === 'stable' || existingPc.signalingState === 'closed')) {
                console.log('🔄 Recreating peer connection for:', userId);
                existingPc.close();
                peerConnections.current.delete(userId);
            } else {
                return existingPc;
            }
        }

        const stream = localStreamRef.current;
        if (!stream) {
            console.error('❌ Cannot create peer connection: no local stream');
            return null;
        }

        // Ensure consistent offerer based on user IDs (lower ID is always offerer)
        const shouldBeOfferer = isOfferer || (currentUserIdRef.current && currentUserIdRef.current < userId);
        console.log(`🆕 Creating peer connection for ${userId} (offerer: ${shouldBeOfferer})`);

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Add local tracks FIRST
        stream.getTracks().forEach(track => {
            console.log('➕ Adding track:', track.kind, 'to peer:', userId);
            pc.addTrack(track, stream);
        });

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log('🎥 RECEIVED TRACK from:', userId, 'kind:', event.track.kind);
            if (event.streams && event.streams[0]) {
                console.log('✅ Setting remote stream for user:', userId);
                remoteStreams.current.set(userId, event.streams[0]);
                updateRemoteStreamsList();
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 ICE candidate generated for:', userId);
                const remoteSet = isRemoteDescSet.current.get(userId);
                if (remoteSet) {
                    console.log('📤 Sending ICE candidate to:', userId);
                    sendMessage({
                        type: 'ice_candidate',
                        candidate: event.candidate,
                        targetUserId: userId
                    });
                } else {
                    console.log('⏳ Buffering ICE candidate for:', userId);
                    if (!pendingIceCandidates.current.has(userId)) {
                        pendingIceCandidates.current.set(userId, []);
                    }
                    pendingIceCandidates.current.get(userId).push(event.candidate);
                }
            }
        };

        // Connection state monitoring
        pc.onconnectionstatechange = () => {
            console.log(`🔗 Connection state with ${userId}:`, pc.connectionState);
            if (pc.connectionState === 'connected') {
                console.log(`✅ WebRTC CONNECTED with user: ${userId}`);
                setConnectionStatus(`Connected to ${peerConnections.current.size} peer(s)`);
                clearRetryTimer(userId);
            } else if (pc.connectionState === 'failed') {
                console.error(`❌ Connection FAILED with:`, userId);
                setTimeout(() => {
                    if (peerConnections.current.has(userId)) {
                        console.log('🔄 Retrying connection for:', userId);
                        createOffer(userId);
                    }
                }, 3000);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`🧊 ICE state with ${userId}:`, pc.iceConnectionState);
        };

        peerConnections.current.set(userId, pc);
        isRemoteDescSet.current.set(userId, false);

        // If we're the offerer, create and send offer
        if (shouldBeOfferer) {
            setTimeout(() => createOffer(userId), 100);
        }

        return pc;
    };

    const createOffer = async (userId) => {
        const pc = peerConnections.current.get(userId);
        if (!pc) {
            console.error('❌ No peer connection for:', userId);
            return;
        }

        try {
            console.log('📤 Creating offer for:', userId);
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            await pc.setLocalDescription(offer);
            console.log('✅ Local description set, sending offer to:', userId);

            sendMessage({
                type: 'offer',
                offer: { type: offer.type, sdp: offer.sdp },
                targetUserId: userId
            });

            setupOfferRetry(userId);

        } catch (error) {
            console.error('❌ Error creating offer:', error);
        }
    };

    const setupOfferRetry = (userId) => {
        clearRetryTimer(userId);

        const timer = setInterval(() => {
            const pc = peerConnections.current.get(userId);
            if (pc && pc.signalingState === 'have-local-offer') {
                console.log('🔁 Retrying offer for:', userId);
                createOffer(userId);
            } else {
                clearRetryTimer(userId);
            }
        }, 3000);

        offerRetryTimers.current.set(userId, timer);
    };

    const clearRetryTimer = (userId) => {
        const timer = offerRetryTimers.current.get(userId);
        if (timer) {
            clearInterval(timer);
            offerRetryTimers.current.delete(userId);
        }
    };

    const handleOffer = async (offer, fromUserId) => {
        console.log('📨 Handling offer from:', fromUserId);
        
        const stream = localStreamRef.current;
        if (!stream) {
            console.error('❌ Cannot handle offer: no local stream');
            return;
        }

        let pc = peerConnections.current.get(fromUserId);
        
        // Check if we should handle this offer or ignore it (collision resolution)
        const shouldAcceptOffer = !currentUserIdRef.current || currentUserIdRef.current > fromUserId;
        
        if (pc && pc.signalingState !== 'stable') {
            if (!shouldAcceptOffer) {
                console.log('⚠️ Ignoring offer due to signaling collision, we are the offerer');
                return;
            }
            console.log('⚠️ Signaling state collision, recreating connection');
            pc.close();
            peerConnections.current.delete(fromUserId);
            pc = null;
        }
        
        if (!pc) {
            console.log('🆕 Creating peer connection to handle offer from:', fromUserId);
            pc = createPeerConnection(fromUserId, false);
        }

        if (!pc) return;

        try {
            console.log('📝 Setting remote description (offer) from:', fromUserId);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            isRemoteDescSet.current.set(fromUserId, true);

            console.log('📤 Creating answer for:', fromUserId);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            console.log('📤 Sending answer to:', fromUserId);
            sendMessage({
                type: 'answer',
                answer: { type: answer.type, sdp: answer.sdp },
                targetUserId: fromUserId
            });

            sendBufferedIceCandidates(fromUserId);

        } catch (error) {
            console.error('❌ Error handling offer:', error);
        }
    };

    const handleAnswer = async (answer, fromUserId) => {
        const pc = peerConnections.current.get(fromUserId);
        if (!pc) {
            console.error('❌ No peer connection for answer from:', fromUserId);
            return;
        }

        try {
            console.log('📝 Setting remote description (answer) from:', fromUserId);
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            isRemoteDescSet.current.set(fromUserId, true);

            clearRetryTimer(fromUserId);
            sendBufferedIceCandidates(fromUserId);

            console.log('✅ Answer processed successfully for:', fromUserId);

        } catch (error) {
            console.error('❌ Error handling answer:', error);
        }
    };

    const handleIceCandidate = async (candidate, fromUserId) => {
        const pc = peerConnections.current.get(fromUserId);
        if (!pc) {
            console.error('❌ No peer connection for ICE from:', fromUserId);
            return;
        }

        try {
            if (pc.remoteDescription) {
                console.log('➕ Adding ICE candidate from:', fromUserId);
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                console.log('⏳ Buffering ICE candidate from:', fromUserId);
                if (!pendingIceCandidates.current.has(fromUserId)) {
                    pendingIceCandidates.current.set(fromUserId, []);
                }
                pendingIceCandidates.current.get(fromUserId).push(candidate);
            }
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    };

    const sendBufferedIceCandidates = (userId) => {
        const buffered = pendingIceCandidates.current.get(userId);
        if (buffered && buffered.length > 0) {
            console.log(`📤 Sending ${buffered.length} buffered ICE candidates to:`, userId);
            buffered.forEach(candidate => {
                sendMessage({
                    type: 'ice_candidate',
                    candidate,
                    targetUserId: userId
                });
            });
            pendingIceCandidates.current.delete(userId);
        }
    };

    const sendMessage = (message) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            console.log('📤 Sending message:', message.type, 'to:', message.targetUserId);
            ws.current.send(JSON.stringify(message));
        } else {
            console.error('❌ WebSocket not connected, cannot send:', message.type);
        }
    };

    const closeConnection = (userId) => {
        console.log('🗑️ Closing connection for:', userId);
        
        const pc = peerConnections.current.get(userId);
        if (pc) {
            pc.close();
            peerConnections.current.delete(userId);
        }

        remoteStreams.current.delete(userId);
        isRemoteDescSet.current.delete(userId);
        pendingIceCandidates.current.delete(userId);
        clearRetryTimer(userId);
        updateRemoteStreamsList();
    };

    const updateRemoteStreamsList = () => {
        const streams = Array.from(remoteStreams.current.entries()).map(([userId, stream]) => ({
            userId,
            stream
        }));
        console.log('📊 Updated remote streams list, count:', streams.length);
        setRemoteStreamsList(streams);
    };

    const cleanup = () => {
        console.log('🧹 Cleaning up...');
        shouldReconnect.current = false;

        offerRetryTimers.current.forEach((timer) => clearInterval(timer));
        offerRetryTimers.current.clear();

        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();
        remoteStreams.current.clear();
        isRemoteDescSet.current.clear();
        pendingIceCandidates.current.clear();

        if (ws.current) {
            ws.current.close();
            ws.current = null;
        }

        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
    };

    const toggleVideo = () => {
        const stream = localStreamRef.current;
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsVideoOn(!isVideoOn);
            }
        }
    };

    const toggleAudio = () => {
        const stream = localStreamRef.current;
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioOn(!isAudioOn);
            }
        }
    };

    const copyRoomLink = () => {
        const link = `${window.location.origin}/join?room=${roomId}`;
        navigator.clipboard.writeText(link).then(() => {
            alert('Meeting link copied!');
        });
    };

    const leaveRoom = () => {
        cleanup();
        navigate('/');
    };

    const getGridColumns = () => {
        const total = 1 + remoteStreamsList.length;
        if (total <= 2) return 'grid-cols-1 md:grid-cols-2';
        if (total <= 4) return 'grid-cols-2';
        if (total <= 6) return 'grid-cols-3';
        return 'grid-cols-4';
    };

    return (
        <div className="min-h-screen bg-gray-900 p-4">
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-white">Meeting Room</h1>
                        <p className="text-gray-400 text-sm">Room: {roomId?.slice(0, 8)}...</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm text-gray-400">
                                {connectionStatus} | Participants: {participantCount} | Remote Streams: {remoteStreamsList.length}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={copyRoomLink} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            Copy Link
                        </button>
                        <button onClick={leaveRoom} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                            Leave
                        </button>
                    </div>
                </div>
            </div>

            <div className={`grid ${getGridColumns()} gap-4 mb-20`}>
                <div className="bg-black rounded-lg overflow-hidden relative">
                    <video
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-64 object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        You {!isVideoOn && '(Video Off)'}
                    </div>
                </div>

                {remoteStreamsList.map(({ userId, stream }, index) => (
                    <div key={userId} className="bg-black rounded-lg overflow-hidden relative">
                        <video
                            autoPlay
                            playsInline
                            ref={el => {
                                if (el && el.srcObject !== stream) {
                                    console.log('🎥 Attaching remote stream to video element for:', userId);
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

                {remoteStreamsList.length === 0 && participantCount > 1 && (
                    <div className="bg-gray-800 rounded-lg flex items-center justify-center h-64">
                        <div className="text-center text-white">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                            <p>Connecting to {participantCount - 1} participant(s)...</p>
                            <p className="text-xs text-gray-400 mt-2">Check console for connection details</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gray-800 rounded-full px-6 py-3 flex gap-4 shadow-lg">
                    <button
                        onClick={toggleAudio}
                        className={`p-3 rounded-full transition-colors ${
                            isAudioOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
                        }`}
                        title={isAudioOn ? 'Mute' : 'Unmute'}
                    >
                        {isAudioOn ? '🎤' : '🔇'}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-3 rounded-full transition-colors ${
                            isVideoOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
                        }`}
                        title={isVideoOn ? 'Stop Video' : 'Start Video'}
                    >
                        {isVideoOn ? '📹' : '📷'}
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