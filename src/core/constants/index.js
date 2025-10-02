// Core constants for the WhatsApp Web Extension

// API Configuration
export const API_CONFIG = {
  BASE_URL: "https://api1.shopilam.com/api/v1",
  ENDPOINTS: {
    PRODUCTS: "/products",
    ORDERS: "/orders",
    USER_INFO: "/auth/me",
    STORES: "/stores/",
  },
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
};

// Storage Keys
export const STORAGE_KEYS = {
  TOKEN: "whatsopify_token",
  PRODUCTS_CACHE: "whatsopify_products_cache",
  STORES_CACHE: "whatsopify_stores_cache",
  USER_INFO_CACHE: "whatsopify_user_info_cache",
  SETTINGS: "whatsopify_settings",
};

// UI Constants
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: "400px",
  TOOLBAR_HEIGHT: "48px",
  MODAL_Z_INDEX: 10000,
  ANIMATION_DURATION: 300,
};

// Theme Configuration
export const THEME = {
  DARK: {
    bg: "#18191a",
    card: "#23272a",
    text: "#e4e6eb",
    subText: "#b0b3b8",
    accent: "#00bfae",
    border: "#333",
  },
  LIGHT: {
    bg: "#f7f7f7",
    card: "#fff",
    text: "#222",
    subText: "#555",
    accent: "#00bfae",
    border: "#e2e8f0",
  },
};

// Message Types
export const MESSAGE_TYPES = {
  FETCH_PRODUCTS: "FETCH_PRODUCTS",
  FETCH_ORDERS: "FETCH_ORDERS",
  FETCH_USER_INFO: "FETCH_USER_INFO",
  FETCH_STORES: "FETCH_STORES",
  CREATE_ORDER: "CREATE_ORDER",
  UPDATE_ORDER_STATUS: "UPDATE_ORDER_STATUS",
  HTTP_REQUEST: "HTTP_REQUEST",
};

// Order Status
export const ORDER_STATUS = {
  NEW: "new",
  PENDING: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

// Product Status
export const PRODUCT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DRAFT: "draft",
};

// Error Messages
export const ERROR_MESSAGES = {
  NO_TOKEN: "Authentication token not found. Please login again.",
  NETWORK_ERROR: "Network error. Please check your connection.",
  API_ERROR: "API error occurred. Please try again.",
  INVALID_TOKEN: "Invalid token format. Please login again.",
  CHROME_API_UNAVAILABLE:
    "Chrome Extension API not available. Please reload the extension.",
};

// Success Messages
export const SUCCESS_MESSAGES = {
  ORDER_CREATED: "Order created successfully",
  ORDER_UPDATED: "Order updated successfully",
  DATA_LOADED: "Data loaded successfully",
};

// Selectors for WhatsApp Web
export const WHATSAPP_SELECTORS = {
  MAIN_CONTENT: '[data-testid="main"]',
  CHAT_LIST: '[data-testid="chat-list"]',
  CHAT_HEADER: '[data-testid="conversation-header"]',
  MESSAGE_INPUT: '[data-testid="conversation-compose-box-input"]',
  SEND_BUTTON: '[data-testid="send"]',
  SIDEBAR: '[data-testid="side"]',
};

// Cache Configuration
export const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000, // 5 minutes
  MAX_SIZE: 100, // Maximum number of items in cache
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
};

// Development Configuration
export const DEV_CONFIG = {
  DEBUG_MODE: process.env.NODE_ENV === "development",
  LOG_LEVEL: process.env.NODE_ENV === "development" ? "debug" : "error",
  ENABLE_CONSOLE_LOGS: process.env.NODE_ENV === "development",
};

export default {
  API_CONFIG,
  STORAGE_KEYS,
  UI_CONSTANTS,
  THEME,
  MESSAGE_TYPES,
  ORDER_STATUS,
  PRODUCT_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  WHATSAPP_SELECTORS,
  CACHE_CONFIG,
  DEV_CONFIG,
};

