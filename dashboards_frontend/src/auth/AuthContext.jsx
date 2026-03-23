import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredAuth, logout as authLogout } from '../api/auth.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load auth from localStorage on mount
  useEffect(() => {
    const stored = getStoredAuth();
    if (stored.token) {
      setToken(stored.token);
      setRole(stored.role);
      setUser({
        userId: stored.userId,
        firstName: stored.firstName,
      });
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setToken(userData.token);
    setRole(userData.userRole);
    setUser({
      userId: userData.user_id,
      firstName: userData.first_name,
    });
  };

  const logout = () => {
    authLogout();
    setToken(null);
    setRole(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
