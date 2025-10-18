// Type definitions and interfaces for the WhatsApp Web Extension

/**
 * @typedef {Object} Product
 * @property {string} id - Product ID
 * @property {string} name - Product name
 * @property {string} vendor - Product vendor
 * @property {string} category - Product category
 * @property {string} description - Product description
 * @property {string} storeId - Store ID
 * @property {Array<Object>} variants - Product variants
 * @property {string|number} price - Product price
 * @property {string|null} image - Product image URL
 */

/**
 * @typedef {Object} Store
 * @property {string} id - Store ID
 * @property {string} name - Store name
 * @property {string} status - Store status
 * @property {boolean} isActive - Whether store is active
 * @property {Object} settings - Store settings
 */

/**
 * @typedef {Object} Order
 * @property {string} id - Order ID
 * @property {string} orderNumber - Order number
 * @property {string} dateTime - Order date and time
 * @property {string} customerName - Customer name
 * @property {string} phoneNumber - Customer phone number
 * @property {string} status - Order status
 * @property {string|number} total - Order total
 * @property {Array<string>} items - Order items
 */

/**
 * @typedef {Object} UserInfo
 * @property {string} id - User ID
 * @property {string} name - User name
 * @property {string} email - User email
 * @property {string} role - User role
 * @property {Object} preferences - User preferences
 */

/**
 * @typedef {Object} Contact
 * @property {string} id - Contact ID
 * @property {string} name - Contact name
 * @property {string} phoneNumber - Contact phone number
 * @property {string} profilePicture - Contact profile picture URL
 * @property {boolean} isGroup - Whether contact is a group
 */

/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {*} data - Response data
 * @property {string|null} error - Error message if any
 * @property {number} status - HTTP status code
 */

/**
 * @typedef {Object} CacheState
 * @property {*} data - Cached data
 * @property {boolean} loading - Whether data is being loaded
 * @property {string|null} error - Error message if any
 * @property {number} lastUpdated - Timestamp of last update
 */

/**
 * @typedef {Object} SidebarProps
 * @property {Contact} contact - Active contact
 * @property {Array<Product>} catalog - Product catalog
 * @property {Array<Store>} stores - Available stores
 * @property {string} notes - Contact notes
 * @property {Function} onNotesChange - Notes change handler
 * @property {UserInfo|null} userInfo - User information
 * @property {boolean} showOrderForm - Whether to show order form
 * @property {Function} onOrderFormToggle - Order form toggle handler
 */

/**
 * @typedef {Object} Theme
 * @property {string} bg - Background color
 * @property {string} card - Card background color
 * @property {string} text - Text color
 * @property {string} subText - Sub text color
 * @property {string} accent - Accent color
 * @property {string} border - Border color
 */

/**
 * @typedef {Object} MessageData
 * @property {string} type - Message type
 * @property {*} payload - Message payload
 * @property {string} id - Message ID
 * @property {number} timestamp - Message timestamp
 */

/**
 * @typedef {Object} OrderFormData
 * @property {string} customerName - Customer name
 * @property {string} phoneNumber - Customer phone number
 * @property {Array<Object>} items - Order items
 * @property {string} notes - Order notes
 * @property {string} storeId - Store ID
 */

/**
 * @typedef {Object} AuthState
 * @property {boolean} isAuthenticated - Whether user is authenticated
 * @property {string|null} token - Authentication token
 * @property {UserInfo|null} userInfo - User information
 * @property {boolean} loading - Whether authentication is in progress
 */

/**
 * @typedef {Object} ExtensionState
 * @property {boolean} isSidebarOpen - Whether sidebar is open
 * @property {Contact|null} activeContact - Currently active contact
 * @property {Array<Product>} products - Cached products
 * @property {Array<Store>} stores - Cached stores
 * @property {UserInfo|null} userInfo - User information
 * @property {AuthState} auth - Authentication state
 */

// Export type definitions for JSDoc usage
export const TYPES = {
  Product: "Product",
  Store: "Store",
  Order: "Order",
  UserInfo: "UserInfo",
  Contact: "Contact",
  ApiResponse: "ApiResponse",
  CacheState: "CacheState",
  SidebarProps: "SidebarProps",
  Theme: "Theme",
  MessageData: "MessageData",
  OrderFormData: "OrderFormData",
  AuthState: "AuthState",
  ExtensionState: "ExtensionState",
};

export default TYPES;

