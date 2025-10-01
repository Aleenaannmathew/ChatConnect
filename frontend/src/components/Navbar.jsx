import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../features/auth/authSlice";
import { Link } from "react-router-dom";

export default function Navbar() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <h1 className="font-bold text-2xl text-black">
            ChatConnect
          </h1>
        </Link>
        
        <div className="flex items-center gap-4">
          {!user ? (
            <>
              <Link 
                to="/login" 
                className="text-black hover:text-gray-600 transition-colors font-medium px-4 py-2"
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-all"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-black font-medium">
                Welcome, {user.username}!
              </span>
              <button
                onClick={() => dispatch(logoutUser())}
                className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition-all"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}