// src/features/auth/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../app/axios";

const API_URL = import.meta.env.VITE_API_URL;

// Load user data from localStorage
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
      const res = await axiosInstance.post("register/", userData); // Just "register/"
      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("login/", credentials); // Just "login/"
      // Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  localStorage.removeItem("user");
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
});

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
      });
  },
});

export default authSlice.reducer;