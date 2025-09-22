import React, { createContext, useContext, useState, useEffect } from 'react';
export const TOKEN_KEY = 'whatsopify_token';

// Middleware for protected actions
export function requireAuth(setShowLoginModal) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    if (typeof setShowLoginModal === 'function') setShowLoginModal(true);
    return false;
  }
  return true;
}

// React hook for auth state
export function useAuthState() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem(TOKEN_KEY);
      setIsAuthenticated(!!token);
    };
    checkAuth();
    const handleStorageChange = (event) => handleAuthStorage(event, setIsAuthenticated);
    const handleMessage = (event) => handleAuthMessage(event, setIsAuthenticated);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return [isAuthenticated, setIsAuthenticated];
}

// Handle postMessage auth (for login popup/modal)
export function handleAuthMessage(event, setIsAuthenticated) {
  if (event.data && event.data.shopilam_token) {
    localStorage.setItem(TOKEN_KEY, event.data.shopilam_token);
    setIsAuthenticated(true);
  }
}

// Handle storage event for auth sync
export function handleAuthStorage(event, setIsAuthenticated) {
  if (event.key === TOKEN_KEY && event.newValue) {
    setIsAuthenticated(true);
  } else if (event.key === TOKEN_KEY && !event.newValue) {
    setIsAuthenticated(false);
  }
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useAuthState();

  const login = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
