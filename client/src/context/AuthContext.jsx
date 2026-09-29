import { createContext, useContext, useEffect, useState } from "react";
import { authAPI, profileAPI } from "../services/api";

const AuthContext = createContext(null);

function extractAuthData(response) {
  const responseData = response?.data;
  const data = responseData?.data || responseData;

  return {
    token: data?.token,
    user: data?.user,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("college_ai_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("college_ai_token");

    if (!token) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await profileAPI.get();
        const profile = response.data?.data;

        if (profile) {
          setUser(profile);
          localStorage.setItem("college_ai_user", JSON.stringify(profile));
        }
      } catch (error) {
        console.error("Failed to load profile");

        if (error.response?.status === 401) {
          localStorage.removeItem("college_ai_token");
          localStorage.removeItem("college_ai_user");
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const saveAuthData = (data) => {
    if (!data?.token || !data?.user) {
      console.error("Invalid authentication response");
      throw new Error("Invalid authentication response from server.");
    }

    localStorage.setItem("college_ai_token", data.token);
    localStorage.setItem("college_ai_user", JSON.stringify(data.user));

    setUser(data.user);

    return data;
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const data = extractAuthData(response);
      return saveAuthData(data);
    } catch (err) {
      if (err.response?.data?.requiresEmailVerification) {
        return {
          requiresVerification: true,
          email: err.response.data.email || email,
          message: err.response.data.message,
        };
      }
      throw err;
    }
  };

  const register = async (formData) => {
    const response = await authAPI.register(formData);
    const resData = response?.data;

    if (resData?.requiresEmailVerification) {
      return {
        requiresVerification: true,
        email: resData.email || formData.email,
        message: resData.message,
      };
    }

    const data = extractAuthData(response);
    if (data?.token && data?.user) {
      return saveAuthData(data);
    }

    return resData;
  };

  const verifyEmail = async (email, otp) => {
    const response = await authAPI.verifyEmail({ email, otp });
    if (!response.data?.data?.token || !response.data?.data?.user) {
      return response.data;
    }
    const data = extractAuthData(response);
    return saveAuthData(data);
  };

  const resendVerification = async (email) => {
    const response = await authAPI.resendVerification({ email });
    return response.data;
  };

  const forgotPassword = async (email) => {
    const response = await authAPI.forgotPassword({ email });
    return response.data;
  };

  const verifyResetOtp = async (email, otp) => {
    const response = await authAPI.verifyResetOtp({ email, otp });
    return response.data;
  };

  const resetPassword = async (email, otp, newPassword) => {
    const response = await authAPI.resetPassword({ email, otp, newPassword });
    return response.data;
  };

  const logout = async () => {
    const token = localStorage.getItem("college_ai_token");
    try {
      if (token) await authAPI.logout();
    } catch {
      // Clear local credentials even when the API is unreachable.
    }
    localStorage.removeItem("college_ai_token");
    localStorage.removeItem("college_ai_user");
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("college_ai_user", JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
