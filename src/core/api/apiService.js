// Centralized API service for the WhatsApp Web Extension
import {
  API_CONFIG,
  MESSAGE_TYPES,
  ERROR_MESSAGES,
} from "../constants/index.js";

/**
 * Centralized API service class
 */
class ApiService {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
    this.retryAttempts = API_CONFIG.RETRY_ATTEMPTS;
  }

  /**
   * Make a request to the background script
   * @param {string} type - Message type
   * @param {Object} payload - Request payload
   * @returns {Promise<ApiResponse>}
   */
  async sendMessage(type, payload = {}) {
    try {
      console.log(`[API_SERVICE] Sending message: ${type}`, payload);

      const response = await chrome.runtime.sendMessage({
        type,
        ...payload,
      });

      if (!response) {
        throw new Error("No response received from background script");
      }

      console.log(`[API_SERVICE] Response received for ${type}:`, response);
      return response;
    } catch (error) {
      console.error(`[API_SERVICE] Error sending message ${type}:`, error);
      return {
        success: false,
        error: error.message || ERROR_MESSAGES.API_ERROR,
        data: null,
      };
    }
  }

  /**
   * Fetch products from API
   * @param {Object} params - Query parameters
   * @returns {Promise<ApiResponse>}
   */
  async fetchProducts(params = {}) {
    return this.sendMessage(MESSAGE_TYPES.FETCH_PRODUCTS, { params });
  }

  /**
   * Fetch orders from API
   * @param {Object} params - Query parameters
   * @returns {Promise<ApiResponse>}
   */
  async fetchOrders(params = {}) {
    return this.sendMessage(MESSAGE_TYPES.FETCH_ORDERS, { params });
  }

  /**
   * Fetch user info from API
   * @returns {Promise<ApiResponse>}
   */
  async fetchUserInfo() {
    return this.sendMessage(MESSAGE_TYPES.FETCH_USER_INFO);
  }

  /**
   * Fetch stores from API
   * @returns {Promise<ApiResponse>}
   */
  async fetchStores() {
    return this.sendMessage(MESSAGE_TYPES.FETCH_STORES);
  }

  /**
   * Create a new order
   * @param {Object} orderData - Order data
   * @returns {Promise<ApiResponse>}
   */
  async createOrder(orderData) {
    return this.sendMessage(MESSAGE_TYPES.CREATE_ORDER, { data: orderData });
  }

  /**
   * Update order status
   * @param {string} orderId - Order ID
   * @param {string} status - New status
   * @returns {Promise<ApiResponse>}
   */
  async updateOrderStatus(orderId, status) {
    return this.sendMessage(MESSAGE_TYPES.UPDATE_ORDER_STATUS, {
      orderId,
      status,
    });
  }

  /**
   * Retry a failed request
   * @param {Function} requestFn - Request function to retry
   * @param {number} attempts - Number of attempts remaining
   * @returns {Promise<ApiResponse>}
   */
  async retryRequest(requestFn, attempts = this.retryAttempts) {
    try {
      const result = await requestFn();
      if (result.success || attempts <= 0) {
        return result;
      }

      console.log(
        `[API_SERVICE] Retrying request, attempts left: ${attempts - 1}`
      );
      await this.delay(1000); // Wait 1 second before retry
      return this.retryRequest(requestFn, attempts - 1);
    } catch (error) {
      if (attempts <= 0) {
        throw error;
      }
      console.log(
        `[API_SERVICE] Retrying after error, attempts left: ${attempts - 1}`
      );
      await this.delay(1000);
      return this.retryRequest(requestFn, attempts - 1);
    }
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if Chrome extension API is available
   * @returns {boolean}
   */
  isChromeApiAvailable() {
    return (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    );
  }

  /**
   * Validate API response
   * @param {ApiResponse} response - API response to validate
   * @returns {boolean}
   */
  isValidResponse(response) {
    return response && typeof response === "object" && "success" in response;
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
export { ApiService };

