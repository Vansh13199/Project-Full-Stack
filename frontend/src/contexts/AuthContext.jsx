import { createContext, useContext, useState, useEffect } from 'react';
import { apiCall } from '../utils/api';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

const CURRENT_USER_KEY = 'ams_current_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const setCurrentUser = (userData) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const clearSession = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  };

  const registerUser = async (name, email, phone, password, role) => {
    const data = await apiCall('/auth/register', 'POST', { name, email, phone, password, role });
    setCurrentUser(data.user);
    return data;
  };

  const loginUser = async (email, password) => {
    const data = await apiCall('/auth/login', 'POST', { email, password });
    setCurrentUser(data.user);
    return data;
  };

  const forgotPassword = async (email) => {
    return await apiCall('/send-reset-email', 'POST', { email });
  };

  const resetPassword = async (email, newPassword) => {
    return await apiCall('/auth/reset-password-confirm', 'POST', { email, newPassword });
  };

  const logout = () => {
    clearSession();
  };

  const value = {
    user,
    isAuthenticated: !!user,
    role: user?.role,
    registerUser,
    loginUser,
    forgotPassword,
    resetPassword,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
