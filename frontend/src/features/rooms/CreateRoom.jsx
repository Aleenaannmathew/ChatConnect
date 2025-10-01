import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createRoom } from "./roomSlice";
import { useNavigate } from "react-router-dom";

export default function CreateRoom() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.rooms);
  
  const [formData, setFormData] = useState({
    title: "",
    max_participants: 10,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
  e.preventDefault();
  dispatch(createRoom(formData)).unwrap().then((response) => {
    // Make sure we're getting the room ID correctly
    console.log('Room creation response:', response);
    const roomId = response.id || response.room?.id;
    if (roomId) {
      navigate(`/room/${roomId}`);
    } else {
      console.error('No room ID in response:', response);
    }
  }).catch((error) => {
    console.error('Room creation failed:', error);
  });
};

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Create New Meeting</h1>
          <p className="text-gray-600">Start a new video meeting room</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
              {JSON.stringify(error)}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Meeting Title (Optional)
            </label>
            <input
              type="text"
              name="title"
              placeholder="E.g: Team Standup Meeting"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Maximum Participants
            </label>
            <select
              name="max_participants"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
              onChange={handleChange}
              value={formData.max_participants}
            >
              <option value={2}>2</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Room..." : "Create Meeting Room"}
          </button>
        </form>
      </div>
    </div>
  );
}