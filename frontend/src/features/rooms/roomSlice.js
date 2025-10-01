import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/axios";

// In roomSlice.js, update createRoom to return the full response
export const createRoom = createAsyncThunk(
  "rooms/create",
  async (roomData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/rooms/create/", roomData);
      console.log('Room creation response:', res.data); // Debug log
      return res.data; // Return the full response
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const fetchRooms = createAsyncThunk(
  "rooms/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get("/rooms/list/");
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);
export const joinRoom = createAsyncThunk(
  "rooms/join",
  async (roomId, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(`/rooms/${roomId}/join/`);
      return { roomId, data: res.data };
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const roomSlice = createSlice({
  name: "rooms",
  initialState: {
    rooms: [],
    currentRoom: null,
    loading: false,
    error: null,
  },
  reducers: {
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRoom.pending, (state) => {
        state.loading = true;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms.push(action.payload);
        state.error = null;
      })
      .addCase(createRoom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.rooms = action.payload;
      })
      .addCase(joinRoom.fulfilled, (state, action) => {
        // Handle successful room join
        state.currentRoom = action.payload.roomId;
      });
  },
});

export const { setCurrentRoom, clearError } = roomSlice.actions;
export default roomSlice.reducer;