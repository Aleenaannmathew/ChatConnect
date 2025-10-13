import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/axios";
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL;

const userData = localStorage.getItem("user") 
  ? JSON.parse(localStorage.getItem("user")) 
  : null;

const userToken = localStorage.getItem("access") 
  ? localStorage.getItem("access") 
  : null;

export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/register/", userData);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      toast.success("Account created successfully! Welcome to ChatConnect 🎉");
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errorMsg);
      return rejectWithValue(err.response.data);
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/login/", credentials);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      toast.success(`Welcome back, ${res.data.user.username}! 👋`);
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Invalid credentials. Please try again.";
      toast.error(errorMsg);
      return rejectWithValue(err.response.data);
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout", 
  async (_, { rejectWithValue }) => {
    try {
      const refresh = localStorage.getItem("refresh");
      await axiosInstance.post("/auth/logout/", { refresh });
      localStorage.removeItem("user");
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      toast.info("Logged out successfully. See you soon! 👋");
    } catch (err) {
      // Even if API fails, clear local storage
      localStorage.removeItem("user");
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      toast.warn("Logged out locally");
      return rejectWithValue(err.response?.data);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: userData,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.loading = false;
        state.error = null;
      });
  },
});

export default authSlice.reducer;