// Refactored background script for WhatsApp Web Extension
import {
  MESSAGE_TYPES,
  ERROR_MESSAGES,
  API_CONFIG,
} from "../core/constants/index.js";

/**
 * Background script manager class
 */
class BackgroundManager {
  constructor() {
    this.setupMessageListener();
    console.log("🚀 Refactored background script loaded");
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("[BG] Received message:", request.type);

      // Handle different message types
      switch (request.type) {
        case MESSAGE_TYPES.FETCH_PRODUCTS:
          this.handleFetchProducts(request, sender, sendResponse);
          return true; // Required for async sendResponse

        case MESSAGE_TYPES.FETCH_ORDERS:
          this.handleFetchOrders(request, sender, sendResponse);
          return true;

        case MESSAGE_TYPES.FETCH_USER_INFO:
          this.handleFetchUserInfo(request, sender, sendResponse);
          return true;

        case MESSAGE_TYPES.FETCH_STORES:
          this.handleFetchStores(request, sender, sendResponse);
          return true;

        case MESSAGE_TYPES.CREATE_ORDER:
          this.handleCreateOrder(request, sender, sendResponse);
          return true;

        case MESSAGE_TYPES.UPDATE_ORDER_STATUS:
          this.handleUpdateOrderStatus(request, sender, sendResponse);
          return true;

        default:
          console.warn("[BG] Unknown message type:", request.type);
          sendResponse({
            success: false,
            error: `Unknown message type: ${request.type}`,
          });
          return false;
      }
    });
  }

  /**
   * Handle products fetch request
   */
  async handleFetchProducts(request, sender, sendResponse) {
    try {
      console.log("[BG] Fetching products...");

      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.PRODUCTS}`;
      const response = await this.makeApiCall(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.success) {
        sendResponse({
          success: true,
          products: response.data,
        });
      } else {
        sendResponse({
          success: false,
          error: response.error,
        });
      }
    } catch (error) {
      console.error("[BG] Error fetching products:", error);
      sendResponse({
        success: false,
        error: error.message || ERROR_MESSAGES.API_ERROR,
      });
    }
  }

  /**
   * Handle orders fetch request
   */
  async handleFetchOrders(request, sender, sendResponse) {
    try {
      console.log("[BG] Fetching orders...");

      const { status, page = 1, limit = 50 } = request;
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}?status=${status}&page=${page}&limit=${limit}`;

      const response = await this.makeApiCall(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.success) {
        sendResponse({
          success: true,
          orders: response.data,
        });
      } else {
        sendResponse({
          success: false,
          error: response.error,
        });
      }
    } catch (error) {
      console.error("[BG] Error fetching orders:", error);
      sendResponse({
        success: false,
        error: error.message || ERROR_MESSAGES.API_ERROR,
      });
    }
  }

  /**
   * Handle user info fetch request
   */
  async handleFetchUserInfo(request, sender, sendResponse) {
    try {
      console.log("[BG] Fetching user info...");

      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER_INFO}`;
      const response = await this.makeApiCall(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.success) {
        sendResponse({
          success: true,
          userInfo: response.data,
        });
      } else {
        sendResponse({
          success: false,
          error: response.error,
        });
      }
    } catch (error) {
      console.error("[BG] Error fetching user info:", error);
      sendResponse({
        success: false,
        error: error.message || ERROR_MESSAGES.API_ERROR,
      });
    }
  }

  /**
   * Handle stores fetch request
   */
  async handleFetchStores(request, sender, sendResponse) {
    try {
      console.log("[BG] Fetching stores...");

      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STORES}`;
      const response = await this.makeApiCall(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.success) {
        sendResponse({
          success: true,
          stores: response.data,
        });
      } else {
        sendResponse({
          success: false,
          error: response.error,
        });
      }
    } catch (error) {
      console.error("[BG] Error fetching stores:", error);
      sendResponse({
        success: false,
        error: error.message || ERROR_MESSAGES.API_ERROR,
      });
    }
  }

  /**
   * Handle create order request
   */
  async handleCreateOrder(request, sender, sendResponse) {
    try {
      console.log("[BG] Creating order...", request.data);

      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}`;
      const response = await this.makeApiCall(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request.data),
      });

      if (response.success) {
        sendResponse({
          success: true,
          order: response.data,
        });
      } else {
        sendResponse({
          success: false,
          error: response.error,
        });
      }
    } catch (error) {
      console.error("[BG] Error creating order:", error);
      sendResponse({
        success: false,
        error: error.message || ERROR_MESSAGES.API_ERROR,
      });
    }
  }

  /**
   * Handle update order status request
   */
  async handleUpdateOrderStatus(request, sender, sendResponse) {
    try {
      console.log(
        "[BG] Updating order status...",
        request.orderId,
        request.status
      );

      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ORDERS}/${request.orderId}`;
      const response = await this.makeApiCall(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: request.status }),
      });

      if (response.success) {
        sendResponse({
          success: true,
          order: response.data,
        });
      } else {
        sendResponse({
          success: false,
          error: response.error,
        });
      }
    } catch (error) {
      console.error("[BG] Error updating order status:", error);
      sendResponse({
        success: false,
        error: error.message || ERROR_MESSAGES.API_ERROR,
      });
    }
  }

  /**
   * Make API call with token authentication
   */
  async makeApiCall(url, options) {
    console.log("[BG] Making API call:", url);

    try {
      // Get token from storage
      const token = await this.getToken();

      if (!token) {
        throw new Error(ERROR_MESSAGES.NO_TOKEN);
      }

      // Add authorization header
      const headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };

      // Make the request
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data: data,
        };
      } else {
        return {
          success: false,
          error: data.detail || data.message || `HTTP ${response.status}`,
          data: data,
        };
      }
    } catch (error) {
      console.error("[BG] API call failed:", error);
      return {
        success: false,
        error: error.message || ERROR_MESSAGES.NETWORK_ERROR,
      };
    }
  }

  /**
   * Get authentication token
   */
  async getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["whatsopify_token"], (result) => {
        try {
          if (result.whatsopify_token) {
            const tokenData = JSON.parse(result.whatsopify_token);
            const token = tokenData.data?.token || tokenData.token;
            resolve(token);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.error("[BG] Error parsing token:", error);
          resolve(null);
        }
      });
    });
  }
}

// Initialize background manager
const backgroundManager = new BackgroundManager();

export default backgroundManager;

