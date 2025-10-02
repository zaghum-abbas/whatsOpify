// HTTP Proxy for Manifest V3 - Content Script
// This allows HTTP requests by using the page's context instead of the extension's

class HTTPProxy {
  constructor() {
    this.setupMessageListener();
  }

  setupMessageListener() {
    // Listen for messages from the extension's service worker
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "HTTP_REQUEST") {
        this.handleHTTPRequest(request, sendResponse);
        return true; // Indicates we will send a response asynchronously
      }
    });
  }

  async handleHTTPRequest(request, sendResponse) {
    try {
      const { url, options } = request;

      console.log("[HTTP_PROXY] Making HTTP request to:", url);

      // Use fetch from the page context (not extension context)
      const response = await fetch(url, {
        ...options,
        // Ensure we're making the request from the page context
        mode: "cors",
        credentials: "omit",
      });

      const responseData = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };

      // Try to get response body
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          responseData.body = await response.json();
        } else {
          responseData.body = await response.text();
        }
      } catch (bodyError) {
        console.warn("[HTTP_PROXY] Could not parse response body:", bodyError);
        responseData.body = null;
      }

      sendResponse({ success: true, data: responseData });
    } catch (error) {
      console.error("[HTTP_PROXY] Request failed:", error);
      sendResponse({
        success: false,
        error: error.message,
      });
    }
  }
}

// Initialize the HTTP proxy
new HTTPProxy();
