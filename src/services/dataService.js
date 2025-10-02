// Data service for managing API data and caching
import apiService from "../core/api/apiService.js";
import stateManager from "../core/state/stateManager.js";
import { CACHE_CONFIG } from "../core/constants/index.js";

/**
 * Data service class for managing API data
 */
class DataService {
  constructor() {
    this.cacheConfig = CACHE_CONFIG;
    this.setupCacheCleanup();
  }

  /**
   * Setup automatic cache cleanup
   */
  setupCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, this.cacheConfig.CLEANUP_INTERVAL);
  }

  /**
   * Cleanup expired cache entries
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const cacheTypes = ["products", "stores", "userInfo"];

    cacheTypes.forEach((type) => {
      const cache = stateManager.getStateSlice(`cache.${type}`);
      if (cache && cache.lastUpdated) {
        const age = now - cache.lastUpdated;
        if (age > this.cacheConfig.TTL) {
          console.log(`[DATA_SERVICE] Cleaning up expired ${type} cache`);
          stateManager.clearCache(type);
        }
      }
    });
  }

  /**
   * Fetch products with caching
   * @param {Object} params - Query parameters
   * @param {boolean} forceRefresh - Force refresh from API
   * @returns {Promise<Array>} Products array
   */
  async fetchProducts(params = {}, forceRefresh = false) {
    const cacheKey = "products";

    // Check cache first
    if (!forceRefresh && stateManager.isCacheValid(cacheKey)) {
      const cachedData = stateManager.getStateSlice(`cache.${cacheKey}.data`);
      if (cachedData) {
        console.log("[DATA_SERVICE] Returning cached products");
        return cachedData;
      }
    }

    // Set loading state
    stateManager.setState(`cache.${cacheKey}.loading`, true);
    stateManager.setState(`cache.${cacheKey}.error`, null);

    try {
      const response = await apiService.fetchProducts(params);

      if (response.success && response.products) {
        // Process products
        const processedProducts = this.processProducts(response.products);

        // Update cache
        stateManager.updateCache(cacheKey, processedProducts);

        console.log(
          `[DATA_SERVICE] Fetched ${processedProducts.length} products`
        );
        return processedProducts;
      } else {
        throw new Error(response.error || "Failed to fetch products");
      }
    } catch (error) {
      console.error("[DATA_SERVICE] Error fetching products:", error);
      stateManager.setState(`cache.${cacheKey}.error`, error.message);
      throw error;
    } finally {
      stateManager.setState(`cache.${cacheKey}.loading`, false);
    }
  }

  /**
   * Fetch stores with caching
   * @param {boolean} forceRefresh - Force refresh from API
   * @returns {Promise<Array>} Stores array
   */
  async fetchStores(forceRefresh = false) {
    const cacheKey = "stores";

    // Check cache first
    if (!forceRefresh && stateManager.isCacheValid(cacheKey)) {
      const cachedData = stateManager.getStateSlice(`cache.${cacheKey}.data`);
      if (cachedData) {
        console.log("[DATA_SERVICE] Returning cached stores");
        return cachedData;
      }
    }

    // Set loading state
    stateManager.setState(`cache.${cacheKey}.loading`, true);
    stateManager.setState(`cache.${cacheKey}.error`, null);

    try {
      const response = await apiService.fetchStores();

      if (response.success && response.stores) {
        // Process stores
        const processedStores = this.processStores(response.stores);

        // Update cache
        stateManager.updateCache(cacheKey, processedStores);

        console.log(`[DATA_SERVICE] Fetched ${processedStores.length} stores`);
        return processedStores;
      } else {
        throw new Error(response.error || "Failed to fetch stores");
      }
    } catch (error) {
      console.error("[DATA_SERVICE] Error fetching stores:", error);
      stateManager.setState(`cache.${cacheKey}.error`, error.message);
      throw error;
    } finally {
      stateManager.setState(`cache.${cacheKey}.loading`, false);
    }
  }

  /**
   * Fetch user info with caching
   * @param {boolean} forceRefresh - Force refresh from API
   * @returns {Promise<Object>} User info object
   */
  async fetchUserInfo(forceRefresh = false) {
    const cacheKey = "userInfo";

    // Check cache first
    if (!forceRefresh && stateManager.isCacheValid(cacheKey)) {
      const cachedData = stateManager.getStateSlice(`cache.${cacheKey}.data`);
      if (cachedData) {
        console.log("[DATA_SERVICE] Returning cached user info");
        return cachedData;
      }
    }

    // Set loading state
    stateManager.setState(`cache.${cacheKey}.loading`, true);
    stateManager.setState(`cache.${cacheKey}.error`, null);

    try {
      const response = await apiService.fetchUserInfo();

      if (response.success && response.userInfo) {
        // Process user info
        const processedUserInfo = this.processUserInfo(response.userInfo);

        // Update cache
        stateManager.updateCache(cacheKey, processedUserInfo);

        console.log("[DATA_SERVICE] Fetched user info");
        return processedUserInfo;
      } else {
        throw new Error(response.error || "Failed to fetch user info");
      }
    } catch (error) {
      console.error("[DATA_SERVICE] Error fetching user info:", error);
      stateManager.setState(`cache.${cacheKey}.error`, error.message);
      throw error;
    } finally {
      stateManager.setState(`cache.${cacheKey}.loading`, false);
    }
  }

  /**
   * Fetch orders
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Orders array
   */
  async fetchOrders(params = {}) {
    try {
      const response = await apiService.fetchOrders(params);

      if (response.success && response.orders) {
        console.log(`[DATA_SERVICE] Fetched ${response.orders.length} orders`);
        return response.orders;
      } else {
        throw new Error(response.error || "Failed to fetch orders");
      }
    } catch (error) {
      console.error("[DATA_SERVICE] Error fetching orders:", error);
      throw error;
    }
  }

  /**
   * Create order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order
   */
  async createOrder(orderData) {
    try {
      const response = await apiService.createOrder(orderData);

      if (response.success && response.order) {
        console.log("[DATA_SERVICE] Order created successfully");
        return response.order;
      } else {
        throw new Error(response.error || "Failed to create order");
      }
    } catch (error) {
      console.error("[DATA_SERVICE] Error creating order:", error);
      throw error;
    }
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(orderId, status) {
    try {
      const response = await apiService.updateOrderStatus(orderId, status);

      if (response.success && response.order) {
        console.log("[DATA_SERVICE] Order status updated successfully");
        return response.order;
      } else {
        throw new Error(response.error || "Failed to update order status");
      }
    } catch (error) {
      console.error("[DATA_SERVICE] Error updating order status:", error);
      throw error;
    }
  }

  /**
   * Process products data
   * @param {Array} products - Raw products data
   * @returns {Array} Processed products
   */
  processProducts(products) {
    if (!Array.isArray(products)) {
      console.warn("[DATA_SERVICE] Products data is not an array:", products);
      return [];
    }

    return products.map((product, index) => {
      console.log(`[DATA_SERVICE] Processing product ${index + 1}:`, product);

      return {
        id: product._id || product.id,
        name: product.title || product.name || "Unnamed",
        vendor: product.vendor || "",
        category: product.category || "",
        description: product.description || "",
        storeId: product.storeId || product.store_id,
        variants: Array.isArray(product.variants) ? product.variants : [],
        price:
          product.price ||
          (Array.isArray(product.variants) && product.variants.length > 0
            ? product.variants[0].price
            : "N/A"),
        image:
          Array.isArray(product.images) && product.images.length > 0
            ? product.images[0].url
            : null,
      };
    });
  }

  /**
   * Process stores data
   * @param {Array} stores - Raw stores data
   * @returns {Array} Processed stores
   */
  processStores(stores) {
    if (!Array.isArray(stores)) {
      console.warn("[DATA_SERVICE] Stores data is not an array:", stores);
      return [];
    }

    return stores.map((store) => ({
      id: store._id || store.id,
      name: store.name || store.store_name || "Unnamed Store",
      status: store.status || "active",
      isActive: !(
        store.status === "inactive" ||
        store.status === "Inactive" ||
        store.status === "INACTIVE" ||
        store.status === "disabled" ||
        store.status === "Disabled" ||
        store.isActive === false ||
        store.active === false ||
        store.enabled === false ||
        store.is_active === false
      ),
      settings: store.settings || {},
    }));
  }

  /**
   * Process user info data
   * @param {Object} userInfo - Raw user info data
   * @returns {Object} Processed user info
   */
  processUserInfo(userInfo) {
    if (!userInfo || typeof userInfo !== "object") {
      console.warn("[DATA_SERVICE] User info data is not an object:", userInfo);
      return null;
    }

    return {
      id: userInfo._id || userInfo.id,
      name: userInfo.name || userInfo.username || "Unknown User",
      email: userInfo.email || "",
      role: userInfo.role || "user",
      preferences: userInfo.preferences || {},
    };
  }

  /**
   * Get cached data
   * @param {string} type - Data type (products, stores, userInfo)
   * @returns {*} Cached data
   */
  getCachedData(type) {
    return stateManager.getStateSlice(`cache.${type}.data`);
  }

  /**
   * Get loading state
   * @param {string} type - Data type
   * @returns {boolean} Loading state
   */
  isLoading(type) {
    return stateManager.getStateSlice(`cache.${type}.loading`);
  }

  /**
   * Get error state
   * @param {string} type - Data type
   * @returns {string|null} Error message
   */
  getError(type) {
    return stateManager.getStateSlice(`cache.${type}.error`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    stateManager.clearCache("products");
    stateManager.clearCache("stores");
    stateManager.clearCache("userInfo");
    console.log("[DATA_SERVICE] All caches cleared");
  }

  /**
   * Subscribe to data changes
   * @param {string} type - Data type
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(type, callback) {
    return stateManager.subscribe(`cache.${type}`, callback);
  }
}

// Create singleton instance
const dataService = new DataService();

export default dataService;
export { DataService };
