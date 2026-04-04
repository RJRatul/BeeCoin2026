"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Configure axios defaults
axios.defaults.withCredentials = true;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Extract firstName and lastName from name if not present
      if (parsedUser.name && !parsedUser.firstName) {
        const nameParts = parsedUser.name.split(" ");
        parsedUser.firstName = nameParts[0] || "";
        parsedUser.lastName = nameParts.slice(1).join(" ") || "";
      }
      setToken(storedToken);
      setUser(parsedUser);
      // Set default authorization header
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }
    setLoading(false);
  }, []);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updatedUser = response.data.user;
      // Extract firstName and lastName from name
      if (updatedUser.name && !updatedUser.firstName) {
        const nameParts = updatedUser.name.split(" ");
        updatedUser.firstName = nameParts[0] || "";
        updatedUser.lastName = nameParts.slice(1).join(" ") || "";
      }
      
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });
      const { token, user } = response.data;

      // Check if user is suspended
      if (user.status === "inactive") {
        throw new Error(
          "Your account has been suspended. Please contact support.",
        );
      }

      // Extract firstName and lastName from name
      if (user.name && !user.firstName) {
        const nameParts = user.name.split(" ");
        user.firstName = nameParts[0] || "";
        user.lastName = nameParts.slice(1).join(" ") || "";
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setToken(token);
      setUser(user);
      toast.success("Login successful!");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.message || "Login failed");
      throw error;
    }
  };

  const register = async (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => {
    try {
      const fullName = `${firstName} ${lastName}`;
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: fullName,
        email,
        password,
      });
      const { token, user } = response.data;
      
      // Add firstName and lastName to user object
      user.firstName = firstName;
      user.lastName = lastName;
      
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setToken(token);
      setUser(user);
      toast.success("Registration successful!");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.response?.data?.message || "Registration failed");
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, loading, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};