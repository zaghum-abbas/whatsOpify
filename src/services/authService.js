// Authentication service for the WhatsApp Web Extension
import { STORAGE_KEYS, ERROR_MESSAGES } from "../core/constants/index.js";
import stateManager from "../core/state/stateManager.js";

/**
 * Authentication service class
 */
class AuthService {
  constructor() {
    this.tokenKey = STORAGE_KEYS.TOKEN;
    this.isInitialized = false;
    this.init();
  }

  /**
   * Initialize authentication service
   */
  init() {
    if (this.isInitialized) return;

    this.loadTokenFromStorage();
    this.setupStorageListeners();
    this.isInitialized = true;
  }

  /**
   * Load token from storage
   */
  loadTokenFromStorage() {
    try {
      const tokenData = localStorage.getItem(this.tokenKey);
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        const token = parsed.data?.token || parsed.token;
        const userInfo = parsed.data?.user || parsed.user;

        if (token) {
          stateManager.setStateMultiple({
            "auth.isAuthenticated": true,
            "auth.token": token,
            "auth.userInfo": userInfo,
          });
        }
      }
    } catch (error) {
      console.error("[AUTH_SERVICE] Error loading token from storage:", error);
    }
  }

  /**
   * Setup storage event listeners
   */
  setupStorageListeners() {
    // Listen for storage changes
    window.addEventListener("storage", (event) => {
      if (event.key === this.tokenKey) {
        this.handleTokenChange(event.newValue);
      }
    });

    // Listen for postMessage events (from login popup)
    window.addEventListener("message", (event) => {
      if (event.data && event.data.shopilam_token) {
        this.setToken(event.data.shopilam_token);
      }
    });
  }

  /**
   * Handle token change
   * @param {string|null} newToken - New token value
   */
  handleTokenChange(newToken) {
    if (newToken) {
      try {
        const parsed = JSON.parse(newToken);
        const token = parsed.data?.token || parsed.token;
        const userInfo = parsed.data?.user || parsed.user;

        stateManager.setStateMultiple({
          "auth.isAuthenticated": true,
          "auth.token": token,
          "auth.userInfo": userInfo,
        });
      } catch (error) {
        console.error("[AUTH_SERVICE] Error parsing new token:", error);
        this.logout();
      }
    } else {
      this.logout();
    }
  }

  /**
   * Set authentication token
   * @param {string|Object} tokenData - Token data
   * @returns {boolean} Whether token was set successfully
   */
  setToken(tokenData) {
    try {
      let token, userInfo, stores;

      if (typeof tokenData === "string") {
        const parsed = JSON.parse(tokenData);
        token = parsed.data?.token || parsed.token;
        userInfo = parsed.data?.user || parsed.user;
        stores = parsed.data?.stores || parsed.stores;
      } else {
        token = tokenData.data?.token || tokenData.token;
        userInfo = tokenData.data?.user || tokenData.user;
        stores = tokenData.data?.stores || tokenData.stores;
      }

      if (!token) {
        throw new Error("No token found in token data");
      }

      // Store in localStorage
      const storageData = {
        data: {
          token,
          user: userInfo,
          stores: stores || [],
        },
      };

      localStorage.setItem(this.tokenKey, JSON.stringify(storageData));

      // Update state
      stateManager.setStateMultiple({
        "auth.isAuthenticated": true,
        "auth.token": token,
        "auth.userInfo": userInfo,
      });

      console.log("[AUTH_SERVICE] Token set successfully");
      return true;
    } catch (error) {
      console.error("[AUTH_SERVICE] Error setting token:", error);
      return false;
    }
  }

  /**
   * Get current token
   * @returns {string|null} Current token
   */
  getToken() {
    return stateManager.getStateSlice("auth.token");
  }

  /**
   * Get current user info
   * @returns {Object|null} Current user info
   */
  getUserInfo() {
    return stateManager.getStateSlice("auth.userInfo");
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Whether user is authenticated
   */
  isAuthenticated() {
    return stateManager.getStateSlice("auth.isAuthenticated");
  }

  /**
   * Logout user
   */
  logout() {
    try {
      // Clear localStorage
      localStorage.removeItem(this.tokenKey);

      // Clear chrome storage
      chrome.storage.local.remove([this.tokenKey]);

      // Update state
      stateManager.setStateMultiple({
        "auth.isAuthenticated": false,
        "auth.token": null,
        "auth.userInfo": null,
      });

      // Clear caches
      stateManager.clearCache("products");
      stateManager.clearCache("stores");
      stateManager.clearCache("userInfo");

      console.log("[AUTH_SERVICE] User logged out successfully");
    } catch (error) {
      console.error("[AUTH_SERVICE] Error during logout:", error);
    }
  }

  /**
   * Require authentication for protected actions
   * @param {Function} onUnauthenticated - Callback for unauthenticated state
   * @returns {boolean} Whether user is authenticated
   */
  requireAuth(onUnauthenticated) {
    if (!this.isAuthenticated()) {
      if (typeof onUnauthenticated === "function") {
        onUnauthenticated();
      }
      return false;
    }
    return true;
  }

  /**
   * Validate token format
   * @param {string} token - Token to validate
   * @returns {boolean} Whether token is valid
   */
  validateToken(token) {
    if (!token || typeof token !== "string") {
      return false;
    }

    // Basic JWT token validation (has 3 parts separated by dots)
    const parts = token.split(".");
    return parts.length === 3;
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {number|null} Expiration timestamp
   */
  getTokenExpiration(token = this.getToken()) {
    if (!token) return null;

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.error("[AUTH_SERVICE] Error parsing token expiration:", error);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} Whether token is expired
   */
  isTokenExpired(token = this.getToken()) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return false;

    return Date.now() >= expiration;
  }

  /**
   * Refresh token if needed
   * @returns {Promise<boolean>} Whether token was refreshed
   */
  async refreshToken() {
    // This would typically make an API call to refresh the token
    // For now, we'll just check if the current token is still valid
    if (this.isTokenExpired()) {
      console.log("[AUTH_SERVICE] Token expired, logging out");
      this.logout();
      return false;
    }

    return true;
  }

  /**
   * Subscribe to authentication state changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    return stateManager.subscribe("auth", callback);
  }
}

// Create singleton instance
const authService = new AuthService();

export default authService;
export { AuthService };
