"use client";

import React, { createContext, useContext, useReducer, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  email: string;
  balance: number;
  role: string;
  status?: "active" | "inactive";
  userId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
};

type AuthAction =
  | { type: "INIT_DONE"; user: User | null; token: string | null }
  | { type: "SET_USER"; user: User; token: string }
  | { type: "UPDATE_USER"; user: User }
  | { type: "LOGOUT" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "INIT_DONE":
      // Single atomic update: loading=false + user + token all at once
      return { loading: false, user: action.user, token: action.token };
    case "SET_USER":
      return { loading: false, user: action.user, token: action.token };
    case "UPDATE_USER":
      return { ...state, user: action.user };
    case "LOGOUT":
      return { loading: false, user: null, token: null };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
axios.defaults.withCredentials = true;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const enrichUser = (user: any): User => {
  // Guard against endpoints that return the raw Mongo `_id` instead of `id`
  // (e.g. a bare Mongoose doc) — losing `id` breaks anything keyed on it,
  // like the trade page's socket.io "join_user" room membership.
  const withId: User = { ...user, id: user.id || user._id };
  if (withId.name && !withId.firstName) {
    const parts = withId.name.split(" ");
    return { ...withId, firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" };
  }
  return withId;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    loading: true, // starts true — nothing renders until INIT_DONE fires
  });

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        const parsedUser = enrichUser(JSON.parse(storedUser));
        axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        dispatch({ type: "INIT_DONE", user: parsedUser, token: storedToken });
      } else {
        dispatch({ type: "INIT_DONE", user: null, token: null });
      }
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      dispatch({ type: "INIT_DONE", user: null, token: null });
    }
  }, []);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = enrichUser(response.data.user);
      localStorage.setItem("user", JSON.stringify(updated));
      dispatch({ type: "UPDATE_USER", user: updated });
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = response.data;
      if (user.status === "inactive") {
        throw new Error("Your account has been suspended. Please contact support.");
      }
      const enriched = enrichUser(user);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(enriched));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      dispatch({ type: "SET_USER", user: enriched, token });
      toast.success("Login successful!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Login failed");
      throw error;
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: `${firstName} ${lastName}`,
        email,
        password,
      });
      const { token, user } = response.data;
      const enriched = { ...enrichUser(user), firstName, lastName };
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(enriched));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      dispatch({ type: "SET_USER", user: enriched, token });
      toast.success("Registration successful!");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Registration failed");
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    dispatch({ type: "LOGOUT" });
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        login,
        register,
        logout,
        loading: state.loading,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};