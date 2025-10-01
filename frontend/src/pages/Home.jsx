import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    return (
        <div className="min-h-screen bg-white">
            {user ? (
                // User is logged in - Show dashboard
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
                    {/* Welcome Message */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl md:text-6xl font-bold text-black mb-4">
                            Premium video meetings.
                            <br />
                            Now free for everyone.
                        </h1>
                        <p className="text-gray-600 text-xl max-w-2xl mx-auto">
                            We re-engineered the service we built for secure business meetings, to make it free and available for all.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-16">
                        <button
                            onClick={() => navigate('/create-room')}
                            className="bg-black text-white px-8 py-4 rounded-lg font-medium hover:bg-gray-800 transition-all flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            New meeting
                        </button>

                        <button
                            onClick={() => navigate('/join')}
                            className="border-2 border-black text-black px-8 py-4 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            Enter a code
                        </button>
                    </div>

                    {/* Features Section */}
                    <div className="w-full max-w-5xl">
                        <div className="border-t border-gray-200 pt-12">
                            <h2 className="text-2xl font-semibold text-black mb-8 text-center">
                                Get a link you can share
                            </h2>
                            <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
                                Click New meeting to get a link you can send to people you want to meet with
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-lg text-black mb-2">
                                        Your meeting is safe
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        No one can join a meeting unless invited or admitted by the host
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-lg text-black mb-2">
                                        Built for secure meetings
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        Security measures include encryption and proactive anti-abuse
                                    </p>
                                </div>

                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-lg text-black mb-2">
                                        Works seamlessly
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        ChatConnect adapts to your network speed ensuring high quality calls
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // User is not logged in - Show landing page
                <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
                    {/* Left Side - Content */}
                    <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
                        <div className="max-w-xl">
                            <h1 className="text-5xl md:text-6xl font-bold text-black mb-6 leading-tight">
                                Premium video meetings for everyone
                            </h1>
                            <p className="text-gray-600 text-xl mb-8">
                                Connect, collaborate and celebrate from anywhere with ChatConnect
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <a
                                    href="/signup"
                                    className="bg-black text-white px-8 py-4 rounded-lg font-medium hover:bg-gray-800 transition-all text-center"
                                >
                                    Get Started
                                </a>
                                <a
                                    href="/login"
                                    className="border-2 border-black text-black px-8 py-4 rounded-lg font-medium hover:bg-gray-50 transition-all text-center"
                                >
                                    Sign In
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - ChatConnect Illustration */}
                    <div className="flex-1 bg-white relative overflow-hidden min-h-[400px] lg:min-h-full border-l border-gray-200">
                        <div className="absolute inset-0 flex items-center justify-center p-16">
                            <svg viewBox="0 0 400 400" className="w-full h-full max-w-md">
                                {/* Chat bubbles illustration */}
                                <g>
                                    {/* Person 1 */}
                                    <circle cx="100" cy="120" r="30" fill="black" />

                                    {/* Person 2 */}
                                    <circle cx="300" cy="120" r="30" fill="black" />

                                    {/* Person 3 */}
                                    <circle cx="200" cy="280" r="30" fill="black" />

                                    {/* Connecting lines */}
                                    <line x1="130" y1="120" x2="270" y2="120" stroke="black" strokeWidth="2" strokeDasharray="5,5" />
                                    <line x1="120" y1="145" x2="180" y2="255" stroke="black" strokeWidth="2" strokeDasharray="5,5" />
                                    <line x1="280" y1="145" x2="220" y2="255" stroke="black" strokeWidth="2" strokeDasharray="5,5" />

                                    {/* Message icons */}
                                    <g transform="translate(185, 85)">
                                        <rect width="30" height="20" rx="4" fill="none" stroke="black" strokeWidth="2" />
                                        <path d="M 5 5 L 15 12 L 25 5" fill="none" stroke="black" strokeWidth="2" />
                                    </g>

                                    <g transform="translate(85, 190)">
                                        <rect width="30" height="20" rx="4" fill="none" stroke="black" strokeWidth="2" />
                                        <line x1="8" y1="8" x2="22" y2="8" stroke="black" strokeWidth="2" />
                                        <line x1="8" y1="13" x2="18" y2="13" stroke="black" strokeWidth="2" />
                                    </g>

                                    <g transform="translate(285, 190)">
                                        <circle cx="15" cy="10" r="3" fill="black" />
                                        <path d="M 12 15 Q 15 18 18 15" fill="none" stroke="black" strokeWidth="2" />
                                    </g>
                                </g>

                                {/* Text */}
                                <text x="200" y="370" textAnchor="middle" fontSize="32" fontWeight="bold" fill="black">
                                    ChatConnect
                                </text>
                            </svg>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}