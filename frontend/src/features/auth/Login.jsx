import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "./authSlice";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(credentials)).unwrap().then(() => {
      navigate("/");
    });
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-black mb-2">Welcome to ChatConnect</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
                {JSON.stringify(error)}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="E.g: johndoe@gmail.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors pr-12"
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="text-center">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <a href="/signup" className="text-black font-medium hover:underline">
                  Sign up
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Simple Illustration */}
      <div className="hidden lg:block lg:w-1/2 bg-white relative overflow-hidden border-l border-gray-200">
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
  );
}