// Centralized state management for the WhatsApp Web Extension
import { STORAGE_KEYS, CACHE_CONFIG } from "../constants/index.js";

/**
 * Centralized state manager class
 */
class StateManager {
  constructor() {
    this.state = {
      // Authentication state
      auth: {
        isAuthenticated: false,
        token: null,
        userInfo: null,
        loading: false,
      },

      // UI state
      ui: {
        isSidebarOpen: false,
        activeContact: null,
        showOrderForm: false,
        theme: "light",
      },

      // Data caches
      cache: {
        products: {
          data: null,
          loading: false,
          error: null,
          lastUpdated: null,
        },
        stores: {
          data: null,
          loading: false,
          error: null,
          lastUpdated: null,
        },
        userInfo: {
          data: null,
          loading: false,
          error: null,
          lastUpdated: null,
        },
      },

      // Listeners
      listeners: {
        products: [],
        stores: [],
        userInfo: [],
        auth: [],
        ui: [],
      },
    };

    this.initializeState();
  }

  /**
   * Initialize state from storage
   */
  async initializeState() {
    try {
      // Load auth state
      const tokenData = localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        this.state.auth.isAuthenticated = true;
        this.state.auth.token = parsed.data?.token || parsed.token;
        this.state.auth.userInfo = parsed.data?.user || parsed.user;
      }

      // Load cached data
      await this.loadCachedData();

      console.log("[STATE_MANAGER] State initialized:", this.state);
    } catch (error) {
      console.error("[STATE_MANAGER] Error initializing state:", error);
    }
  }

  /**
   * Load cached data from storage
   */
  async loadCachedData() {
    try {
      const cachedData = await chrome.storage.local.get([
        STORAGE_KEYS.PRODUCTS_CACHE,
        STORAGE_KEYS.STORES_CACHE,
        STORAGE_KEYS.USER_INFO_CACHE,
      ]);

      if (cachedData[STORAGE_KEYS.PRODUCTS_CACHE]) {
        this.state.cache.products.data =
          cachedData[STORAGE_KEYS.PRODUCTS_CACHE];
      }
      if (cachedData[STORAGE_KEYS.STORES_CACHE]) {
        this.state.cache.stores.data = cachedData[STORAGE_KEYS.STORES_CACHE];
      }
      if (cachedData[STORAGE_KEYS.USER_INFO_CACHE]) {
        this.state.cache.userInfo.data =
          cachedData[STORAGE_KEYS.USER_INFO_CACHE];
      }
    } catch (error) {
      console.error("[STATE_MANAGER] Error loading cached data:", error);
    }
  }

  /**
   * Get current state
   * @returns {Object} Current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Get specific state slice
   * @param {string} path - State path (e.g., 'auth.isAuthenticated')
   * @returns {*} State value
   */
  getStateSlice(path) {
    return path.split(".").reduce((obj, key) => obj?.[key], this.state);
  }

  /**
   * Update state
   * @param {string} path - State path
   * @param {*} value - New value
   * @param {boolean} notify - Whether to notify listeners
   */
  setState(path, value, notify = true) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.state);

    target[lastKey] = value;

    if (notify) {
      this.notifyListeners(path);
    }
  }

  /**
   * Update multiple state properties
   * @param {Object} updates - State updates
   * @param {boolean} notify - Whether to notify listeners
   */
  setStateMultiple(updates, notify = true) {
    Object.keys(updates).forEach((path) => {
      this.setState(path, updates[path], false);
    });

    if (notify) {
      this.notifyListeners();
    }
  }

  /**
   * Add listener for state changes
   * @param {string} path - State path to listen to
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    const listener = { path, callback };

    if (path.includes(".")) {
      const [category] = path.split(".");
      this.state.listeners[category] = this.state.listeners[category] || [];
      this.state.listeners[category].push(listener);
    } else {
      this.state.listeners[path] = this.state.listeners[path] || [];
      this.state.listeners[path].push(listener);
    }

    // Return unsubscribe function
    return () => {
      const category = path.includes(".") ? path.split(".")[0] : path;
      const listeners = this.state.listeners[category] || [];
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of state changes
   * @param {string} path - Changed path
   */
  notifyListeners(path) {
    if (path) {
      const [category] = path.split(".");
      const listeners = this.state.listeners[category] || [];
      listeners.forEach(({ callback }) => {
        try {
          callback(this.getStateSlice(path), this.getState());
        } catch (error) {
          console.error("[STATE_MANAGER] Error in listener callback:", error);
        }
      });
    } else {
      // Notify all listeners
      Object.keys(this.state.listeners).forEach((category) => {
        this.notifyListeners(category);
      });
    }
  }

  /**
   * Update cache data
   * @param {string} type - Cache type (products, stores, userInfo)
   * @param {*} data - Data to cache
   * @param {boolean} loading - Loading state
   * @param {string|null} error - Error message
   */
  updateCache(type, data, loading = false, error = null) {
    const cacheKey = `${type}Cache`;
    const storageKey = STORAGE_KEYS[`${type.toUpperCase()}_CACHE`];

    this.setState(`cache.${type}`, {
      data,
      loading,
      error,
      lastUpdated: Date.now(),
    });

    // Save to storage if data is valid
    if (data && !error) {
      chrome.storage.local.set({ [storageKey]: data });
    }
  }

  /**
   * Clear cache
   * @param {string} type - Cache type to clear
   */
  clearCache(type) {
    const storageKey = STORAGE_KEYS[`${type.toUpperCase()}_CACHE`];

    this.setState(`cache.${type}`, {
      data: null,
      loading: false,
      error: null,
      lastUpdated: null,
    });

    chrome.storage.local.remove([storageKey]);
  }

  /**
   * Check if cache is valid
   * @param {string} type - Cache type
   * @returns {boolean} Whether cache is valid
   */
  isCacheValid(type) {
    const cache = this.getStateSlice(`cache.${type}`);
    if (!cache || !cache.lastUpdated) return false;

    const age = Date.now() - cache.lastUpdated;
    return age < CACHE_CONFIG.TTL;
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.state = {
      auth: {
        isAuthenticated: false,
        token: null,
        userInfo: null,
        loading: false,
      },
      ui: {
        isSidebarOpen: false,
        activeContact: null,
        showOrderForm: false,
        theme: "light",
      },
      cache: {
        products: {
          data: null,
          loading: false,
          error: null,
          lastUpdated: null,
        },
        stores: { data: null, loading: false, error: null, lastUpdated: null },
        userInfo: {
          data: null,
          loading: false,
          error: null,
          lastUpdated: null,
        },
      },
      listeners: {
        products: [],
        stores: [],
        userInfo: [],
        auth: [],
        ui: [],
      },
    };

    this.notifyListeners();
  }
}

// Create singleton instance
const stateManager = new StateManager();

export default stateManager;
export { StateManager };

