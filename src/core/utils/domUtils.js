// DOM utility functions for the WhatsApp Web Extension
import { WHATSAPP_SELECTORS } from "../constants/index.js";

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector
 * @param {Function} callback - Callback function when element is found
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Element>} The found element
 */
export function waitForElement(selector, callback, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);

    if (element) {
      console.log(`✅ Element found immediately for selector: "${selector}"`);
      if (callback) callback(element);
      resolve(element);
      return;
    }

    console.log(`⏳ Waiting for element with selector: "${selector}"`);

    const observer = new MutationObserver((mutations, obs) => {
      const foundElement = document.querySelector(selector);
      if (foundElement) {
        obs.disconnect();
        console.log(`✅ Element found by observer for selector: "${selector}"`);
        if (callback) callback(foundElement);
        resolve(foundElement);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Set timeout
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found within ${timeout}ms: ${selector}`));
    }, timeout);
  });
}

/**
 * Wait for multiple elements to appear
 * @param {Array<string>} selectors - Array of CSS selectors
 * @param {Function} callback - Callback function when all elements are found
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Array<Element>>} Array of found elements
 */
export function waitForElements(selectors, callback, timeout = 10000) {
  return Promise.all(
    selectors.map((selector) => waitForElement(selector, null, timeout))
  ).then((elements) => {
    if (callback) callback(elements);
    return elements;
  });
}

/**
 * Get active chat details from WhatsApp Web
 * @returns {Promise<Object>} Chat details
 */
export async function getActiveChatDetails() {
  try {
    const chatHeader = await waitForElement(WHATSAPP_SELECTORS.CHAT_HEADER);

    if (!chatHeader) {
      throw new Error("Chat header not found");
    }

    // Extract contact name
    const nameElement = chatHeader.querySelector(
      '[data-testid="conversation-title"]'
    );
    const contactName = nameElement
      ? nameElement.textContent.trim()
      : "Unknown";

    const phoneElement = chatHeader.querySelector('[title*="+"]');
    const phoneNumber = phoneElement
      ? phoneElement.getAttribute("title")
      : null;

    // Extract profile picture
    const profileElement = chatHeader.querySelector(
      '[data-testid="conversation-header-avatar"] img'
    );
    const profilePicture = profileElement ? profileElement.src : null;

    // Check if it's a group chat
    const isGroup =
      chatHeader.querySelector('[data-testid="conversation-header-avatar"]')
        ?.children.length > 1;

    return {
      id: `${contactName}_${Date.now()}`,
      name: contactName,
      phoneNumber,
      profilePicture,
      isGroup,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("[DOM_UTILS] Error getting active chat details:", error);
    return {
      id: "unknown",
      name: "Unknown Contact",
      phoneNumber: null,
      profilePicture: null,
      isGroup: false,
      timestamp: Date.now(),
    };
  }
}

/**
 * Get WhatsApp main content area
 * @returns {Element|null} Main content element
 */
export function getMainContent() {
  return document.querySelector(WHATSAPP_SELECTORS.MAIN_CONTENT);
}

/**
 * Get WhatsApp chat list
 * @returns {Element|null} Chat list element
 */
export function getChatList() {
  return document.querySelector(WHATSAPP_SELECTORS.CHAT_LIST);
}

/**
 * Get message input element
 * @returns {Element|null} Message input element
 */
export function getMessageInput() {
  return document.querySelector(WHATSAPP_SELECTORS.MESSAGE_INPUT);
}

/**
 * Get send button element
 * @returns {Element|null} Send button element
 */
export function getSendButton() {
  return document.querySelector(WHATSAPP_SELECTORS.SEND_BUTTON);
}

/**
 * Send a message to WhatsApp
 * @param {string} message - Message to send
 * @returns {Promise<boolean>} Whether message was sent successfully
 */
export async function sendMessage(message) {
  try {
    const input = getMessageInput();
    const sendButton = getSendButton();

    if (!input || !sendButton) {
      throw new Error("Message input or send button not found");
    }

    // Focus input
    input.focus();

    // Clear existing content
    input.textContent = "";

    // Set message content
    input.textContent = message;

    // Trigger input event
    input.dispatchEvent(new Event("input", { bubbles: true }));

    // Wait a bit for WhatsApp to process
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Click send button
    sendButton.click();

    console.log("[DOM_UTILS] Message sent successfully:", message);
    return true;
  } catch (error) {
    console.error("[DOM_UTILS] Error sending message:", error);
    return false;
  }
}

/**
 * Create a modal root element
 * @param {string} id - Modal ID
 * @param {number} zIndex - Z-index value
 * @returns {Element} Modal root element
 */
export function createModalRoot(id = "whatsapp-modal-root", zIndex = 10000) {
  const existingModal = document.getElementById(id);
  if (existingModal) {
    return existingModal;
  }

  const modalRoot = document.createElement("div");
  modalRoot.id = id;
  modalRoot.style.position = "fixed";
  modalRoot.style.top = "0";
  modalRoot.style.left = "0";
  modalRoot.style.zIndex = zIndex.toString();
  modalRoot.style.pointerEvents = "none"; // Allow clicks to pass through when not needed

  document.body.appendChild(modalRoot);
  return modalRoot;
}

/**
 * Remove modal root element
 * @param {string} id - Modal ID
 */
export function removeModalRoot(id = "whatsapp-modal-root") {
  const modalRoot = document.getElementById(id);
  if (modalRoot) {
    modalRoot.remove();
  }
}

/**
 * Check if element is visible
 * @param {Element} element - Element to check
 * @returns {boolean} Whether element is visible
 */
export function isElementVisible(element) {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * Scroll element into view
 * @param {Element} element - Element to scroll to
 * @param {Object} options - Scroll options
 */
export function scrollIntoView(element, options = {}) {
  if (!element) return;

  element.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center",
    ...options,
  });
}

/**
 * Add CSS class to element
 * @param {Element} element - Target element
 * @param {string} className - Class name to add
 */
export function addClass(element, className) {
  if (element && !element.classList.contains(className)) {
    element.classList.add(className);
  }
}

/**
 * Remove CSS class from element
 * @param {Element} element - Target element
 * @param {string} className - Class name to remove
 */
export function removeClass(element, className) {
  if (element && element.classList.contains(className)) {
    element.classList.remove(className);
  }
}

/**
 * Toggle CSS class on element
 * @param {Element} element - Target element
 * @param {string} className - Class name to toggle
 * @returns {boolean} Whether class was added
 */
export function toggleClass(element, className) {
  if (!element) return false;

  const wasAdded = !element.classList.contains(className);
  element.classList.toggle(className);
  return wasAdded;
}

export default {
  waitForElement,
  waitForElements,
  getActiveChatDetails,
  getMainContent,
  getChatList,
  getMessageInput,
  getSendButton,
  sendMessage,
  createModalRoot,
  removeModalRoot,
  isElementVisible,
  scrollIntoView,
  addClass,
  removeClass,
  toggleClass,
};
