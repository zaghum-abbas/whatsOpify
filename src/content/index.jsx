// src/index.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import InjectedSidebarButtons from "./components/InjectedSidebarButtons";
import TopToolbar from "./components/TopToolbar";
import ChatHeaderHover from "./components/ChatHeaderHover";
import ChatListEnhancer from "./components/ChatListEnhancer";
import InjectedSidebarContent from "./components/InjectedSidebarContent";
import DefaultSidebar from "./components/DefaultSidebar";
import ChatSidebar from "./components/ChatSidebar";
import OrderFormSidebar from "./components/OrderFormSidebar";
import "./App.css"; // Your main CSS file

import { requireAuth, useAuthState } from "./components/authMiddleware.jsx";
import LoginModal from "./components/LoginModal";
import {
  extractPhoneNumberFromDOM,
  getToken,
  showVariantImages,
} from "../core/utils/helperFunctions.js";

console.log("🚀 Whatsapofy content script loaded at 12:30 PM PKT, 17/07/2025");

// Utility function to get selected store ID
function getSelectedStoreId() {
  const selectedStore = localStorage.getItem("whatsopify_selected_store");
  if (selectedStore) {
    try {
      const store = JSON.parse(selectedStore);
      return store._id;
    } catch (err) {
      console.warn("[STORE] Error parsing selected store:", err);
    }
  }
  return "default";
}

// --- Global State Variables ---
// Initialize caches to null to indicate data hasn't been fetched yet
let productsCache = null;
let productsLoading = false;
let productsError = null;
let productsListeners = []; // Callbacks waiting for products data

let storesCache = null;
let storesLoading = false;
let storesError = null;
let storesListeners = []; // Callbacks waiting for stores data

let userInfoCache = null;
let userInfoLoading = false;
let userInfoError = null;
let userInfoListeners = []; // Callbacks waiting for user info

// --- Initialize Global Objects (exposed to window) ---
window.whatsapofyProducts = window.whatsapofyProducts || {
  catalog: [],
  storeId: null,
};
window.whatsapofyUserInfo = window.whatsapofyUserInfo || { userInfo: null };

const modalRoot = document.createElement("div");
modalRoot.id = "whatsapp-modal-root";
modalRoot.style.position = "fixed";
modalRoot.style.top = "0";
modalRoot.style.left = "0";
modalRoot.style.zIndex = "10000"; // Higher than WhatsApp's UI
document.body.appendChild(modalRoot);

// Debug function for testing contact extraction
window.testContactExtraction = async function () {
  console.log("🧪 Testing contact extraction...");
  const result = await getActiveChatDetails();
  console.log("🧪 Test result:", result);
  return result;
};

function waitForElement(selector, callback) {
  const el = document.querySelector(selector);
  if (el) {
    console.log(`✅ Element found immediately for selector: "${selector}"`);
    callback(el);
    return;
  }

  console.log(`⏳ Waiting for element with selector: "${selector}"`);
  const observer = new MutationObserver((mutations, obs) => {
    const element = document.querySelector(selector);
    if (element) {
      obs.disconnect();
      console.log(`✅ Element found by observer for selector: "${selector}"`);
      callback(element);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

const TOOLBAR_HEIGHT = "48px"; // Assuming your TopToolbar has this height
const SIDEBAR_WIDTH = "400px"; // Define sidebar width once

// Import theme colors helper from your existing hook
import { getThemeColors } from "../hooks/useTheme";

function getWhatsAppTheme() {
  const isDark =
    document.body.classList.contains("dark") ||
    document.querySelector('html[data-theme="dark"]') ||
    (localStorage.getItem("theme") &&
      JSON.parse(localStorage.getItem("theme")) === "dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const theme = isDark ? "dark" : "light";
  const colors = getThemeColors(theme);

  return {
    isDark,
    theme,
    sidebarBg: colors.sidebar,
    sidebarShadow: colors.sidebarShadow,
  };
}

// --- Sidebar Control State (GLOBAL to this content script) ---
let isSidebarOpen = true;
let sidebarRoot = null; // Store the React root for the sidebar
let mainAppContent = null; // Reference to the main WhatsApp content div that needs resizing
let sidebarMode = "default"; // "default", "chat", or "orderForm"
let sidebarProps = {
  contact: {},
  catalog: [],
  stores: [],
  notes: "",
  onNotesChange: null,
  userInfo: null,
  showOrderForm: false,
  onOrderFormToggle: null,
  onClose: null,
};
let lastActiveChatId = null;

// Function to switch sidebar mode
const switchSidebarMode = (mode) => {
  console.log("🚀 switchSidebarMode called with:", mode);
  console.log("🔍 Before switch - sidebarMode:", sidebarMode);
  console.log("🔍 sidebarRoot exists:", !!sidebarRoot);
  console.log("🔍 isSidebarOpen:", isSidebarOpen);

  sidebarMode = mode;
  console.log(`🔄 Sidebar mode switched to: ${mode}`);

  if (sidebarRoot && isSidebarOpen) {
    console.log("✅ Calling renderSidebar()...");
    renderSidebar();
  } else {
    console.warn(
      "⚠️ NOT rendering sidebar. sidebarRoot:",
      !!sidebarRoot,
      "isSidebarOpen:",
      isSidebarOpen
    );
  }
};

const renderSidebar = () => {
  if (!sidebarRoot) return;
  if (sidebarMode === "default") {
    console.log("🎨 Rendering Default Sidebar");
    sidebarRoot.render(<DefaultSidebar {...sidebarProps} />);
  } else if (sidebarMode === "chat") {
    console.log("🎨 Rendering Chat Sidebar");
    sidebarRoot.render(<ChatSidebar {...sidebarProps} />);
  } else if (sidebarMode === "orderForm") {
    console.log("🎨 Rendering Order Form Sidebar");
    sidebarRoot.render(<OrderFormSidebar {...sidebarProps} />);
  }
};

console.log("🔍 sidebarMode:", sidebarMode);

// Flag to prevent multiple simultaneous calls
let isExtractingContact = false;

const getActiveChatDetails = async () => {
  // Prevent multiple simultaneous calls
  if (isExtractingContact) {
    console.log("⚠️ Contact extraction already in progress, skipping...");
    return { name: "", phone: "" };
  }

  isExtractingContact = true;
  console.log("🔍 Starting contact extraction...");

  let name = "";
  let phone = "";

  const nameSelectors = [
    "header span[title]",
    "header div[role='button'] span[dir='auto']",
    "header h2[title]",
  ];

  // Find and click the header element to open contact info
  let headerClicked = false;
  for (const selector of nameSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim().length > 0) {
      console.log("🔍 Clicking header element:", selector);
      element.click(); // open contact info
      headerClicked = true;
      break;
    }
  }

  if (!headerClicked) {
    console.warn("⚠️ No header element found to click");
    return { name, phone };
  }

  // Wait longer for contact info panel to fully load
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Extract phone number
  phone = extractPhoneNumberFromDOM?.() || "";
  console.log("✅ Extracted phone:", phone);

  const result = { name, phone };

  // Close the contact info panel after a longer delay
  setTimeout(() => {
    const closeSelectors = [
      'div[aria-expanded="false"][aria-label="Close"]',
      'div[aria-label="Close"]',
      'button[aria-label="Close"]',
      '[data-testid="close"]',
    ];

    let closeDiv = null;
    for (const selector of closeSelectors) {
      closeDiv = document.querySelector(selector);
      if (closeDiv) {
        console.log("🔍 Found close button with selector:", selector);
        break;
      }
    }

    if (closeDiv) {
      closeDiv.click();
      console.log("❌ Closed contact info panel");
    } else {
      console.warn("⚠️ Could not find close button!");
    }
  }, 100); // Wait 1 second before closing

  // Reset the flag after a delay to allow for proper cleanup
  setTimeout(() => {
    isExtractingContact = false;
    console.log("✅ Contact extraction completed, flag reset");
  }, 1500);

  return result;
};

async function fetchUserInfo() {
  if (userInfoLoading) return;

  userInfoLoading = true;
  userInfoError = null;

  try {
    console.log("[USER] Fetching user info...");

    let token = null;
    try {
      const whatsopifyTokenRaw = localStorage.getItem("whatsopify_token");
      if (whatsopifyTokenRaw) {
        const whatsopifyTokenObj = JSON.parse(whatsopifyTokenRaw);

        // Handle both old and new token structures
        if (
          whatsopifyTokenObj &&
          whatsopifyTokenObj.data &&
          whatsopifyTokenObj.data.token
        ) {
          // New structure: { data: { token: "...", user: {...}, stores: [...] } }
          token = whatsopifyTokenObj.data.token;
          if (whatsopifyTokenObj.data.user) {
            console.log(
              "[USER] Found user info in token data (new structure):",
              whatsopifyTokenObj.data.user
            );
            userInfoCache = whatsopifyTokenObj.data.user;
            window.whatsapofyUserInfo.userInfo = userInfoCache;
            userInfoLoading = false;
            userInfoListeners.forEach((fn) => fn(userInfoCache)); // Pass data to listeners
            userInfoListeners = []; // Clear listeners
            return;
          }
        } else if (whatsopifyTokenObj && whatsopifyTokenObj.token) {
          // Old structure: { token: "...", user: {...}, stores: [...] }
          token = whatsopifyTokenObj.token;
          if (whatsopifyTokenObj.user) {
            console.log(
              "[USER] Found user info in token data (old structure):",
              whatsopifyTokenObj.user
            );
            userInfoCache = whatsopifyTokenObj.user;
            window.whatsapofyUserInfo.userInfo = userInfoCache;
            userInfoLoading = false;
            userInfoListeners.forEach((fn) => fn(userInfoCache)); // Pass data to listeners
            userInfoListeners = []; // Clear listeners
            return;
          }
        }
      }
    } catch (err) {
      console.warn("[USER] Error extracting token from localStorage:", err);
    }

    if (!token) {
      console.warn("[USER] No token found, cannot fetch user info.");
      userInfoCache = null;
      window.whatsapofyUserInfo.userInfo = userInfoCache;
      userInfoLoading = false;
      userInfoListeners.forEach((fn) => fn(userInfoCache)); // Pass data to listeners
      userInfoListeners = []; // Clear listeners
      return;
    }

    // Use background script for API call with token authentication
    console.log("[USER] Fetching user info via background script...");

    const response = await chrome.runtime.sendMessage({
      action: "FETCH_USER_INFO",
    });

    if (response.success) {
      console.log("[USER] User info fetched successfully:", response.userInfo);
      userInfoCache = response.userInfo;
    } else {
      console.warn("[USER] Failed to fetch user info:", response.error);
      userInfoCache = null;
    }

    console.log("[USER] Final user info:", userInfoCache);
    window.whatsapofyUserInfo.userInfo = userInfoCache;
    userInfoLoading = false;
    userInfoListeners.forEach((fn) => fn(userInfoCache)); // Pass data to listeners
    userInfoListeners = []; // Clear listeners
  } catch (e) {
    console.error("[USER] Error fetching user info:", e);
    userInfoError = e;
    userInfoLoading = false;
    userInfoCache = null;
    window.whatsapofyUserInfo.userInfo = userInfoCache;
    userInfoListeners.forEach((fn) => fn(userInfoCache)); // Pass data to listeners
    userInfoListeners = []; // Clear listeners
  }
}

function getUserInfo(callback) {
  console.log(
    "[USER] getUserInfo called, userInfoCache:",
    userInfoCache,
    "userInfoLoading:",
    userInfoLoading
  );

  if (userInfoCache !== null) {
    console.log("[USER] Using cached user info");
    callback(userInfoCache);
  } else if (userInfoLoading) {
    console.log("[USER] User info loading, adding listener");
    userInfoListeners.push(() => callback(userInfoCache));
  } else {
    console.log("[USER] Starting user info fetch...");
    userInfoListeners.push(() => callback(userInfoCache));
    fetchUserInfo();
  }
}

// Fetch all stores for the logged-in user
async function fetchStoresForUser() {
  if (storesLoading) return;
  storesLoading = true;
  storesError = null;
  try {
    console.log("[STORES] Checking for stores in localStorage first...");

    // First check if stores are available in localStorage (from login response)
    try {
      const tokenData = localStorage.getItem("whatsopify_token");
      if (tokenData) {
        const parsed = JSON.parse(tokenData);

        // Check both old and new structures for stores
        let storesFromToken = null;
        if (parsed && parsed.data && parsed.data.stores) {
          // New structure
          storesFromToken = parsed.data.stores;
        } else if (parsed && parsed.stores) {
          // Old structure
          storesFromToken = parsed.stores;
        }

        if (
          storesFromToken &&
          Array.isArray(storesFromToken) &&
          storesFromToken.length > 0
        ) {
          console.log(
            "[STORES] Found stores in localStorage:",
            storesFromToken
          );
          storesCache = storesFromToken;

          // Set the active store ID globally
          if (storesCache.length > 0) {
            window.whatsapofyProducts.storeId = storesCache[0]._id;
            console.log(
              "[STORES] Global active store ID set from localStorage:",
              window.whatsapofyProducts.storeId
            );
          }

          storesLoading = false;
          storesListeners.forEach((fn) => fn(storesCache)); // Pass data to listeners
          storesListeners = []; // Clear listeners
          return;
        }
      }
    } catch (err) {
      console.warn("[STORES] Error reading stores from localStorage:", err);
    }

    console.log(
      "[STORES] No stores in localStorage, fetching via background script..."
    );

    // Get token for API call
    let token = null;
    try {
      const whatsopifyTokenRaw = localStorage.getItem("whatsopify_token");
      if (whatsopifyTokenRaw) {
        const whatsopifyTokenObj = JSON.parse(whatsopifyTokenRaw);
        if (
          whatsopifyTokenObj &&
          whatsopifyTokenObj.data &&
          whatsopifyTokenObj.data.token
        ) {
          token = whatsopifyTokenObj.data.token;
        } else if (whatsopifyTokenObj && whatsopifyTokenObj.token) {
          token = whatsopifyTokenObj.token;
        }
      }
    } catch (err) {
      console.warn("[STORES] Error extracting token:", err);
    }

    if (!token) {
      console.warn("[STORES] No token found, cannot fetch stores.");
      storesCache = [];
      storesLoading = false;
      storesListeners.forEach((fn) => fn(storesCache));
      storesListeners = [];
      return;
    }

    // Use background script for API call with token authentication
    const response = await chrome.runtime.sendMessage({
      action: "FETCH_STORES",
      token: token,
    });

    if (response.success) {
      console.log("[STORES] Stores fetched successfully:", response.stores);
      storesCache = Array.isArray(response.stores) ? response.stores : [];

      console.log("[STORES] Store details for status debugging:");
      storesCache.forEach((store, index) => {
        console.log(`[STORES] Store ${index + 1}:`, {
          name: store.name || store.store_name,
          status: store.status,
          isActive: store.isActive,
          active: store.active,
          state: store.state,
          enabled: store.enabled,
          is_active: store.is_active,
          allFields: Object.keys(store),
        });
      });

      // Set the active store ID globally
      if (storesCache.length > 0) {
        window.whatsapofyProducts.storeId = storesCache[0]._id;
        console.log(
          "[STORES] Global active store ID set:",
          window.whatsapofyProducts.storeId
        );
      } else {
        window.whatsapofyProducts.storeId = null;
        console.warn("[STORES] No stores found, active store ID set to null.");
      }
    } else {
      console.warn("[STORES] Failed to fetch stores:", response.error);
      storesCache = [];
    }

    storesLoading = false;
    storesListeners.forEach((fn) => fn(storesCache)); // Pass data to listeners
    storesListeners = []; // Clear listeners
  } catch (e) {
    console.error("[STORES] Error fetching stores:", e);
    storesError = e;
    storesLoading = false;
    storesCache = [];
    storesListeners.forEach((fn) => fn(storesCache)); // Pass data to listeners
    storesListeners = []; // Clear listeners
  }
}

function getStoresForUser(callback) {
  if (storesCache !== null) {
    callback(storesCache);
  } else if (storesLoading) {
    storesListeners.push(() => callback(storesCache));
  } else {
    storesListeners.push(() => callback(storesCache));
    fetchStoresForUser();
  }
}

function getProducts(callback) {
  if (productsCache !== null) {
    callback(productsCache);
    return;
  }

  if (productsLoading) {
    productsListeners.push(callback);
    return;
  }
  productsListeners.push(callback);
  fetchProductsFromAPI();
}

async function fetchProductsFromAPI() {
  if (productsLoading) return;

  productsLoading = true;
  productsError = null;

  try {
    console.log("[PRODUCTS] Fetching products from API...");

    const response = await chrome.runtime.sendMessage({
      action: "FETCH_PRODUCTS",
      token: getToken(),
      storeId: getSelectedStoreId(),
    });

    console.log("[PRODUCTS] 🔍 Full API response:", response);

    if (!response?.success) {
      console.error("[PRODUCTS] ❌ API fetch failed:", response?.error);
      productsCache = [];
      productsLoading = false;
      productsListeners.forEach((fn) => fn(productsCache));
      productsListeners = [];
      return;
    }

    let products = [];

    // Handle different response structures
    if (Array.isArray(response.products)) {
      products = response.products;
      console.log(
        "[PRODUCTS] 📋 Response.products is array, length:",
        products.length
      );
    } else if (
      response.products?.products &&
      Array.isArray(response.products.products)
    ) {
      products = response.products.products;
      console.log(
        "[PRODUCTS] 📋 Found response.products.products array, length:",
        products.length
      );
    } else if (
      response.products?.data &&
      Array.isArray(response.products.data)
    ) {
      products = response.products.data;
      console.log(
        "[PRODUCTS] 📋 Found response.products.data array, length:",
        products.length
      );
      console.log("[PRODUCTS] 📋 First item in data array:", products[0]);
    } else if (
      response.products?.result &&
      Array.isArray(response.products.result)
    ) {
      products = response.products.result;
      console.log(
        "[PRODUCTS] 📋 Found response.products.result array, length:",
        products.length
      );
    } else {
      console.warn(
        "[PRODUCTS] ⚠️ Unexpected response structure:",
        response.products
      );
      console.warn(
        "[PRODUCTS] ⚠️ Available properties:",
        Object.keys(response.products || {})
      );
      products = [];
    }

    // Debug the actual product data structure
    if (products.length > 0) {
      console.log("[PRODUCTS] 🔍 First product structure:", products[0]);
      console.log(
        "[PRODUCTS] 🔍 First product keys:",
        Object.keys(products[0] || {})
      );

      // Check if products have the required fields for display
      const firstProduct = products[0];
      const hasRequiredFields =
        firstProduct &&
        (firstProduct.title ||
          firstProduct.name ||
          firstProduct.productName ||
          firstProduct.description ||
          firstProduct.price ||
          firstProduct.variants ||
          firstProduct.images ||
          firstProduct.image);

      console.log(
        "[PRODUCTS] 🔍 Product has required display fields:",
        hasRequiredFields
      );

      if (!hasRequiredFields) {
        console.warn(
          "[PRODUCTS] ⚠️ Products appear to be references/IDs only, not full product data"
        );
        console.warn(
          "[PRODUCTS] ⚠️ This might require additional API calls to fetch full product details"
        );
      }
    }

    console.log(`[PRODUCTS] ✅ Received ${products.length} products`);

    // Set the global cache
    productsCache = products;

    productsLoading = false;
    // Notify all waiting listeners
    productsListeners.forEach((fn) => fn(productsCache));
    productsListeners = [];
  } catch (err) {
    console.error("[PRODUCTS] ❌ Error fetching products:", err);
    productsError = err;
    productsLoading = false;
    productsCache = [];
    productsListeners.forEach((fn) => fn(productsCache));
    productsListeners = [];
  }
}

function getCatalogForContact(contact, callback) {
  console.log(
    "🛍️ getCatalogForContact called, productsCache:",
    productsCache,
    "productsLoading:",
    productsLoading
  );

  if (productsCache !== null) {
    console.log("✅ Using cached products:", productsCache.length, "items");
    callback(productsCache);
  } else if (productsLoading) {
    console.log("⏳ Products loading, adding listener");
    productsListeners.push(() => callback(productsCache));
  } else {
    console.log("🚀 Starting product fetch...");
    productsListeners.push(() => callback(productsCache));
    fetchProductsFromAPI();
  }
}

// Notes storage using Chrome localStorage for persistence
const NOTES_STORAGE_KEY = "whatsapp_contact_notes";

// Load notes from localStorage
function loadNotesFromStorage() {
  try {
    const stored = localStorage.getItem(NOTES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn("⚠️ Error loading notes from storage:", error);
    return {};
  }
}

// Save notes to localStorage
function saveNotesToStorage(notesMap) {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notesMap));
    console.log("💾 Notes saved to localStorage");
  } catch (error) {
    console.error("❌ Error saving notes to storage:", error);
  }
}

// Initialize notes from localStorage
const notesMap = loadNotesFromStorage();
console.log(
  "📝 Loaded notes from storage:",
  Object.keys(notesMap).length,
  "contacts"
);

function handleNotesChange(newNotes) {
  if (sidebarProps.contact && sidebarProps.contact.name) {
    const contactKey = sidebarProps.contact.name;

    // Update in-memory map
    notesMap[contactKey] = newNotes;

    // Save to localStorage immediately
    saveNotesToStorage(notesMap);

    // Update sidebar props
    sidebarProps.notes = newNotes;

    // Re-render sidebar
    if (sidebarRoot) {
      sidebarRoot.render(<InjectedSidebarContent {...sidebarProps} />);
    }

    console.log(
      "📝 Notes updated for contact:",
      contactKey,
      "- Length:",
      newNotes.length
    );
  }
}

// Function to get notes for a specific contact
function getNotesForContact(contactName) {
  if (!contactName) return "";

  const notes = notesMap[contactName] || "";
  console.log(
    "📖 Retrieved notes for contact:",
    contactName,
    "- Length:",
    notes.length
  );
  return notes;
}

// Utility functions for managing notes storage
window.whatsappNotesUtils = {
  // Get all stored notes
  getAllNotes: () => {
    console.log("📋 All stored notes:", notesMap);
    return notesMap;
  },

  // Clear notes for a specific contact
  clearNotesForContact: (contactName) => {
    if (contactName && notesMap[contactName]) {
      delete notesMap[contactName];
      saveNotesToStorage(notesMap);
      console.log("🗑️ Cleared notes for contact:", contactName);

      // Update sidebar if this is the current contact
      if (sidebarProps.contact && sidebarProps.contact.name === contactName) {
        sidebarProps.notes = "";
        if (sidebarRoot) {
          sidebarRoot.render(<InjectedSidebarContent {...sidebarProps} />);
        }
      }
      return true;
    }
    return false;
  },

  // Clear all notes
  clearAllNotes: () => {
    const count = Object.keys(notesMap).length;
    Object.keys(notesMap).forEach((key) => delete notesMap[key]);
    saveNotesToStorage(notesMap);
    console.log("🗑️ Cleared all notes for", count, "contacts");

    // Update sidebar
    if (sidebarProps.contact) {
      sidebarProps.notes = "";
      if (sidebarRoot) {
        sidebarRoot.render(<InjectedSidebarContent {...sidebarProps} />);
      }
    }
    return count;
  },

  // Get storage usage info
  getStorageInfo: () => {
    const contactCount = Object.keys(notesMap).length;
    const totalChars = Object.values(notesMap).join("").length;
    const storageSize = new Blob([JSON.stringify(notesMap)]).size;

    const info = {
      contactCount,
      totalChars,
      storageSize: `${(storageSize / 1024).toFixed(2)} KB`,
      contacts: Object.keys(notesMap),
    };

    console.log("📊 Notes storage info:", info);
    return info;
  },
};

// Listen for chat changes and update sidebar
function observeActiveChat() {
  console.log("🔍 Setting up chat selection observer...");

  // Wait for both #pane-side AND the actual chat list to be ready
  const waitForChatList = () => {
    const paneSide = document.querySelector("#pane-side");
    const chatList = document.querySelector('[aria-label="Chat list"]');

    console.log("🔍 pane-side exists:", !!paneSide);
    console.log("🔍 Chat list exists:", !!chatList);

    if (paneSide && chatList) {
      console.log(
        "✅ Found both chat container and chat list, setting up click listener"
      );
      return { paneSide, chatList };
    }
    return null;
  };

  const containers = waitForChatList();
  if (containers) {
    const { paneSide: chatListContainer } = containers;
    setupClickListener(chatListContainer);
  } else {
    console.warn("⚠️ Chat list container not found, waiting for it to load...");

    // Wait for chat list to load with retry mechanism
    let retryCount = 0;
    const maxRetries = 10;

    const retrySetup = () => {
      if (retryCount >= maxRetries) {
        console.error(
          "❌ Max retries reached, falling back to mutation observer"
        );
        setupMutationObserver();
        return;
      }

      retryCount++;
      console.log(
        `🔄 Retry ${retryCount}/${maxRetries} - waiting for chat list...`
      );

      setTimeout(() => {
        const containers = waitForChatList();
        if (containers) {
          console.log("✅ Chat list found on retry, setting up click listener");
          const { paneSide: chatListContainer } = containers;
          setupClickListener(chatListContainer);
        } else {
          retrySetup();
        }
      }, 1000); // Wait 1 second between retries
    };

    retrySetup();
  }

  function setupClickListener(chatListContainer) {
    chatListContainer.addEventListener("click", async (event) => {
      console.log("🖱️ Click detected on chat list container");

      // Check if the click was on a chat item
      const chatItem = event.target.closest(
        '[data-testid="cell-frame-container"], div[role="listitem"], div[tabindex="0"]'
      );

      console.log("🎯 Chat item found:", !!chatItem);

      if (chatItem) {
        console.log("✅ Chat item clicked, waiting for chat to load...");

        // Wait a bit for the chat to load, then extract contact info
        setTimeout(async () => {
          console.log("🔄 Extracting contact details for selected chat...");
          const contact = await getActiveChatDetails();

          // Check if we have a valid contact (not null and has some data)
          if (contact) {
            // Always update sidebar with fresh contact info - even without phone number
            lastActiveChatId = contact.name || "unknown";
            sidebarProps.contact = contact;
            console.log("🔄 Switching to chat mode with contact:", contact);

            // Switch to chat mode
            switchSidebarMode("chat");

            // Fetch user info, stores, and products, then render sidebar
            getUserInfo((userInfo) => {
              sidebarProps.userInfo = userInfo;
              getStoresForUser((stores) => {
                sidebarProps.stores = stores;
                getCatalogForContact(contact, (products) => {
                  console.log("products", products);
                  sidebarProps.catalog = products;
                  sidebarProps.notes = getNotesForContact(contact.name);
                  sidebarProps.onNotesChange = handleNotesChange;
                  if (sidebarRoot) {
                    console.log(
                      "🎨 Rendering chat sidebar with props:",
                      sidebarProps
                    );
                    renderSidebar();
                  } else {
                    console.warn("⚠️ sidebarRoot is null, cannot render");
                  }
                });
              });
            });

            if (!contact.phone) {
              console.log(
                "⚠️ No phone number found for contact, but still updating sidebar"
              );
            }
          } else if (contact === null) {
            console.log(
              "ℹ️ No active chat detected, switching to default mode"
            );
            // Switch back to default mode when no chat is active
            lastActiveChatId = null;
            sidebarProps.contact = { name: "", phone: "", about: "" };
            sidebarProps.notes = "";
            // Keep userInfo, stores, and catalog as they don't change per chat
            switchSidebarMode("default");
            if (sidebarRoot) {
              renderSidebar();
            }
          } else {
            console.log(
              "❌ No contact data extracted, keeping current sidebar state"
            );
          }
        }, 200); // Wait 200ms for chat to load (reduced from 500ms)
      }
    });
  }

  function setupMutationObserver() {
    console.log("🔄 Setting up mutation observer as fallback...");

    // Fallback: watch for changes in the main chat panel
    const chatPanel = document.querySelector('div[role="main"]');
    if (chatPanel) {
      const config = { childList: true, subtree: true };
      const observer = new MutationObserver(async () => {
        // Only extract if there's actually a chat open
        const hasActiveChat =
          chatPanel.querySelector("header") &&
          chatPanel.querySelector(
            '[data-testid="conversation-panel-messages"], [role="log"], div[class*="message"]'
          );
        if (hasActiveChat) {
          console.log("🔄 Chat change detected via mutation observer...");
          const contact = await getActiveChatDetails();
          if (contact && (contact.name || contact.phone || contact.about)) {
            if (contact.name && contact.name === lastActiveChatId) return;

            lastActiveChatId = contact.name || "unknown";
            sidebarProps.contact = contact;

            // Switch to chat mode
            switchSidebarMode("chat");

            // Fetch user info, stores, and products, then render sidebar
            getUserInfo((userInfo) => {
              sidebarProps.userInfo = userInfo;
              getStoresForUser((stores) => {
                sidebarProps.stores = stores;
                getCatalogForContact(contact, (products) => {
                  sidebarProps.catalog = products;
                  sidebarProps.notes = getNotesForContact(contact.name);
                  sidebarProps.onNotesChange = handleNotesChange;
                  if (sidebarRoot) {
                    renderSidebar();
                  }
                });
              });
            });
          }
        }
      });
      observer.observe(chatPanel, config);
    }
  }
}

window.toggleWhatsappSidebar = async (open) => {
  // Check if user is logged in
  const token = localStorage.getItem("whatsopify_token");
  const isLoggedIn = token && token !== "null" && token !== '""';

  // If trying to open sidebar and user is not logged in, don't open
  if (open && !isLoggedIn) {
    console.log("⚠️ Cannot open sidebar: User not logged in");
    return;
  }

  // If trying to open sidebar, check if store is selected
  if (open) {
    const storeSelected = window.requireStoreSelection();
    if (!storeSelected) {
      return; // Store selection modal will be shown
    }
  }

  isSidebarOpen = typeof open === "boolean" ? open : !isSidebarOpen;
  console.log(`Toggling sidebar: ${isSidebarOpen ? "Open" : "Closed"}`);

  if (!mainAppContent) {
    console.error(
      "Main WhatsApp content container not found yet for sidebar adjustment!"
    );
    return;
  }

  let sidebarContainer = document.getElementById("whatsapp-sidebar-root");

  if (isSidebarOpen) {
    // Open sidebar
    const renderSidebarWithData = async () => {
      // Only initialize to default mode if sidebar is being opened for the first time
      // Don't reset mode if it's already set (e.g., to "chat")
      if (!sidebarRoot) {
        console.log("🆕 First time opening sidebar - setting to default mode");
        sidebarMode = "default";
        sidebarProps.contact = { name: "", phone: "", about: "" };
      } else {
        console.log(
          "♻️ Sidebar already initialized - keeping current mode:",
          sidebarMode
        );
      }

      // Fetch user info, stores, and products for initial render
      getUserInfo((userInfo) => {
        sidebarProps.userInfo = userInfo;
        getStoresForUser((stores) => {
          sidebarProps.stores = stores;
          getCatalogForContact(null, (products) => {
            sidebarProps.catalog = products;
            sidebarProps.notes = "";
            sidebarProps.onNotesChange = handleNotesChange;
            sidebarProps.onOrderFormToggle = (show) => {
              sidebarProps.showOrderForm = show;
              renderSidebar();
            };
            if (sidebarRoot) {
              console.log("🎨 Initial sidebar render in default mode");
              renderSidebar();
            }
          });
        });
      });
    };
    if (!sidebarContainer) {
      // Create and append sidebar container if it doesn't exist
      sidebarContainer = document.createElement("div");
      sidebarContainer.id = "whatsapp-sidebar-root";

      const theme = getWhatsAppTheme();

      Object.assign(sidebarContainer.style, {
        position: "fixed",
        right: "0",
        top: TOOLBAR_HEIGHT, // Start below the toolbar
        height: `calc(100% - ${TOOLBAR_HEIGHT})`, // Full height minus toolbar height
        width: SIDEBAR_WIDTH,
        backgroundColor: theme.sidebarBg,
        boxShadow: theme.sidebarShadow,
        zIndex: "9999", // Lower than toolbar but above content
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      });
      document.body.appendChild(sidebarContainer);
      sidebarRoot = createRoot(sidebarContainer);
      await renderSidebarWithData();
      observeActiveChat();
      console.log("✅ Sidebar rendered in container.");
    } else {
      sidebarContainer.style.display = "flex";
      console.log(
        "✅ Sidebar container shown (not re-rendering to preserve mode)."
      );
    }

    mainAppContent.style.marginRight = SIDEBAR_WIDTH;
    console.log(`✅ Main WhatsApp content shifted left by ${SIDEBAR_WIDTH}.`);

    // Update margins for the custom divs
    setTimeout(() => {
      const chatHeader = document.querySelector(
        'header[data-testid="conversation-header"]'
      );
      const isChatOpen = !!chatHeader;
      ensureMainContentMargin(isChatOpen);
    }, 100);
  } else {
    // Close sidebar
    if (sidebarContainer) {
      sidebarContainer.style.display = "none";
      console.log("✅ Sidebar hidden.");
    }

    // Restore main content width by removing the right margin
    mainAppContent.style.marginRight = "0px";
    console.log("✅ Main WhatsApp content restored to full width.");

    // Update margins for the custom divs
    setTimeout(() => {
      const chatHeader = document.querySelector(
        'header[data-testid="conversation-header"]'
      );
      const isChatOpen = !!chatHeader;
      ensureMainContentMargin(isChatOpen);
    }, 100);
  }
};

// --- Listen for login/logout/account switch and refresh sidebar ---
window.addEventListener("storage", (event) => {
  if (event.key === "whatsopify_token") {
    const newValue = event.newValue;
    if (!newValue || newValue === "null" || newValue === '""') {
      // Logout: close sidebar and clear caches
      window.clearProductsCache && window.clearProductsCache();
      window.clearStoresCache && window.clearStoresCache();
      if (typeof userInfoCache !== "undefined") userInfoCache = null;
      if (typeof storesCache !== "undefined") storesCache = null;
      window.toggleWhatsappSidebar(false);
    } else {
      // Login or account switch: clear all caches and force-refresh sidebar if open
      window.clearProductsCache && window.clearProductsCache();
      window.clearStoresCache && window.clearStoresCache();
      if (typeof userInfoCache !== "undefined") userInfoCache = null;
      if (typeof storesCache !== "undefined") storesCache = null;
      if (typeof isSidebarOpen !== "undefined" && isSidebarOpen) {
        window.toggleWhatsappSidebar(true);
      }
    }
  }
});

// --- Listen for theme changes and update sidebar ---
const themeObserver = new MutationObserver(() => {
  const sidebarContainer = document.getElementById("whatsapp-sidebar-root");
  if (sidebarContainer) {
    const theme = getWhatsAppTheme();
    sidebarContainer.style.backgroundColor = theme.sidebarBg;
    sidebarContainer.style.boxShadow = theme.sidebarShadow;
    console.log("🎨 Sidebar theme updated:", theme.isDark ? "Dark" : "Light");
  }
});

// Observe changes to body class (WhatsApp theme changes)
themeObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
});

// Also observe HTML element for data-theme attribute
const htmlThemeObserver = new MutationObserver(() => {
  const sidebarContainer = document.getElementById("whatsapp-sidebar-root");
  if (sidebarContainer) {
    const theme = getWhatsAppTheme();
    sidebarContainer.style.backgroundColor = theme.sidebarBg;
    sidebarContainer.style.boxShadow = theme.sidebarShadow;
    console.log("🎨 Sidebar theme updated:", theme.isDark ? "Dark" : "Light");
  }
});

htmlThemeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme", "class"],
});

// Inject Top Toolbar
function injectTopToolbarIntoWhatsAppBody() {
  // The selector 'div.x78zum5.xdt5ytf.x5yr21d' is commonly the main layout container
  // of WhatsApp Web, holding both the chat list and chat panel.
  const whatsappMainBodyContainerSelector = "div.x78zum5.xdt5ytf.x5yr21d";

  waitForElement(
    whatsappMainBodyContainerSelector,
    (whatsappMainBodyContainer) => {
      // Store this reference globally for sidebar management
      mainAppContent = whatsappMainBodyContainer;
      console.log(
        "Main WhatsApp content container identified:",
        mainAppContent
      );

      // Check if toolbar already exists to prevent re-injection
      if (document.getElementById("whatsapp-top-toolbar-root")) {
        console.log("⚠️ Top Toolbar already injected. Skipping injection.");
        return;
      }

      console.log(
        "Attempting to inject Top Toolbar as fixed element at top of viewport..."
      );

      const toolbarContainer = document.createElement("div");
      toolbarContainer.id = "whatsapp-top-toolbar-root";

      Object.assign(toolbarContainer.style, {
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        height: TOOLBAR_HEIGHT,
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        borderBottom: "1px solid #e2e8f0",
        zIndex: "10000", // High z-index to stay on top
        display: "flex",
        alignItems: "center",
      });

      // Append toolbar to body instead of mainAppContent to avoid margin issues
      document.body.appendChild(toolbarContainer);

      console.log("✅ Top Toolbar container created and appended to body.");

      const root = createRoot(toolbarContainer);
      root.render(<TopToolbar />);
      console.log("✅ TopToolbar mounted as fixed element at top of viewport.");

      // Add padding to main content to account for toolbar height
      // whatsappMainBodyContainer.style.paddingTop = TOOLBAR_HEIGHT;

      // Initialize sidebar state - don't open automatically, wait for store selection
      const token = localStorage.getItem("whatsopify_token");
      const selectedStore = localStorage.getItem("whatsopify_selected_store");
      const isLoggedIn = token && token !== "null" && token !== '""';
      const hasSelectedStore =
        selectedStore && selectedStore !== "null" && selectedStore !== '""';

      if (isLoggedIn && hasSelectedStore) {
        window.toggleWhatsappSidebar(true);
        console.log(
          "✅ User is logged in and has selected store - opening sidebar"
        );
      } else {
        console.log(
          "ℹ️ Sidebar will remain closed until user logs in and selects a store"
        );
      }
    }
  );
}

// Inject Sidebar Buttons (into WhatsApp's left panel)
function injectSidebarButtons() {
  // This selector targets the area above the chat list, where the profile pic and status icons are
  // It's a div with flex-grow: 1, often containing a <hr> element that we can insert before.
  const leftSidebarHeaderSelector =
    'header[data-tab="2"] > div > div[style="flex-grow: 1;"]';

  waitForElement(leftSidebarHeaderSelector, (flexGrowParentDiv) => {
    if (document.getElementById("whatsapp-leftbar-buttons-root")) {
      console.log("⚠️ Sidebar buttons already injected. Skipping injection.");
      return;
    }

    // Find the HR element to insert before it, maintaining WhatsApp's layout
    const hrElement = flexGrowParentDiv.querySelector("hr.xjm9jq1");

    const container = document.createElement("div");
    container.id = "whatsapp-leftbar-buttons-root";
    Object.assign(container.style, {
      marginTop: "8px",
      marginBottom: "8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px", // Space between buttons
    });

    if (hrElement && hrElement.parentNode === flexGrowParentDiv) {
      // Insert before the HR element if found
      flexGrowParentDiv.insertBefore(container, hrElement);
      console.log("✅ Injected sidebar buttons inserted before HR element.");
    } else {
      // Fallback to appending if HR element is not found or structure changes
      flexGrowParentDiv.appendChild(container);
      console.warn(
        "⚠️ HR element for sidebar buttons not found or not in expected position. Appending to end."
      );
      console.warn(
        "Please inspect WhatsApp Web HTML for the correct HR element selector for precise placement."
      );
    }

    const root = createRoot(container);

    root.render(
      <InjectedSidebarButtons onToggleSidebar={window.toggleWhatsappSidebar} />
    );
    console.log("✅ InjectedSidebarButtons mounted into left navbar.");
  });
}

// Inject ChatHeaderHover (floating element, needs 'body' as parent)
function injectChatHeaderHover() {
  waitForElement("body", (bodyElement) => {
    if (document.getElementById("whasapofy-chat-hover-root")) {
      console.log("⚠️ ChatHeaderHover already injected. Skipping injection.");
      return;
    }

    const chatHoverContainer = document.createElement("div");
    chatHoverContainer.id = "whasapofy-chat-hover-root";
    // This element is intended to float, so appending to body is fine
    bodyElement.appendChild(chatHoverContainer);

    console.log("ChatHeaderHover container created and appended.");

    const root = createRoot(chatHoverContainer);
    root.render(<ChatHeaderHover />);
    console.log("✅ ChatHeaderHover mounted on WhatsApp Web.");
  });
}

// Inject ChatListEnhancer (floating element, needs 'body' as parent)
function injectChatListEnhancer() {
  waitForElement("body", (bodyElement) => {
    if (document.getElementById("whatsopify-chat-enhancer-root")) {
      console.log("⚠️ ChatListEnhancer already injected. Skipping injection.");
      return;
    }

    const enhancerContainer = document.createElement("div");
    enhancerContainer.id = "whatsopify-chat-enhancer-root";
    // This element is intended to float, so appending to body is fine
    bodyElement.appendChild(enhancerContainer);

    console.log("ChatListEnhancer container created and appended.");

    const root = createRoot(enhancerContainer);
    root.render(<ChatListEnhancer />);
    console.log("✅ ChatListEnhancer mounted on WhatsApp Web.");
  });
}

function ensureMainContentMargin(applyToSecond = false) {
  const allDivs = document.querySelectorAll("div");

  const matchingDivs = [];

  for (const element of allDivs) {
    const classList = Array.from(element.classList);
    const hasExactlyTheseClasses =
      classList.length === 3 &&
      classList.includes("x78zum5") &&
      classList.includes("xdt5ytf") &&
      classList.includes("x5yr21d");

    if (hasExactlyTheseClasses) {
      matchingDivs.push(element);
    }
  }

  if (matchingDivs.length === 0) return;

  let targetDiv = null;
  let otherDiv = null;

  if (applyToSecond && matchingDivs.length >= 2) {
    targetDiv = matchingDivs[1];
    otherDiv = matchingDivs[0];
  } else if (matchingDivs.length >= 1) {
    targetDiv = matchingDivs[0];
    if (matchingDivs.length >= 2) {
      otherDiv = matchingDivs[1];
    }
  }

  // Check if sidebar is open
  const sidebarElement = document.getElementById("whatsapp-sidebar-root");
  const isSidebarOpen =
    sidebarElement && sidebarElement.style.display !== "none";
  const marginRight = isSidebarOpen ? "400px" : "0px";

  if (targetDiv) {
    // targetDiv.style.marginTop = "48px";
    targetDiv.style.paddingTop = "48px";
    targetDiv.style.marginRight = marginRight;

    const divIndex =
      applyToSecond && matchingDivs.length >= 2 ? "SECOND" : "FIRST";
  }

  if (otherDiv) {
    otherDiv.style.marginTop = "0px";
    otherDiv.style.marginRight = "0px";
    otherDiv.style.maxHeight = "calc(100vh - 48px)";
    otherDiv.style.overflow = "hidden";
  }
}

function setupMainContentMarginObserver() {
  ensureMainContentMargin();
  const marginObserver = new MutationObserver((mutations) => {
    let needsUpdate = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        Array.from(mutation.addedNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "DIV") {
            const classList = Array.from(node.classList);
            if (
              classList.length === 3 &&
              classList.includes("x78zum5") &&
              classList.includes("xdt5ytf") &&
              classList.includes("x5yr21d")
            ) {
              needsUpdate = true;
            }
            const childDivs = node.querySelectorAll
              ? node.querySelectorAll("div")
              : [];
            childDivs.forEach((childDiv) => {
              const childClassList = Array.from(childDiv.classList);
              if (
                childClassList.length === 3 &&
                childClassList.includes("x78zum5") &&
                childClassList.includes("xdt5ytf") &&
                childClassList.includes("x5yr21d")
              ) {
                needsUpdate = true;
              }
            });
          }
        });
      }

      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "style" ||
          mutation.attributeName === "class")
      ) {
        const target = mutation.target;
        if (target.tagName === "DIV") {
          const classList = Array.from(target.classList);
          if (
            classList.length === 3 &&
            classList.includes("x78zum5") &&
            classList.includes("xdt5ytf") &&
            classList.includes("x5yr21d")
          ) {
            needsUpdate = true;
          }
        }
      }
    });

    if (needsUpdate) {
      // Debounce the updates to avoid excessive calls
      clearTimeout(window.marginUpdateTimeout);
      window.marginUpdateTimeout = setTimeout(() => {
        // Check if a chat is open by looking for chat header
        const chatHeader = document.querySelector(
          'header[data-testid="conversation-header"]'
        );
        const isChatOpen = !!chatHeader;

        ensureMainContentMargin(isChatOpen);
      }, 300);
    }
  });

  marginObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"],
  });

  console.log("👁️ WhatsApp main content margin observer setup complete");

  document.body.addEventListener("click", (event) => {
    const chatItem = event.target.closest(
      '[data-testid="cell-frame-container"], div[role="listitem"]'
    );

    if (chatItem) {
      // Wait for chat to load, then check and apply margins
      setTimeout(() => {
        const chatHeader = document.querySelector(
          'header[data-testid="conversation-header"]'
        );
        const isChatOpen = !!chatHeader;

        if (isChatOpen) {
          ensureMainContentMargin(true); // Apply to second div when chat opens
          console.log("💬 Chat opened - applied margins to SECOND div");
        }
      }, 300);
    }
  });

  console.log("👆 Click listener for chat detection setup complete");
}

// Call all injection functions
injectTopToolbarIntoWhatsAppBody();
injectSidebarButtons();
injectChatHeaderHover();
injectChatListEnhancer();

// Setup main content margin observer after a short delay
setTimeout(() => {
  setupMainContentMarginObserver();
}, 2000);

// Always observe chat changes to update sidebar contact info
waitForElement("#pane-side", () => {
  console.log("🎯 #pane-side found, setting up chat observer...");
  observeActiveChat();
});

// Function to download image from URL and convert to File object
async function downloadImageAsFile(imageUrl, filename) {
  try {
    console.log("[IMAGE] Downloading image from:", imageUrl);

    // Try multiple methods to download the image
    let response = null;

    // Method 1: Direct fetch (works for same-origin images)
    try {
      response = await fetch(imageUrl);
      if (!response.ok)
        throw new Error(`Direct fetch failed: ${response.status}`);
    } catch (directError) {
      console.log("[IMAGE] Direct fetch failed, trying CORS proxy...");

      // Method 2: CORS proxy
      try {
        const corsProxy = "https://corsproxy.io/?";
        const proxyUrl = corsProxy + encodeURIComponent(imageUrl);
        response = await fetch(proxyUrl);
        if (!response.ok)
          throw new Error(`CORS proxy failed: ${response.status}`);
      } catch (proxyError) {
        console.log("[IMAGE] CORS proxy failed, trying alternative proxy...");

        // Method 3: Alternative proxy
        const altProxy = "https://api.allorigins.win/raw?url=";
        const altProxyUrl = altProxy + encodeURIComponent(imageUrl);
        response = await fetch(altProxyUrl);
        if (!response.ok)
          throw new Error(`Alternative proxy failed: ${response.status}`);
      }
    }

    const blob = await response.blob();
    console.log("[IMAGE] Blob created:", {
      size: blob.size,
      type: blob.type,
    });

    const file = new File([blob], filename, {
      type: blob.type || "image/jpeg",
    });

    console.log("[IMAGE] Image downloaded successfully:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    return file;
  } catch (error) {
    console.error("[IMAGE] Error downloading image:", error);
    return null;
  }
}

// Function to add image to WhatsApp chat
async function addImageToChat(imageFile) {
  try {
    console.log("[IMAGE] Adding image to chat:", imageFile);
    console.log("[IMAGE] File details:", {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
    });

    // Enhanced selectors for attachment button
    const attachButtonSelectors = [
      '[data-testid="clip"]',
      'button[aria-label*="Attach"]',
      'span[data-testid="clip"]',
      '[title*="Attach"]',
      '[aria-label*="Attach"]',
      'button[title*="Attach"]',
      ".attach-button",
      '[data-icon="clip"]',
    ];

    let attachButton = null;
    for (const selector of attachButtonSelectors) {
      attachButton = document.querySelector(selector);
      if (attachButton) {
        console.log("[IMAGE] Found attachment button with selector:", selector);
        break;
      }
    }

    if (!attachButton) {
      console.error(
        "[IMAGE] Attachment button not found. Available buttons:",
        document.querySelectorAll('button, span[role="button"]')
      );
      return false;
    }

    console.log("[IMAGE] Clicking attachment button...");
    attachButton.click();

    // Wait longer for attachment menu to appear
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Enhanced selectors for photo/image option
    const photoButtonSelectors = [
      '[data-testid="mi-attach-photo"]',
      'input[accept*="image"]',
      'button[aria-label*="Photos"]',
      '[title*="Photos"]',
      '[aria-label*="Photos"]',
      'button[title*="Photos"]',
      '[data-testid="attach-photo"]',
      'li[data-testid="mi-attach-photo"]',
      'div[data-testid="mi-attach-photo"]',
    ];

    let photoButton = null;
    for (const selector of photoButtonSelectors) {
      photoButton = document.querySelector(selector);
      if (photoButton) {
        console.log("[IMAGE] Found photo button with selector:", selector);
        break;
      }
    }

    if (!photoButton) {
      console.error(
        "[IMAGE] Photo button not found. Available elements:",
        document.querySelectorAll(
          '[data-testid*="photo"], [aria-label*="photo"], [title*="photo"]'
        )
      );
      return false;
    }

    console.log("[IMAGE] Photo button found, tagName:", photoButton.tagName);

    // If it's an input element, directly set the file
    if (photoButton.tagName === "INPUT") {
      console.log("[IMAGE] Direct input method - setting file directly");
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);
      photoButton.files = dataTransfer.files;

      const changeEvent = new Event("change", { bubbles: true });
      photoButton.dispatchEvent(changeEvent);

      console.log("[IMAGE] Image file set to input successfully");
      return true;
    } else {
      // If it's a button, click it and then handle file input
      console.log("[IMAGE] Button method - clicking photo button");
      photoButton.click();

      // Wait for file input to appear with multiple attempts
      let fileInput = null;
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 200));

        const fileInputSelectors = [
          'input[type="file"][accept*="image"]',
          'input[type="file"]',
          'input[accept*="image"]',
        ];

        for (const selector of fileInputSelectors) {
          fileInput = document.querySelector(selector);
          if (fileInput) {
            console.log("[IMAGE] Found file input with selector:", selector);
            break;
          }
        }

        if (fileInput) break;
        console.log(`[IMAGE] Attempt ${i + 1}: File input not found yet...`);
      }

      if (fileInput) {
        console.log("[IMAGE] Setting file to input element");
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(imageFile);
        fileInput.files = dataTransfer.files;

        // Trigger multiple events to ensure WhatsApp detects the file
        const events = [
          new Event("change", { bubbles: true }),
          new Event("input", { bubbles: true }),
          new Event("drop", { bubbles: true }),
        ];

        events.forEach((event) => {
          fileInput.dispatchEvent(event);
        });

        console.log("[IMAGE] Image file set to file input successfully");
        return true;
      } else {
        console.error(
          "[IMAGE] File input not found after clicking photo button"
        );
        return false;
      }
    }
  } catch (error) {
    console.error("[IMAGE] Error adding image to chat:", error);
    return false;
  }
}

// Function to add message to current chat input (manual send)
window.sendMessageToCurrentChat = function (message, productItem = null) {
  console.log("[CHAT] Adding product message to chat input:", message);
  console.log("[CHAT] Product item for image:", productItem);

  try {
    // First, let's try to find the message input using the most reliable method
    let messageInput = null;

    // Method 1: Look for the main message input container
    const chatFooter =
      document.querySelector(
        'footer[data-testid="conversation-compose-box-input"]'
      ) ||
      document.querySelector("footer") ||
      document.querySelector('[data-testid="conversation-compose-box-input"]');

    if (chatFooter) {
      // Look for contenteditable div within the footer
      messageInput =
        chatFooter.querySelector('div[contenteditable="true"]') ||
        chatFooter.querySelector('[role="textbox"]') ||
        chatFooter.querySelector(
          'div[data-testid="conversation-compose-box-input"]'
        );
    }

    // Method 2: Direct selectors if footer method didn't work
    if (!messageInput) {
      const selectors = [
        'div[contenteditable="true"][data-tab="10"]',
        'div[contenteditable="true"][role="textbox"]',
        'div[contenteditable="true"]',
        '[data-testid="conversation-compose-box-input"] div[contenteditable="true"]',
        'footer div[contenteditable="true"]',
        '.selectable-text[contenteditable="true"]',
      ];

      for (const selector of selectors) {
        messageInput = document.querySelector(selector);
        if (messageInput && messageInput.offsetParent !== null) {
          // Check if element is visible
          console.log("[CHAT] Found message input with selector:", selector);
          break;
        }
      }
    }

    if (!messageInput) {
      console.error("[CHAT] Could not find message input element");
      console.log(
        "[CHAT] Available contenteditable elements:",
        document.querySelectorAll('[contenteditable="true"]')
      );
      return false;
    }

    console.log("[CHAT] Found message input element:", messageInput);
    console.log("[CHAT] Input element properties:", {
      tagName: messageInput.tagName,
      contentEditable: messageInput.contentEditable,
      isVisible: messageInput.offsetParent !== null,
      currentContent: messageInput.textContent || messageInput.innerText,
    });

    // Focus and prepare the input
    messageInput.focus();

    // Use a more reliable method to set content
    setTimeout(() => {
      try {
        // Clear any existing content first
        messageInput.innerHTML = "";
        messageInput.textContent = "";

        // Method 1: Use document.execCommand (most reliable for contenteditable)
        if (document.execCommand) {
          messageInput.focus();
          document.execCommand("selectAll", false, null);
          document.execCommand("insertText", false, message);
          console.log("[CHAT] Used execCommand to insert text");
        } else {
          // Method 2: Direct content setting
          messageInput.textContent = message;
          console.log("[CHAT] Used textContent to set message");
        }

        // Trigger comprehensive events
        const events = [
          new Event("focus", { bubbles: true }),
          new Event("input", { bubbles: true, cancelable: true }),
          new Event("change", { bubbles: true }),
          new KeyboardEvent("keydown", {
            bubbles: true,
            key: "a",
            ctrlKey: true,
          }),
          new KeyboardEvent("keyup", {
            bubbles: true,
            key: "a",
            ctrlKey: true,
          }),
          new Event("paste", { bubbles: true }),
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: message,
          }),
        ];

        events.forEach((event) => {
          try {
            messageInput.dispatchEvent(event);
          } catch (e) {
            console.log("[CHAT] Event dispatch error:", e);
          }
        });

        // Final verification
        setTimeout(() => {
          const finalContent =
            messageInput.textContent ||
            messageInput.innerText ||
            messageInput.value;
          console.log("[CHAT] Final content check:", finalContent);

          if (finalContent && finalContent.trim().length > 0) {
            console.log(
              "[CHAT] ✅ SUCCESS! Product details are now in the message input box"
            );
            console.log(
              "[CHAT] You can now press the send button to share the product"
            );

            // Optional: Highlight the send button
            const sendButton =
              document.querySelector('[data-testid="send"]') ||
              document.querySelector('button[aria-label*="Send"]') ||
              document.querySelector('span[data-testid="send"]');
            if (sendButton) {
              sendButton.style.animation = "pulse 1s ease-in-out 3";
              sendButton.style.boxShadow = "0 0 10px #25d366";
              setTimeout(() => {
                sendButton.style.animation = "";
                sendButton.style.boxShadow = "";
              }, 3000);
            }
          } else {
            console.warn(
              "[CHAT] Content was not set properly, trying alternative method..."
            );

            // Alternative method: Simulate typing
            messageInput.focus();
            const textEvent = new CompositionEvent("compositionstart", {
              bubbles: true,
            });
            messageInput.dispatchEvent(textEvent);

            messageInput.textContent = message;

            const endEvent = new CompositionEvent("compositionend", {
              bubbles: true,
              data: message,
            });
            messageInput.dispatchEvent(endEvent);

            const inputEvent = new InputEvent("input", {
              bubbles: true,
              inputType: "insertCompositionText",
              data: message,
            });
            messageInput.dispatchEvent(inputEvent);
          }
        }, 200);
      } catch (innerError) {
        console.error("[CHAT] Error setting content:", innerError);
      }
    }, 150);

    // If product has an image, add it to the chat
    if (productItem) {
      // Handle both image (single) and images (array) properties
      let imageUrl = null;

      if (
        productItem.images &&
        Array.isArray(productItem.images) &&
        productItem.images.length > 0
      ) {
        // Handle images array format
        // imageUrl = productItem.images[0]?.url || productItem.images[0];
        imageUrl =
          productItem.variants.length > 0
            ? showVariantImages(productItem.images, productItem)
            : showProductImages(productItem);
      } else if (productItem.image) {
        // Handle single image format
        imageUrl = productItem.image;
      }

      if (imageUrl) {
        console.log(
          "[CHAT] Product has image, attempting to add image to chat..."
        );
        console.log("[CHAT] Image URL:", imageUrl);

        setTimeout(async () => {
          try {
            const productName =
              productItem.name || productItem.title || "product";
            const filename = `${productName.replace(/[^a-zA-Z0-9]/g, "_")}.jpg`;

            console.log("[CHAT] Starting image download process...");
            const imageFile = await downloadImageAsFile(imageUrl, filename);

            console.log("[CHAT] Image download result:", {
              success: !!imageFile,
              filename: filename,
              productName: productName,
            });

            if (imageFile) {
              console.log("[CHAT] Attempting to add image to chat...");
              const imageAdded = await addImageToChat(imageFile);
              if (imageAdded) {
                console.log(
                  "[CHAT] ✅ Product image added to chat successfully!"
                );
              } else {
                console.warn(
                  "[CHAT] ❌ Failed to add image to chat - check console for details"
                );
              }
            } else {
              console.warn(
                "[CHAT] ❌ Failed to download product image - check console for details"
              );
            }
          } catch (error) {
            console.error("[CHAT] Error handling product image:", error);
          }
        }, 500); // Reduced wait time to 500ms after text is added
      } else {
        console.log("[CHAT] No image URL found in product item");
      }
    }

    return true;
  } catch (error) {
    console.error("[CHAT] Error in sendMessageToCurrentChat:", error);
    return false;
  }
};

// No explicit observer for the sidebar's presence in index.jsx needed now,
// as the toggleWhatsappSidebar function creates it if it doesn't exist
// and adjusts mainAppContent's margin.

// Debug function to inspect WhatsApp DOM structure
window.debugWhatsAppDOM = function () {
  console.log("🔍 [DEBUG] WhatsApp DOM Structure Analysis:");

  // Check for attachment button
  const attachSelectors = [
    '[data-testid="clip"]',
    'button[aria-label*="Attach"]',
    'span[data-testid="clip"]',
    '[title*="Attach"]',
  ];

  console.log("📎 Attachment Button Check:");
  attachSelectors.forEach((selector) => {
    const element = document.querySelector(selector);
    console.log(
      `  ${selector}: ${element ? "✅ FOUND" : "❌ NOT FOUND"}`,
      element
    );
  });

  // Check for photo button (after clicking attachment)
  const photoSelectors = [
    '[data-testid="mi-attach-photo"]',
    'input[accept*="image"]',
    'button[aria-label*="Photos"]',
    '[title*="Photos"]',
  ];

  console.log("📷 Photo Button Check:");
  photoSelectors.forEach((selector) => {
    const element = document.querySelector(selector);
    console.log(
      `  ${selector}: ${element ? "✅ FOUND" : "❌ NOT FOUND"}`,
      element
    );
  });

  // Check for file inputs
  const fileInputs = document.querySelectorAll('input[type="file"]');
  console.log(`📁 File Inputs Found: ${fileInputs.length}`, fileInputs);

  // Check message input
  const messageInputs = document.querySelectorAll('[contenteditable="true"]');
  console.log(
    `💬 Message Inputs Found: ${messageInputs.length}`,
    messageInputs
  );

  // Check send button
  const sendButtons = document.querySelectorAll('[data-testid="send"]');
  console.log(`📤 Send Buttons Found: ${sendButtons.length}`, sendButtons);

  return {
    attachmentButton: document.querySelector('[data-testid="clip"]'),
    photoButton: document.querySelector('[data-testid="mi-attach-photo"]'),
    fileInputs: fileInputs,
    messageInputs: messageInputs,
    sendButtons: sendButtons,
  };
};

// Debug functions for testing
window.clearProductsCache = function () {
  console.log("[PRODUCTS] 🗑️ Clearing products cache...");
  productsCache = null; // Set to null to force re-fetch
  productsLoading = false;
  productsError = null;
  window.whatsapofyProducts.catalog = []; // Clear global
  console.log(
    "[PRODUCTS] ✅ Products cache cleared. Next sidebar update will fetch fresh data."
  );
};

window.clearStoresCache = function () {
  console.log("[STORES] 🗑️ Clearing stores cache...");
  storesCache = null; // Set to null to force re-fetch
  storesLoading = false;
  storesError = null;
  window.whatsapofyProducts.storeId = null; // Clear global store ID
  console.log(
    "[STORES] ✅ Stores cache cleared. Next sidebar update will fetch fresh data."
  );
};

window.clearUserInfoCache = function () {
  console.log("[USER] 🗑️ Clearing user info cache...");
  userInfoCache = null; // Set to null to force re-fetch
  userInfoLoading = false;
  userInfoError = null;
  window.whatsapofyUserInfo.userInfo = null; // Clear global
  console.log(
    "[USER] ✅ User info cache cleared. Next sidebar update will fetch fresh data."
  );
};

window.testProductsFetch = function () {
  console.log("[PRODUCTS] 🧪 Manually triggering products fetch...");
  window.clearProductsCache();
  fetchProductsFromAPI();
};

window.testNewProductsAPI = function () {
  console.log("[PRODUCTS] 🧪 Testing new products API endpoint...");
  const token = localStorage.getItem("whatsopify_token");
  if (!token) {
    console.error("[PRODUCTS] No token found");
    return;
  }

  const apiParams = new URLSearchParams({
    limit: "50",
    page: "1",
    status: "active",
    tabStatus: "all",
    prodStatus: "all",
    vendor: "",
    search: "",
  });
  const apiUrl = `${
    import.meta.env.VITE_API_URL
  }/api/v1/products?${apiParams.toString()}`;

  console.log("[PRODUCTS] Testing API URL:", apiUrl);

  fetch(apiUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      console.log("[PRODUCTS] Response status:", response.status);
      console.log(
        "[PRODUCTS] Response headers:",
        Object.fromEntries(response.headers.entries())
      );
      return response.text();
    })
    .then((text) => {
      console.log("[PRODUCTS] Raw response:", text);
      try {
        const data = JSON.parse(text);
        console.log("[PRODUCTS] Parsed response:", data);
        console.log(
          "[PRODUCTS] Number of products:",
          Array.isArray(data)
            ? data.length
            : data.products
            ? data.products.length
            : "Unknown"
        );
      } catch (e) {
        console.error("[PRODUCTS] JSON parse error:", e);
      }
    })
    .catch((error) => {
      console.error("[PRODUCTS] Fetch error:", error);
    });
};

window.debugProductsState = function () {
  console.log("[PRODUCTS] 📊 Current state:");
  console.log("productsCache:", productsCache);
  console.log("productsLoading:", productsLoading);
  console.log("productsError:", productsError);
  console.log("storesCache:", storesCache);
  console.log("storesLoading:", storesLoading);
  console.log("storesError:", storesError);
  console.log(
    "window.whatsapofyProducts.catalog:",
    window.whatsapofyProducts.catalog
  );
  console.log(
    "window.whatsapofyProducts.storeId:",
    window.whatsapofyProducts.storeId
  );
  console.log(
    "window.whatsapofyUserInfo.userInfo:",
    window.whatsapofyUserInfo.userInfo
  );
};

window.debugStoresData = function () {
  console.log("[DEBUG] 🏪 Stores debugging:");
  console.log("storesCache:", storesCache);
  if (storesCache && storesCache.length > 0) {
    storesCache.forEach((store, index) => {
      console.log(`[DEBUG] Store ${index + 1}:`, store);
      console.log(`[DEBUG] Store ${index + 1} fields:`, Object.keys(store));
    });
  } else {
    console.log("[DEBUG] No stores in cache");
  }
};

window.debugMessageInput = function () {
  console.log("[DEBUG] 💬 Message input debugging:");

  const selectors = [
    '[data-testid="conversation-compose-box-input"]',
    'div[contenteditable="true"][data-tab="10"]',
    'div[contenteditable="true"]',
    '[role="textbox"]',
    'div[data-testid="conversation-compose-box-input"]',
    'div.selectable-text[contenteditable="true"]',
    'div[spellcheck="true"][contenteditable="true"]',
  ];

  selectors.forEach((selector, index) => {
    const element = document.querySelector(selector);
    console.log(`[DEBUG] Selector ${index + 1}: ${selector}`);
    console.log(`[DEBUG] Found element:`, element);
    if (element) {
      console.log(`[DEBUG] Element properties:`, {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        contentEditable: element.contentEditable,
        textContent: element.textContent,
        innerHTML: element.innerHTML,
      });
    }
  });

  // Also check for any input-like elements
  const allInputs = document.querySelectorAll(
    'input, textarea, [contenteditable="true"]'
  );
  console.log(`[DEBUG] All input-like elements found: ${allInputs.length}`);
  allInputs.forEach((input, index) => {
    if (index < 5) {
      // Show first 5 only
      console.log(`[DEBUG] Input ${index + 1}:`, input);
    }
  });
};

window.debugTokenIssue = function () {
  console.log("[DEBUG] 🔑 Token debugging:");

  // Check localStorage
  const whatsopifyTokenRaw = localStorage.getItem("whatsopify_token");
  console.log("[DEBUG] Raw token from localStorage:", whatsopifyTokenRaw);

  if (whatsopifyTokenRaw) {
    try {
      const whatsopifyTokenObj = JSON.parse(whatsopifyTokenRaw);
      console.log("[DEBUG] Parsed token object:", whatsopifyTokenObj);

      let token = null;
      if (
        whatsopifyTokenObj &&
        whatsopifyTokenObj.data &&
        whatsopifyTokenObj.data.token
      ) {
        token = whatsopifyTokenObj.data.token;
        console.log(
          "[DEBUG] Token from new structure:",
          token ? token.substring(0, 20) + "..." : "undefined"
        );
      } else if (whatsopifyTokenObj && whatsopifyTokenObj.token) {
        token = whatsopifyTokenObj.token;
        console.log(
          "[DEBUG] Token from old structure:",
          token ? token.substring(0, 20) + "..." : "undefined"
        );
      } else {
        console.log("[DEBUG] No token found in either structure");
      }

      if (token) {
        console.log("[DEBUG] Testing API call with token...");
        chrome.runtime.sendMessage(
          {
            action: "FETCH_PRODUCTS",
            token: token,
          },
          (response) => {
            console.log("[DEBUG] API response:", response);
          }
        );
      }
    } catch (err) {
      console.error("[DEBUG] Error parsing token:", err);
    }
  } else {
    console.log("[DEBUG] No token found in localStorage");
  }
};

// --- Initial Data Fetches (run once when script loads) ---
// Note: API calls are now triggered only after store selection, not immediately after login
// fetchUserInfo(); // Moved to store selection
// fetchStoresForUser(); // Moved to store selection
// Products fetch will be triggered by getProducts when needed (e.g., by sidebar or modal)

// --- Global Order Form Control ---
window.showOrderForm = (show) => {
  console.log(`Order form ${show ? "opened" : "closed"}`);
  if (show) {
    // Switch to order form sidebar mode
    switchSidebarMode("orderForm");
  } else {
    // Switch back to default or chat mode
    if (lastActiveChatId) {
      switchSidebarMode("chat");
    } else {
      switchSidebarMode("default");
    }
  }
};

// --- Global Sidebar Mode Control ---
window.switchToDefaultSidebar = () => {
  console.log("🔄 Switching to default sidebar mode");
  switchSidebarMode("default");
};

window.switchToChatSidebar = (contact) => {
  console.log("🔄 Switching to chat sidebar mode with contact:", contact);
  if (contact) {
    sidebarProps.contact = contact;
    // Fetch fresh data for the contact
    getUserInfo((userInfo) => {
      sidebarProps.userInfo = userInfo;
      getStoresForUser((stores) => {
        sidebarProps.stores = stores;
        getCatalogForContact(contact, (products) => {
          sidebarProps.catalog = products;
          sidebarProps.notes = getNotesForContact(contact.name);
          sidebarProps.onNotesChange = handleNotesChange;
          switchSidebarMode("chat");
        });
      });
    });
  } else {
    switchSidebarMode("chat");
  }
};

window.switchToOrderFormSidebar = (contact) => {
  console.log("🔄 Switching to order form sidebar mode");
  if (contact) {
    sidebarProps.contact = contact;
  }
  switchSidebarMode("orderForm");
};

window.getCurrentSidebarMode = () => {
  return sidebarMode;
};

// Debug function to check sidebar state
window.debugSidebarState = () => {
  console.log("🔍 ===== SIDEBAR DEBUG STATE =====");
  console.log("📊 Current sidebarMode:", sidebarMode);
  console.log("📊 isSidebarOpen:", isSidebarOpen);
  console.log("📊 sidebarRoot exists:", !!sidebarRoot);
  console.log("📊 mainAppContent exists:", !!mainAppContent);
  console.log("📊 lastActiveChatId:", lastActiveChatId);
  console.log("📊 sidebarProps.contact:", sidebarProps.contact);
  console.log("📊 #pane-side exists:", !!document.querySelector("#pane-side"));
  console.log(
    "📊 Sidebar container exists:",
    !!document.getElementById("whatsapp-sidebar-root")
  );
  const theme = getWhatsAppTheme();
  console.log("📊 Current theme:", theme.isDark ? "Dark 🌙" : "Light ☀️");
  console.log("🔍 ================================");
};

// Function to manually update sidebar theme
window.updateSidebarTheme = () => {
  const sidebarContainer = document.getElementById("whatsapp-sidebar-root");
  if (sidebarContainer) {
    const theme = getWhatsAppTheme();
    sidebarContainer.style.backgroundColor = theme.sidebarBg;
    sidebarContainer.style.boxShadow = theme.sidebarShadow;
    console.log(
      "✅ Sidebar theme manually updated:",
      theme.isDark ? "Dark 🌙" : "Light ☀️"
    );
    return theme;
  } else {
    console.warn("⚠️ Sidebar container not found");
    return null;
  }
};

// --- Global API Exposure ---
window.getProducts = getProducts;
window.getUserInfo = getUserInfo;
window.getStoresForUser = getStoresForUser;

// Expose sidebarProps for external access (like in TopToolbar)
Object.defineProperty(window, "sidebarProps", {
  get: () => sidebarProps,
  configurable: true,
});

// Expose margin management functions for debugging
window.whatsappMarginManager = {
  ensureMainContentMargin,
  forceMarginUpdate: (applyToSecond = false) => {
    ensureMainContentMargin(applyToSecond);
    const target = applyToSecond ? "SECOND" : "FIRST";
    console.log(
      `🔧 Forced margin update to ${target} div (top: 48px, right: 400px)`
    );
  },
  forceUpdateForChat: () => {
    ensureMainContentMargin(true);
    console.log("💬 Forced margin update for SECOND div (chat view)");
  },
  forceUpdateForDefault: () => {
    ensureMainContentMargin(false);
    console.log("🏠 Forced margin update for FIRST div (default view)");
  },
  checkMarginStatus: () => {
    const allDivs = document.querySelectorAll("div");
    const exactMatches = [];

    console.log(
      '📊 Checking for divs with EXACTLY class="x78zum5 xdt5ytf x5yr21d":'
    );

    allDivs.forEach((element) => {
      const classList = Array.from(element.classList);
      if (
        classList.length === 3 &&
        classList.includes("x78zum5") &&
        classList.includes("xdt5ytf") &&
        classList.includes("x5yr21d")
      ) {
        exactMatches.push(element);
      }
    });

    // Check if chat is open
    const chatHeader = document.querySelector(
      'header[data-testid="conversation-header"]'
    );
    const isChatOpen = !!chatHeader;
    const targetIndex = isChatOpen ? 1 : 0;

    console.log(
      `Found ${exactMatches.length} div(s) with EXACTLY these 3 classes:`
    );
    console.log(
      `📍 Current view: ${isChatOpen ? "CHAT OPEN" : "DEFAULT VIEW"}`
    );
    console.log(
      `⚠️ NOTE: Margins are applied to the ${
        isChatOpen ? "SECOND" : "FIRST"
      } matching div`
    );

    exactMatches.forEach((element, index) => {
      const computedStyle = window.getComputedStyle(element);
      const marginTop = computedStyle.marginTop;
      const marginRight = computedStyle.marginRight;
      const classCount = element.classList.length;
      const isTarget = index === targetIndex;

      console.log(`${isTarget ? "👉 TARGET" : "  "} Element ${index + 1}:`);
      console.log(
        `  - This is ${
          isTarget
            ? "THE TARGET (margins applied here)"
            : "NOT the target (ignored)"
        }`
      );
      console.log(`  - Class count: ${classCount} (must be exactly 3)`);
      console.log(`  - Classes: ${element.className}`);
      console.log(`  - margin-top: ${marginTop}`);
      console.log(`  - margin-right: ${marginRight}`);
    });

    return exactMatches;
  },
};

// Ensure window.whatsapofyProducts has the correct references
Object.assign(window.whatsapofyProducts, {
  productsCache, // This will be updated by fetchProductsFromAPI
  getProducts,
  storesCache, // This will be updated by fetchStoresForUser
  whatsapofyUserInfo, // This object holds userInfoCache
});

// Auto-send WhatsApp message functionality using chrome.storage.local
let autoSendAttempted = false; // Flag to prevent multiple sends

window.whatsopifyAutoSendCheck = () => {
  chrome.storage.local.get(
    [
      "whatsopify_auto_send",
      "whatsopify_auto_message",
      "whatsopify_auto_phone",
      "whatsopify_auto_timestamp",
    ],
    (result) => {
      if (result.whatsopify_auto_send === true && !autoSendAttempted) {
        console.log("[CONTENT] Auto-send flag detected on page load...");

        const autoSendWhatsAppMessage = () => {
          try {
            // Check if we already attempted to send
            if (autoSendAttempted) {
              console.log("[CONTENT] Auto-send already attempted, skipping...");
              return;
            }

            const autoMessage = result.whatsopify_auto_message;
            const timestamp = result.whatsopify_auto_timestamp;

            if (!autoMessage) return;

            // Check if the request is not too old (within 30 seconds)
            const now = Date.now();
            const requestTime = parseInt(timestamp || "0");
            if (now - requestTime > 30000) {
              // Clear old request
              chrome.storage.local.remove([
                "whatsopify_auto_send",
                "whatsopify_auto_message",
                "whatsopify_auto_phone",
                "whatsopify_auto_timestamp",
              ]);
              return;
            }

            console.log(
              "[CONTENT] Attempting to auto-send WhatsApp message..."
            );

            // Find the text input field first
            const messageInput =
              document.querySelector(
                '[data-testid="conversation-compose-box-input"]'
              ) ||
              document.querySelector(
                'div[contenteditable="true"][data-tab="10"]'
              ) ||
              document.querySelector('[data-testid="compose-box-input"]');

            if (!messageInput) {
              console.log(
                "[CONTENT] ⚠️ Message input field not found, will retry..."
              );
              return;
            }

            // Ensure we're in text mode (not voice mode)
            const textTab = document.querySelector('[data-tab="10"]');
            if (textTab && !textTab.classList.contains("selected")) {
              console.log("[CONTENT] Switching to text mode...");
              textTab.click();
              return; // Wait for next attempt after switching to text mode
            }

            // Check if message is already in the input field
            const currentText =
              messageInput.textContent || messageInput.innerText || "";
            if (currentText.trim() !== autoMessage.trim()) {
              console.log("[CONTENT] Setting message text...");
              // Clear and set the message text
              messageInput.textContent = autoMessage;
              messageInput.innerText = autoMessage;

              // Trigger input events
              const inputEvent = new Event("input", { bubbles: true });
              messageInput.dispatchEvent(inputEvent);

              return; // Wait for next attempt after setting text
            }

            // Now find the send button (only text send button)
            const sendButtonSelectors = [
              '[data-tab="11"]', // Send button for text messages
              'button[aria-label="Send"]:not([data-tab="12"])', // Exclude voice send button
              '[data-testid="send"]:not([data-tab="12"])',
            ];

            let sendButton = null;
            for (const selector of sendButtonSelectors) {
              sendButton = document.querySelector(selector);
              if (sendButton && sendButton.offsetParent !== null) {
                console.log(
                  `[CONTENT] ✅ Found text send button with selector: ${selector}`
                );
                break;
              }
            }

            if (sendButton) {
              console.log(
                "[CONTENT] ✅ Found text send button, auto-clicking..."
              );

              // Mark as attempted to prevent multiple sends
              autoSendAttempted = true;

              // Try direct click first (most reliable)
              if (sendButton.click) {
                sendButton.click();
                console.log("[CONTENT] ✅ Direct click successful");
              }

              // Clear the auto-send flags
              chrome.storage.local.remove([
                "whatsopify_auto_send",
                "whatsopify_auto_message",
                "whatsopify_auto_phone",
                "whatsopify_auto_timestamp",
              ]);

              console.log("[CONTENT] ✅ Auto-send completed");
            } else {
              console.log(
                "[CONTENT] ⚠️ Text send button not found, will retry..."
              );
            }
          } catch (error) {
            console.error(
              "[CONTENT] Error auto-sending WhatsApp message:",
              error
            );
          }
        };

        // Set up auto-send with fewer attempts and longer intervals
        setTimeout(() => autoSendWhatsAppMessage(), 3000);
        setTimeout(() => autoSendWhatsAppMessage(), 6000);
        setTimeout(() => autoSendWhatsAppMessage(), 10000);
      }
    }
  );
};

// Call auto-send check on page load
window.whatsopifyAutoSendCheck();

// Also set up a MutationObserver to detect when WhatsApp interface is ready
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (
      mutation.type === "childList" &&
      mutation.addedNodes.length > 0 &&
      !autoSendAttempted
    ) {
      // Check if WhatsApp interface elements are being added
      const hasWhatsAppElements = Array.from(mutation.addedNodes).some(
        (node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return (
              node.querySelector &&
              (node.querySelector(
                '[data-testid="conversation-compose-box-input"]'
              ) ||
                node.querySelector('[aria-label="Send"]') ||
                node.querySelector('div[contenteditable="true"]'))
            );
          }
          return false;
        }
      );

      if (hasWhatsAppElements) {
        console.log(
          "[CONTENT] WhatsApp interface elements detected, checking for auto-send..."
        );
        setTimeout(() => window.whatsopifyAutoSendCheck(), 1000);
      }
    }
  });
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// --- Listen for 401 unauthorized events from background script ---
window.addEventListener("whatsopify-unauthorized", (event) => {
  console.log("[CONTENT] Received unauthorized event:", event.detail);

  // Clear all caches
  window.clearProductsCache && window.clearProductsCache();
  window.clearStoresCache && window.clearStoresCache();
  if (typeof userInfoCache !== "undefined") userInfoCache = null;
  if (typeof storesCache !== "undefined") storesCache = null;

  // Close sidebar
  window.toggleWhatsappSidebar(false);

  // Show notification to user
  if (event.detail && event.detail.message) {
    console.warn("[CONTENT] Authentication expired:", event.detail.message);
    showAuthExpiredNotification(event.detail.message);
  }
});

// Function to show authentication expired notification
function showAuthExpiredNotification(message) {
  // Create notification element
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ff4444;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;

  // Add CSS animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  notification.textContent = message;
  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-in";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// Expose notification function globally
window.showAuthExpiredNotification = showAuthExpiredNotification;

// Global function to check if store is selected and show modal if not
window.requireStoreSelection = function (callback) {
  const selectedStore = localStorage.getItem("whatsopify_selected_store");
  const hasSelectedStore =
    selectedStore && selectedStore !== "null" && selectedStore !== '""';

  if (!hasSelectedStore) {
    console.log("⚠️ Store selection required - showing store selection modal");
    // Dispatch event to show store selection modal
    window.dispatchEvent(new CustomEvent("showStoreSelectionModal"));
    return false;
  }

  // If callback provided and store is selected, execute it
  if (callback && typeof callback === "function") {
    callback();
  }

  return true;
};

// Global function to refresh orders (for store selection)
window.refreshOrders = function (callback) {
  console.log("[ORDERS] Global refresh orders called");

  // Get selected store ID
  const selectedStore = localStorage.getItem("whatsopify_selected_store");
  let storeId = "default";
  if (selectedStore) {
    try {
      const store = JSON.parse(selectedStore);
      storeId =
        store._id || store.id || store.storeId || store.store_id || "default";
    } catch (err) {
      console.warn("[ORDERS] Error parsing selected store:", err);
    }
  }

  // Fetch both new and pending orders
  Promise.all([
    chrome.runtime.sendMessage({
      action: "FETCH_ORDERS",
      token: getToken(),
      status: "open",
      page: 1,
      limit: 50,
      storeId: storeId,
    }),
    chrome.runtime.sendMessage({
      action: "FETCH_ORDERS",
      token: getToken(),
      status: "pending",
      page: 1,
      limit: 50,
      storeId: storeId,
    }),
  ])
    .then(([newOrdersResponse, pendingOrdersResponse]) => {
      console.log("[ORDERS] Orders refreshed for store:", storeId);
      if (callback) {
        callback({
          new: newOrdersResponse.success ? newOrdersResponse.orders : null,
          pending: pendingOrdersResponse.success
            ? pendingOrdersResponse.orders
            : null,
        });
      }
    })
    .catch((error) => {
      console.error("[ORDERS] Error refreshing orders:", error);
      if (callback) {
        callback(null);
      }
    });
};
