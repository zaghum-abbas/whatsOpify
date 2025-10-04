// API Client utility for token-based authentication
// This utility provides a centralized way to make API calls with Bearer tokens

/**
 * Make an API call with token-based authentication
 * @param {string} url - The API endpoint URL
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise} - Promise that resolves with the response
 */
export const apiCall = async (url, options = {}) => {
  const defaultOptions = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, mergedOptions);

    // Parse JSON response
    const data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data: data,
      error: response.ok
        ? null
        : data.detail || data.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    console.error("[API_CLIENT] Request failed:", error);
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message,
    };
  }
};

/**
 * GET request with token authentication
 * @param {string} url - The API endpoint URL
 * @param {Object} headers - Additional headers
 * @returns {Promise} - Promise that resolves with the response
 */
export const apiGet = (url, headers = {}) => {
  return apiCall(url, {
    method: "GET",
    headers,
  });
};

/**
 * POST request with token authentication
 * @param {string} url - The API endpoint URL
 * @param {Object} data - Request body data
 * @param {Object} headers - Additional headers
 * @returns {Promise} - Promise that resolves with the response
 */
export const apiPost = (url, data, headers = {}) => {
  return apiCall(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers,
  });
};

/**
 * PUT request with token authentication
 * @param {string} url - The API endpoint URL
 * @param {Object} data - Request body data
 * @param {Object} headers - Additional headers
 * @returns {Promise} - Promise that resolves with the response
 */
export const apiPut = (url, data, headers = {}) => {
  return apiCall(url, {
    method: "PUT",
    body: JSON.stringify(data),
    headers,
  });
};

/**
 * DELETE request with token authentication
 * @param {string} url - The API endpoint URL
 * @param {Object} headers - Additional headers
 * @returns {Promise} - Promise that resolves with the response
 */
export const apiDelete = (url, headers = {}) => {
  return apiCall(url, {
    method: "DELETE",
    headers,
  });
};

// Orders API specific functions
export const ordersApi = {
  /**
   * Fetch orders by status
   * @param {string} status - Order status (open, pending, etc.)
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 50)
   * @returns {Promise} - Promise that resolves with orders data
   */
  fetchOrders: (status, page = 1, limit = 50) => {
    const url = `https://api.shopilam.com/api/v1/orders?status=${status}&page=${page}&limit=${limit}`;
    return apiGet(url);
  },

  /**
   * Update order status
   * @param {string} orderId - Order ID to update
   * @param {string} status - New status
   * @returns {Promise} - Promise that resolves with update result
   */
  updateOrderStatus: (orderId, status) => {
    const url = `https://api.shopilam.com/api/v1/orders/${orderId}`;
    return apiPut(url, { status });
  },

  /**
   * Create a new order
   * @param {Object} orderData - Order data
   * @returns {Promise} - Promise that resolves with created order
   */
  createOrder: (orderData) => {
    const url = "https://api.shopilam.com/api/v1/orders";
    return apiPost(url, orderData);
  },
};

// Products API specific functions
export const productsApi = {
  /**
   * Fetch all products
   * @returns {Promise} - Promise that resolves with products data
   */
  fetchProducts: () => {
    const url = `https://api.shopilam.com/api/v1/products?limit=50&page=1&status=active`;
    return apiGet(url);
  },
};

export default {
  apiCall,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  ordersApi,
  productsApi,
};
