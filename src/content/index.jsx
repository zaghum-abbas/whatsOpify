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
import "./App.css"; // Your main CSS file

import { requireAuth, useAuthState } from "./components/authMiddleware.jsx";
import LoginModal from "./components/LoginModal";
import { getToken } from "../core/utils/helperFunctions.js";

console.log("🚀 Whatsapofy content script loaded at 12:30 PM PKT, 17/07/2025");

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

// --- Sidebar Control State (GLOBAL to this content script) ---
let isSidebarOpen = true;
let sidebarRoot = null; // Store the React root for the sidebar
let mainAppContent = null; // Reference to the main WhatsApp content div that needs resizing
let sidebarMode = "default"; // "default" or "chat"
let sidebarProps = {
  contact: {},
  catalog: [],
  stores: [],
  notes: "",
  onNotesChange: null,
  userInfo: null,
  showOrderForm: false,
  onOrderFormToggle: null,
};
let lastActiveChatId = null;

// Function to switch sidebar mode
const switchSidebarMode = (mode) => {
  sidebarMode = mode;
  console.log(`🔄 Sidebar mode switched to: ${mode}`);

  if (sidebarRoot && isSidebarOpen) {
    renderSidebar();
  }
};

// Function to render the appropriate sidebar based on mode
const renderSidebar = () => {
  if (!sidebarRoot) return;

  if (sidebarMode === "default") {
    console.log("🎨 Rendering Default Sidebar");
    sidebarRoot.render(<DefaultSidebar {...sidebarProps} />);
  } else if (sidebarMode === "chat") {
    console.log("🎨 Rendering Chat Sidebar");
    sidebarRoot.render(<ChatSidebar {...sidebarProps} />);
  }
};

const getActiveChatDetails = async () => {
  console.log("🔍 Starting contact extraction...");

  let name = "";
  let phone = "";

  const nameSelectors = [
    "header span[title]",
    "header div[role='button'] span[dir='auto']",
    "header h2[title]",
  ];

  // 🧩 Step 1 — Find and click contact name
  for (const selector of nameSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent.trim().length > 0) {
      name = element.textContent.trim();
      console.log("📝 Found name:", name);

      element.click(); // open contact info
      break;
    }
  }

  if (!name) {
    console.warn("⚠️ Could not find name element!");
    return { name: "", phone: "" };
  }

  // 🕐 Step 2 — Wait for the contact panel to load
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const elementsToHide = document.querySelectorAll(
    "div._aig-._as6h.x9f619.x1n2onr6.x5yr21d.x6ikm8r.x10wlt62.x17dzmu4.x1i1dayz.x2ipvbc.x1w8yi2h.xpilrb4.x1t7ytsu.x1m2ixmg.x1c4vz4f.x2lah0s.x1oy9qf3.xwfak60.x5hsz1j.x17dq4o0.x10e4vud"
  );

  if (elementsToHide.length > 0) {
    elementsToHide.forEach((el) => {
      el.style.display = "none";
    });
    console.log(
      `🙈 Hidden ${elementsToHide.length} element(s) with given classes`
    );
  } else {
    console.warn("⚠️ No matching element found to hide");
  }

  const phoneElement = Array.from(
    document.querySelectorAll("[dir='auto'].copyable-text")
  ).find((el) => {
    const text = el.innerText.trim().replace(/\s+/g, "");
    return /^\+?\d{7,}$/.test(text);
  });

  if (phoneElement) {
    phone = phoneElement.innerText.trim().replace(/\s+/g, "");
    console.log("📞 Found phone:", phone);
  } else {
    console.warn("⚠️ Phone number not found!");
  }

  // 📋 Step 6 — Return final result
  const result = { name, phone };
  console.log("✅ Final extracted contact details:", result);
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
            window.whatsapofyProducts.storeId =
              storesCache[0]._id ||
              storesCache[0].id ||
              storesCache[0].storeId ||
              storesCache[0].store_id;
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

    // Use background script for API call with token authentication
    const response = await chrome.runtime.sendMessage({
      action: "FETCH_STORES",
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
        window.whatsapofyProducts.storeId =
          storesCache[0]._id ||
          storesCache[0].id ||
          storesCache[0].storeId ||
          storesCache[0].store_id;
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
    console.log(
      "[PRODUCTS] Fetching user-specific products from API using session-based auth..."
    );

    // Ensure stores are loaded before attempting to filter products by storeId
    if (storesCache === null && !storesLoading) {
      console.log(
        "[PRODUCTS] Stores cache is null and not loading, fetching stores first..."
      );
      await new Promise((resolve) => {
        getStoresForUser(() => resolve());
      });
    } else if (storesLoading) {
      console.log(
        "[PRODUCTS] Stores are currently loading, waiting for them..."
      );
      await new Promise((resolve) => {
        storesListeners.push(() => resolve());
      });
    }

    const userStoreIds = storesCache
      ? storesCache
          .map(
            (store) => store._id || store.id || store.storeId || store.store_id
          )
          .filter(Boolean)
      : [];

    let allUserProducts = [];

    try {
      const response = await chrome.runtime.sendMessage({
        action: "FETCH_PRODUCTS",
        token: getToken(),
      });

      console.log("[PRODUCTS] Response:", response);

      if (response.success) {
        console.log(
          "[PRODUCTS] ✅ Products fetched successfully via background script"
        );
        let productsFromApiResponse = [];

        // Handle different possible response structures
        if (Array.isArray(response.products)) {
          productsFromApiResponse = response.products;
        } else if (
          response.products &&
          response.products.products &&
          Array.isArray(response.products.products)
        ) {
          productsFromApiResponse = response.products.products;
        } else if (
          response.products &&
          response.products.data &&
          Array.isArray(response.products.data)
        ) {
          productsFromApiResponse = response.products.data;
        } else if (
          response.products &&
          response.products.result &&
          Array.isArray(response.products.result)
        ) {
          productsFromApiResponse = response.products.result;
        } else {
          console.warn(
            "[PRODUCTS] ⚠️ Unexpected products response structure:",
            response.products
          );
          productsFromApiResponse = [];
        }

        // Filter products by user's store IDs if available
        if (productsFromApiResponse.length > 0) {
          if (userStoreIds.length > 0) {
            allUserProducts = productsFromApiResponse.filter((p) => {
              const productStoreId = p.storeId || p.store_id || p._storeId;
              return userStoreIds.includes(productStoreId);
            });
            console.log(
              `[PRODUCTS] 🔍 Filtered ${allUserProducts.length} products for user's stores`
            );
          } else {
            // If no specific store IDs, use all fetched products
            allUserProducts = productsFromApiResponse;
            console.log(
              `[PRODUCTS] 📦 Using all ${allUserProducts.length} products (no store filtering)`
            );
          }
        } else {
          allUserProducts = [];
          console.log("[PRODUCTS] ⚠️ No products found in API response");
        }
      } else {
        console.error(
          `[PRODUCTS] ❌ Background script fetch failed:`,
          response.error
        );
        allUserProducts = [];
      }
    } catch (err) {
      // Log network errors during fetch
      console.error(`[PRODUCTS] ❌ Error calling background script:`, err);
      allUserProducts = [];
    }

    productsCache = allUserProducts;

    console.log(
      `[PRODUCTS] 📊 Final result: ${productsCache.length} products processed`
    );

    productsLoading = false;
    // Notify all waiting listeners with the newly populated productsCache
    productsListeners.forEach((fn) => fn(productsCache)); // Pass data to listeners
    productsListeners = []; // Clear listeners after notifying
  } catch (e) {
    // Catch any errors during the entire fetch process
    console.error("[PRODUCTS] ❌ Error fetching products:", e);
    productsError = e;
    productsLoading = false;
    productsCache = [];
    productsListeners.forEach((fn) => fn(productsCache)); // Pass data to listeners
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

  // Watch for clicks on chat list items
  const chatListContainer = document.querySelector("#pane-side");
  if (chatListContainer) {
    console.log("✅ Found chat list container, setting up click listener");

    chatListContainer.addEventListener("click", async (event) => {
      // Check if the click was on a chat item
      const chatItem = event.target.closest(
        '[data-testid="cell-frame-container"], div[role="listitem"], div[tabindex="0"]'
      );
      if (chatItem) {
        console.log(" ️ Chat item clicked, waiting for chat to load...");

        // Wait a bit for the chat to load, then extract contact info
        setTimeout(async () => {
          console.log("🔄 Extracting contact details for selected chat...");
          const contact = await getActiveChatDetails();
          console.log("📋 Contact extraction result:", contact);

          // Check if we have a valid contact (not null and has some data)
          if (contact && (contact.name || contact.phone || contact.about)) {
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
  } else {
    console.warn(
      "⚠️ Chat list container not found, falling back to mutation observer"
    );

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
  // Allow sidebar to open without authentication - show login modal only when user tries to use features that require auth
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
      // Initialize with default mode and empty contact data
      sidebarMode = "default";
      sidebarProps.contact = { name: "", phone: "", about: "" };

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
      Object.assign(sidebarContainer.style, {
        position: "fixed",
        right: "0",
        top: TOOLBAR_HEIGHT, // Start below the toolbar
        height: `calc(100% - ${TOOLBAR_HEIGHT})`, // Full height minus toolbar height
        width: SIDEBAR_WIDTH,
        backgroundColor: "#f7f7f7",
        boxShadow: "-2px 0 5px rgba(0,0,0,0.1)",
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
      await renderSidebarWithData();
      console.log("✅ Sidebar container shown and updated.");
    }

    mainAppContent.style.marginRight = SIDEBAR_WIDTH;
    console.log(`✅ Main WhatsApp content shifted left by ${SIDEBAR_WIDTH}.`);
  } else {
    // Close sidebar
    if (sidebarContainer) {
      sidebarContainer.style.display = "none";
      console.log("✅ Sidebar hidden.");
    }

    // Restore main content width by removing the right margin
    mainAppContent.style.marginRight = "0px";
    console.log("✅ Main WhatsApp content restored to full width.");
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
      whatsappMainBodyContainer.style.paddingTop = TOOLBAR_HEIGHT;

      // Initialize sidebar state to open by default
      window.toggleWhatsappSidebar(true);
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
    // Pass the globally exposed toggle function as a prop
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

// Call all injection functions
injectTopToolbarIntoWhatsAppBody();
injectSidebarButtons();
injectChatHeaderHover();
injectChatListEnhancer();

// Always observe chat changes to update sidebar contact info
waitForElement('div[role="main"]', () => {
  observeActiveChat();
});

// Function to download image from URL and convert to File object
async function downloadImageAsFile(imageUrl, filename) {
  try {
    console.log("[IMAGE] Downloading image from:", imageUrl);

    // Use CORS proxy for external images
    const corsProxy = "https://corsproxy.io/?";
    const proxyUrl = corsProxy + encodeURIComponent(imageUrl);

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    const file = new File([blob], filename, {
      type: blob.type || "image/jpeg",
    });

    console.log("[IMAGE] Image downloaded successfully:", file);
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

    // Find the attachment button (paperclip icon)
    const attachButton =
      document.querySelector('[data-testid="clip"]') ||
      document.querySelector('button[aria-label*="Attach"]') ||
      document.querySelector('span[data-testid="clip"]') ||
      document.querySelector('[title*="Attach"]');

    if (!attachButton) {
      console.error("[IMAGE] Attachment button not found");
      return false;
    }

    console.log("[IMAGE] Found attachment button, clicking...");
    attachButton.click();

    // Wait for attachment menu to appear
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Find the photo/image option
    const photoButton =
      document.querySelector('[data-testid="mi-attach-photo"]') ||
      document.querySelector('input[accept*="image"]') ||
      document.querySelector('button[aria-label*="Photos"]') ||
      document.querySelector('[title*="Photos"]');

    if (!photoButton) {
      console.error("[IMAGE] Photo button not found");
      return false;
    }

    console.log("[IMAGE] Found photo button");

    // If it's an input element, directly set the file
    if (photoButton.tagName === "INPUT") {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(imageFile);
      photoButton.files = dataTransfer.files;

      const changeEvent = new Event("change", { bubbles: true });
      photoButton.dispatchEvent(changeEvent);

      console.log("[IMAGE] Image file set to input");
      return true;
    } else {
      // If it's a button, click it and then handle file input
      photoButton.click();

      // Wait for file input to appear
      await new Promise((resolve) => setTimeout(resolve, 300));

      const fileInput = document.querySelector(
        'input[type="file"][accept*="image"]'
      );
      if (fileInput) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(imageFile);
        fileInput.files = dataTransfer.files;

        const changeEvent = new Event("change", { bubbles: true });
        fileInput.dispatchEvent(changeEvent);

        console.log("[IMAGE] Image file set to file input");
        return true;
      }
    }

    return false;
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
    messageInput.click();

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
    if (productItem && productItem.image) {
      console.log(
        "[CHAT] Product has image, attempting to add image to chat..."
      );
      setTimeout(async () => {
        try {
          const filename = `${productItem.name.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          )}.jpg`;
          const imageFile = await downloadImageAsFile(
            productItem.image,
            filename
          );

          if (imageFile) {
            const imageAdded = await addImageToChat(imageFile);
            if (imageAdded) {
              console.log(
                "[CHAT] ✅ Product image added to chat successfully!"
              );
            } else {
              console.warn("[CHAT] Failed to add image to chat");
            }
          } else {
            console.warn("[CHAT] Failed to download product image");
          }
        } catch (error) {
          console.error("[CHAT] Error handling product image:", error);
        }
      }, 1000); // Wait 1 second after text is added
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
fetchUserInfo(); // Start fetching user info
fetchStoresForUser(); // Start fetching stores
// Products fetch will be triggered by getProducts when needed (e.g., by sidebar or modal)

// --- Global Order Form Control ---
window.showOrderForm = (show) => {
  console.log(`Order form ${show ? "opened" : "closed"}`);
  sidebarProps.showOrderForm = show;
  if (sidebarRoot && sidebarProps.onOrderFormToggle) {
    sidebarProps.onOrderFormToggle(show);
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
  }
  switchSidebarMode("chat");
};

window.getCurrentSidebarMode = () => {
  return sidebarMode;
};

// --- Global API Exposure ---
window.getProducts = getProducts;
window.getUserInfo = getUserInfo;
window.getStoresForUser = getStoresForUser;

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
