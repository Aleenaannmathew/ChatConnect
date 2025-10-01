import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { joinRoom } from "./roomSlice";

export default function JoinRoom() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [searchParams] = useSearchParams();
    const [roomId, setRoomId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Auto-fill room ID from URL parameters
    useEffect(() => {
        const roomParam = searchParams.get('room');
        if (roomParam) {
            setRoomId(roomParam);
        }
    }, [searchParams]);

    const extractRoomId = (input) => {
        // If it's a full URL with room parameter
        if (input.includes('?room=')) {
            const url = new URL(input, window.location.origin);
            return url.searchParams.get('room');
        }
        // If it's just the UUID, return as is
        return input.trim();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!roomId.trim()) {
            setError("Please enter a meeting code");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Extract just the room ID (UUID) from the input
            const extractedRoomId = extractRoomId(roomId);
            console.log('Extracted room ID:', extractedRoomId);
            
            if (!extractedRoomId) {
                throw new Error('Invalid meeting code format');
            }

            // Validate and join the room
            const result = await dispatch(joinRoom(extractedRoomId)).unwrap();
            console.log('Join room result:', result);
            
            // Navigate to the room
            navigate(`/room/${extractedRoomId}`);
        } catch (error) {
            console.error('Failed to join room:', error);
            setError(error.message || "Invalid meeting code or room doesn't exist");
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const extractedRoomId = extractRoomId(text);
            setRoomId(extractedRoomId);
        } catch (error) {
            console.error('Failed to read clipboard:', error);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-black mb-2">Join a Meeting</h1>
                    <p className="text-gray-600">Enter the meeting code provided by the host</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-black mb-2">
                            Meeting Code
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter meeting code or paste the full URL"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors pr-24"
                            />
                            <button
                                type="button"
                                onClick={handlePaste}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200 transition-colors"
                            >
                                Paste
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            You can paste the full meeting URL or just the meeting code
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Joining..." : "Join Meeting"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="flex-1 border-2 border-black text-black py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>

                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-black mb-2">How to join:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Get the meeting link from the host</li>
                        <li>• Paste the full URL or just the meeting code</li>
                        <li>• Click "Join Meeting" to enter the room</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}