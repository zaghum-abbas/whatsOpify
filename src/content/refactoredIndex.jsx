// Refactored main content script for WhatsApp Web Extension
import React from "react";
import { createRoot } from "react-dom/client";

// Core imports
import { UI_CONSTANTS, WHATSAPP_SELECTORS } from "../core/constants/index.js";
import {
  createModalRoot,
  waitForElement,
  getActiveChatDetails,
} from "../core/utils/domUtils.js";
import { getCurrentTheme, injectThemeCSS } from "../core/utils/themeUtils.js";

// Component imports
import InjectedSidebarButtons from "./components/InjectedSidebarButtons";
import TopToolbar from "./components/TopToolbar";
import ChatHeaderHover from "./components/ChatHeaderHover";
import ChatListEnhancer from "./components/ChatListEnhancer";
import InjectedSidebarContent from "./components/InjectedSidebarContent";
import LoginModal from "./components/LoginModal";

// Service imports
import authService from "../services/authService.js";
import dataService from "../services/dataService.js";

// Styles
import "./App.css";

console.log("🚀 Refactored Whatsapify content script loaded");

// Global state management
class ExtensionManager {
  constructor() {
    this.isSidebarOpen = false;
    this.sidebarRoot = null;
    this.mainAppContent = null;
    this.lastActiveChatId = null;
    this.sidebarProps = {
      contact: {},
      catalog: [],
      stores: [],
      notes: "",
      onNotesChange: null,
      userInfo: null,
      showOrderForm: false,
      onOrderFormToggle: null,
    };

    this.init();
  }

  async init() {
    try {
      // Create modal root
      this.modalRoot = createModalRoot();

      // Inject theme CSS
      injectThemeCSS();

      // Setup WhatsApp Web integration
      await this.setupWhatsAppIntegration();

      // Setup event listeners
      this.setupEventListeners();

      console.log("✅ Extension manager initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing extension manager:", error);
    }
  }

  async setupWhatsAppIntegration() {
    // Wait for WhatsApp to load
    await waitForElement(WHATSAPP_SELECTORS.MAIN_CONTENT);

    // Get main content reference
    this.mainAppContent = document.querySelector(
      WHATSAPP_SELECTORS.MAIN_CONTENT
    );

    if (!this.mainAppContent) {
      throw new Error("Could not find WhatsApp main content area");
    }

    // Setup sidebar
    this.setupSidebar();

    // Setup toolbar
    this.setupToolbar();

    // Setup chat enhancements
    this.setupChatEnhancements();
  }

  setupSidebar() {
    // Create sidebar container
    const sidebarContainer = document.createElement("div");
    sidebarContainer.id = "whatsapp-extension-sidebar";
    sidebarContainer.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: ${UI_CONSTANTS.SIDEBAR_WIDTH};
      height: 100vh;
      background: var(--theme-card, #fff);
      border-left: 1px solid var(--theme-border, #e2e8f0);
      z-index: 9999;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      overflow-y: auto;
    `;

    document.body.appendChild(sidebarContainer);
    this.sidebarContainer = sidebarContainer;

    // Create React root for sidebar
    this.sidebarRoot = createRoot(sidebarContainer);
  }

  setupToolbar() {
    // Wait for chat header and inject toolbar
    waitForElement(WHATSAPP_SELECTORS.CHAT_HEADER, (header) => {
      const toolbarContainer = document.createElement("div");
      toolbarContainer.id = "whatsapp-extension-toolbar";
      header.appendChild(toolbarContainer);

      const toolbarRoot = createRoot(toolbarContainer);
      toolbarRoot.render(<TopToolbar />);
    });
  }

  setupChatEnhancements() {
    // Setup chat list enhancer
    waitForElement(WHATSAPP_SELECTORS.CHAT_LIST, (chatList) => {
      const enhancerContainer = document.createElement("div");
      chatList.appendChild(enhancerContainer);

      const enhancerRoot = createRoot(enhancerContainer);
      enhancerRoot.render(<ChatListEnhancer />);
    });

    // Setup chat header hover
    waitForElement(WHATSAPP_SELECTORS.CHAT_HEADER, (header) => {
      const hoverContainer = document.createElement("div");
      hoverContainer.id = "whatsapp-extension-hover";
      header.appendChild(hoverContainer);

      const hoverRoot = createRoot(hoverContainer);
      hoverRoot.render(<ChatHeaderHover />);
    });
  }

  setupEventListeners() {
    // Listen for active chat changes
    this.observeActiveChat();

    // Listen for theme changes
    this.setupThemeWatcher();

    // Listen for auth state changes
    this.setupAuthWatcher();
  }

  observeActiveChat() {
    const chatHeader = document.querySelector(WHATSAPP_SELECTORS.CHAT_HEADER);
    if (!chatHeader) return;

    const observer = new MutationObserver(async () => {
      const currentChat = await getActiveChatDetails();
      if (currentChat.id !== this.lastActiveChatId) {
        this.lastActiveChatId = currentChat.id;
        this.updateSidebarForContact(currentChat);
      }
    });

    observer.observe(chatHeader, {
      childList: true,
      subtree: true,
    });
  }

  setupThemeWatcher() {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => {
      injectThemeCSS();
      this.updateSidebarTheme();
    };

    mediaQuery.addEventListener("change", handleThemeChange);

    // Also watch for WhatsApp's theme changes
    const observer = new MutationObserver(() => {
      handleThemeChange();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  setupAuthWatcher() {
    authService.subscribe((authState) => {
      if (authState.isAuthenticated) {
        this.loadUserData();
      } else {
        this.clearUserData();
      }
    });
  }

  async loadUserData() {
    try {
      // Load user data in parallel
      const [products, stores, userInfo] = await Promise.allSettled([
        dataService.fetchProducts(),
        dataService.fetchStores(),
        dataService.fetchUserInfo(),
      ]);

      this.sidebarProps = {
        ...this.sidebarProps,
        catalog: products.status === "fulfilled" ? products.value : [],
        stores: stores.status === "fulfilled" ? stores.value : [],
        userInfo: userInfo.status === "fulfilled" ? userInfo.value : null,
      };

      this.updateSidebar();
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }

  clearUserData() {
    this.sidebarProps = {
      ...this.sidebarProps,
      catalog: [],
      stores: [],
      userInfo: null,
    };
    this.updateSidebar();
  }

  async updateSidebarForContact(contact) {
    this.sidebarProps = {
      ...this.sidebarProps,
      contact,
      catalog: this.getCatalogForContact(contact),
    };
    this.updateSidebar();
  }

  getCatalogForContact(contact) {
    const products = dataService.getCachedData("products") || [];
    // Add filtering logic here based on contact
    return products;
  }

  updateSidebar() {
    if (this.sidebarRoot) {
      this.sidebarRoot.render(
        <InjectedSidebarContent {...this.sidebarProps} />
      );
    }
  }

  updateSidebarTheme() {
    if (this.sidebarContainer) {
      const theme = getCurrentTheme();
      this.sidebarContainer.style.background = theme.card;
      this.sidebarContainer.style.borderLeftColor = theme.border;
    }
  }

  toggleSidebar(open = !this.isSidebarOpen) {
    this.isSidebarOpen = open;

    if (this.sidebarContainer) {
      if (open) {
        this.sidebarContainer.style.transform = "translateX(0)";
        this.adjustMainContent(true);
      } else {
        this.sidebarContainer.style.transform = "translateX(100%)";
        this.adjustMainContent(false);
      }
    }
  }

  adjustMainContent(sidebarOpen) {
    if (this.mainAppContent) {
      if (sidebarOpen) {
        this.mainAppContent.style.marginRight = UI_CONSTANTS.SIDEBAR_WIDTH;
      } else {
        this.mainAppContent.style.marginRight = "0";
      }
    }
  }
}

// Global functions for external access
window.toggleWhatsappSidebar = (open) => {
  if (window.extensionManager) {
    window.extensionManager.toggleSidebar(open);
  }
};

window.getActiveChatDetails = getActiveChatDetails;

// Test functions
window.testExtension = () => {
  console.log("Extension state:", {
    isSidebarOpen: window.extensionManager?.isSidebarOpen,
    authState: authService.isAuthenticated(),
    productsCount: dataService.getCachedData("products")?.length || 0,
    storesCount: dataService.getCachedData("stores")?.length || 0,
  });
};

// Initialize extension
const extensionManager = new ExtensionManager();
window.extensionManager = extensionManager;

// Export for module usage
export default extensionManager;

