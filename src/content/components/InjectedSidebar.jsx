// src/index.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import InjectedSidebarButtons from "./InjectedSidebarButtons";
import ChatHeaderHover from "./ChatHeaderHover";
import ChatListEnhancer from "./ChatListEnhancer";
import TopToolbar from "./TopToolbar";

import "../App.css"; // Adjust path as needed

console.log("🚀 Whatsapofy content script loaded");

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

const TOOLBAR_HEIGHT = "48px";
const SIDEBAR_WIDTH = "400px"; // Define sidebar width once

// --- Sidebar Control State (GLOBAL to this content script) ---
let isSidebarOpen = false;
let sidebarRoot = null; // Store the React root for the sidebar
let mainAppContent = null; // Reference to the main WhatsApp content div

// Helper: Extract contact info from chat panel
function extractContactInfo() {
  const chatPanel = document.querySelector('div[role="main"]');
  if (!chatPanel) return {};
  // Get header element by class (from your DOM)
  const header = chatPanel.querySelector("header");
  let name = "";
  let profileImg = "";
  let phone = "";
  let about = "";
  if (header) {
    // Name: look for span with class containing x1iyjqo2 (from your DOM)
    const nameEl = header.querySelector("span.x1iyjqo2");
    if (nameEl) name = nameEl.textContent;
    // Profile image: look for img inside header
    const imgEl = header.querySelector("img");
    if (imgEl) profileImg = imgEl.src;
    // About/phone: fallback to searching for text in header
    // About: look for div/span with aria-label or long text
    const aboutEl = Array.from(
      header.querySelectorAll("div[aria-label], span[aria-label], div, span")
    ).find(
      (el) =>
        el.textContent && el.textContent.length > 0 && el.textContent !== name
    );
    if (aboutEl) about = aboutEl.textContent;
    // Phone: look for phone number pattern in header
    const phoneEl = Array.from(header.querySelectorAll("span, div")).find(
      (el) => el.textContent.match(/\+?\d[\d\s-]{7,}/)
    );
    if (phoneEl) phone = phoneEl.textContent;
  }
  window.whatsappContactInfo = { name, profileImg, phone, about };
}

// Observe chat list for active chat changes and extract contact info
function observeActiveChatChange() {
  const chatList = document.querySelector('div[role="grid"]'); // WhatsApp chat list
  const chatPanel = document.querySelector('div[role="main"]');
  if (!chatList || !chatPanel) return;
  let lastChatTitle = "";
  const config = { childList: true, subtree: true };
  const callback = () => {
    // Get current chat title
    const nameEl = chatPanel.querySelector("header span[title]");
    const chatTitle = nameEl ? nameEl.textContent : "";
    if (chatTitle && chatTitle !== lastChatTitle) {
      lastChatTitle = chatTitle;
      extractContactInfo();
    }
  };
  const observer = new MutationObserver(callback);
  observer.observe(chatPanel, config);
  observer.observe(chatList, config);
  // Initial call
  callback();
}

// Call observer setup when sidebar is injected
observeActiveChatChange();

// Function to toggle sidebar visibility and adjust WhatsApp UI
window.toggleWhatsappSidebar = (open) => {
  isSidebarOpen = typeof open === "boolean" ? open : !isSidebarOpen;
  console.log(`Toggling sidebar: ${isSidebarOpen ? "Open" : "Closed"}`);

  if (!mainAppContent) {
    console.error("Main WhatsApp content container not found yet!");
    return;
  }

  const sidebarContainer = document.getElementById("whatsapp-sidebar-root");

  if (isSidebarOpen) {
    // Open sidebar
    if (!sidebarContainer) {
      // Create and append sidebar if it doesn't exist
      const newSidebarContainer = document.createElement("div");
      newSidebarContainer.id = "whatsapp-sidebar-root";
      Object.assign(newSidebarContainer.style, {
        position: "fixed", // Fixed to viewport, not parent
        right: "0",
        top: TOOLBAR_HEIGHT, // Start below the top toolbar
        height: `calc(100% - ${TOOLBAR_HEIGHT})`, // Fill below the toolbar
        width: SIDEBAR_WIDTH,
        backgroundColor: "#f7f7f7",
        boxShadow: "-2px 0 5px rgba(0,0,0,0.1)",
        zIndex: "9999", // High z-index to ensure visibility
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      });
      mainAppContent.appendChild(newSidebarContainer);
      sidebarRoot = createRoot(newSidebarContainer);
      // The sidebar React component should be imported and rendered from index.jsx, not here
      // You can expose a function to render the sidebar, or call it from index.jsx
      // For now, leave this line commented out:
      // sidebarRoot.render(<InjectedSidebarContent />);
      console.log("✅ Sidebar container created and rendered.");
    } else {
      sidebarContainer.style.display = "flex"; // Show it if it exists
    }

    const mainChatArea = document.querySelector(
      "div.app-wrapper-web > div.app-wrapper-web-container"
    ); // This is a common pattern for the main chat area
    // Or inspect the element in the screenshot: the div containing the chat list and the chat panel.

    if (mainChatArea) {
      // From common WhatsApp Web DOM structures, this is often the `div` that is a direct child of `#app` and has a `flex` display.
      const appLayoutContainer = document.querySelector(
        "div#app > div.x78zum5.xdt5ytf.x5yr21d"
      ); // This was your old whatsappMainBodyContainerSelector, it often wraps both panels.

      if (appLayoutContainer) {
        // Option 1: Adjust flex-basis of existing panels
        // This is harder because WhatsApp's internal flex properties might conflict.

        // Option 2: Wrap the existing content and apply a new flex container.
        // This is what we'll attempt. Find the element that is the direct parent of the chat list and chat content.
        const whatsappMainContentWrapper = document.querySelector(
          "div.x78zum5.xdt5ytf.x5yr21d"
        ); // The container holding left and right panels

        // No need to adjust marginRight; sidebar is fixed and overlays content
        // This prevents the top toolbar from shrinking
        console.log(
          "✅ Sidebar opened (no main content margin adjustment needed)."
        );
      } else {
        console.warn(
          "Could not find the main app layout container to adjust for sidebar."
        );
      }
    } else {
      console.warn("Could not find the WhatsApp main chat area to adjust.");
    }
  } else {
    // Close sidebar
    if (sidebarContainer) {
      sidebarContainer.style.display = "none";
      console.log("✅ Sidebar hidden.");
    }

    // Restore main content width
    // No need to restore marginRight; sidebar is fixed
    console.log(
      "✅ Main WhatsApp content remains full width (no margin adjustment needed)."
    );
  }
};

// Inject Top Toolbar
function injectTopToolbarIntoWhatsAppBody() {
  // ... (Your existing TopToolbar injection code remains the same) ...
  if (document.getElementById("whatsapp-top-toolbar-root")) {
    console.log("⚠️ Top Toolbar already injected. Skipping injection.");
    return;
  }

  const whatsappMainBodyContainerSelector = "div.x78zum5.xdt5ytf.x5yr21d"; // This is a good candidate for the main app layout

  waitForElement(
    whatsappMainBodyContainerSelector,
    (whatsappMainBodyContainer) => {
      mainAppContent = whatsappMainBodyContainer; // Store reference to this crucial element
      console.log(
        "Attempting to inject Top Toolbar into WhatsApp main body container..."
      );

      const toolbarContainer = document.createElement("div");
      toolbarContainer.id = "whatsapp-top-toolbar-root";

      Object.assign(toolbarContainer.style, {
        height: TOOLBAR_HEIGHT,
        marginRight: SIDEBAR_WIDTH,
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: "white",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        borderBottom: "1px solid #e2e8f0",
      });

      // Prepend toolbar and ensure mainAppContent is positioned for sidebar
      whatsappMainBodyContainer.prepend(toolbarContainer);

      console.log(
        "✅ Top Toolbar container created and prepended into WhatsApp main body container."
      );

      const root = createRoot(toolbarContainer);
      root.render(<TopToolbar />);
      console.log("✅ TopToolbar mounted as part of WhatsApp Web's flow.");

      console.log(
        "ℹ️ No explicit padding adjustment needed for main content as toolbar is prepended internally."
      );
    }
  );
}

injectTopToolbarIntoWhatsAppBody();

waitForElement(
  'header[data-tab="2"] > div > div[style="flex-grow: 1;"]',
  (flexGrowParentDiv) => {
    if (document.getElementById("whatsapp-leftbar-buttons-root")) {
      console.log("⚠️ Sidebar buttons already injected. Skipping injection.");
      return;
    }

    const hrElement = flexGrowParentDiv.querySelector("hr.xjm9jq1");

    const container = document.createElement("div");
    container.id = "whatsapp-leftbar-buttons-root";
    Object.assign(container.style, {
      marginTop: "8px",
      marginBottom: "8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "4px",
    });

    if (hrElement && hrElement.parentNode === flexGrowParentDiv) {
      flexGrowParentDiv.insertBefore(container, hrElement);
      console.log("✅ Injected sidebar buttons inserted before HR element.");
    } else {
      flexGrowParentDiv.appendChild(container);
      console.warn(
        "⚠️ HR element for sidebar buttons not found or not in expected position. Appending to end."
      );
      console.warn(
        "Please inspect WhatsApp Web HTML for the correct HR element selector for precise placement."
      );
    }

    const root = createRoot(container);
    // root.render(
    //   <InjectedSidebarButtons onToggleSidebar={window.toggleWhatsappSidebar} />
    // );
    console.log("✅ InjectedSidebarButtons mounted into left navbar.");
  }
);

// Inject ChatHeaderHover
// ... (Your existing ChatHeaderHover injection code remains the same) ...
waitForElement("body", (bodyElement) => {
  if (document.getElementById("whasapofy-chat-hover-root")) {
    console.log("⚠️ ChatHeaderHover already injected. Skipping injection.");
    return;
  }

  const chatHoverContainer = document.createElement("div");
  chatHoverContainer.id = "whasapofy-chat-hover-root";
  bodyElement.appendChild(chatHoverContainer);

  console.log("ChatHeaderHover container created and appended.");

  const root = createRoot(chatHoverContainer);
  root.render(<ChatHeaderHover />);
  console.log("✅ ChatHeaderHover mounted on WhatsApp Web.");
});

// Inject ChatListEnhancer
// ... (Your existing ChatListEnhancer injection code remains the same) ...
waitForElement("body", (bodyElement) => {
  if (document.getElementById("whatsopify-chat-enhancer-root")) return;

  const enhancerContainer = document.createElement("div");
  enhancerContainer.id = "whatsopify-chat-enhancer-root";
  bodyElement.appendChild(enhancerContainer);

  const root = createRoot(enhancerContainer);
  root.render(<ChatListEnhancer />);
});

// New: Initial setup for sidebar
waitForElement("div.x78zum5.xdt5ytf.x5yr21d", (appContainer) => {
  mainAppContent = appContainer; // Store reference to the main container
  console.log(
    "Main WhatsApp content container identified for sidebar management."
  );

  // Initially open the sidebar by default
  window.toggleWhatsappSidebar(true);

  // Keep the observer for resilience, but it will now react to external calls to toggleWhatsappSidebar
  const sidebarObserver = new MutationObserver((mutations) => {
    // This observer is now more about ensuring our mainAppContent is there and our sidebar is in the correct state
    if (!document.getElementById("whatsapp-sidebar-root") && isSidebarOpen) {
      console.log("⚠️ Sidebar element missing, re-injecting...");
      window.toggleWhatsappSidebar(true); // Attempt to re-open if it was supposed to be open
    } else if (
      document.getElementById("whatsapp-sidebar-root") &&
      !isSidebarOpen
    ) {
      // If sidebar element exists but state says it should be closed, hide it
      document.getElementById("whatsapp-sidebar-root").style.display = "none";
    }
  });

  sidebarObserver.observe(appContainer, { childList: true, subtree: true });
  console.log(
    "✅ Sidebar layout observer started to monitor WhatsApp main content."
  );
});
