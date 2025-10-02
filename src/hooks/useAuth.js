// Custom hook for authentication state
import { useState, useEffect } from "react";
import authService from "../services/authService.js";

/**
 * Custom hook for authentication state
 * @returns {Object} Authentication state and methods
 */
export function useAuth() {
  const [authState, setAuthState] = useState({
    isAuthenticated: authService.isAuthenticated(),
    token: authService.getToken(),
    userInfo: authService.getUserInfo(),
    loading: false,
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((newAuthState) => {
      setAuthState({
        isAuthenticated: newAuthState.isAuthenticated,
        token: newAuthState.token,
        userInfo: newAuthState.userInfo,
        loading: false,
      });
    });

    return unsubscribe;
  }, []);

  const login = (tokenData) => {
    setAuthState((prev) => ({ ...prev, loading: true }));
    const success = authService.setToken(tokenData);
    setAuthState((prev) => ({ ...prev, loading: false }));
    return success;
  };

  const logout = () => {
    authService.logout();
  };

  const requireAuth = (onUnauthenticated) => {
    return authService.requireAuth(onUnauthenticated);
  };

  return {
    ...authState,
    login,
    logout,
    requireAuth,
  };
}

export default useAuth;

