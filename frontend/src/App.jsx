import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Signup from "./features/auth/Signup";
import Login from "./features/auth/Login";
import Home from "./pages/Home";
import CreateRoom from "./features/rooms/CreateRoom";
import VideoRoom from "./features/rooms/VideoRoom";
import JoinRoom from "./features/rooms/JoinRoom";


export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create-room" element={<CreateRoom />} />
        <Route path="/join" element={<JoinRoom />} />
        <Route path="/room/:roomId" element={<VideoRoom />} />
      </Routes>
    </Router>
  );
}
