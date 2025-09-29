// public/background.js (MODIFIED to correctly handle API success response)

function handleCreateOrder(request, sender, sendResponse) {
  console.log("[BG] Order request received:", request);

  const orderApiUrl = "https://api1.shopilam.com/api/v1/orders";

  // Use enhanced cookie handling
  handleApiCallWithCookies(
    orderApiUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request.data),
    },
    sendResponse
  );

  return true; // Required for async sendResponse
}

function handleFetchOrders(request, sender, sendResponse) {
  console.log("[BG] Fetch orders request received:", request);

  const { status, page = 1, limit = 50 } = request;
  const ordersApiUrl = `https://api1.shopilam.com/api/v1/orders?status=${status}&page=${page}&limit=${limit}`;

  // Enhanced cookie handling
  handleApiCallWithCookies(
    ordersApiUrl,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    sendResponse
  );
}

// Enhanced API call handler with proper cookie management
function handleApiCallWithCookies(url, options, sendResponse) {
  console.log("[BG] Making API call with enhanced cookie handling:", url);

  // Check cookies for all relevant domains
  Promise.all([
    new Promise((resolve) =>
      chrome.cookies.getAll({ domain: "shopilam.com" }, resolve)
    ),
    new Promise((resolve) =>
      chrome.cookies.getAll({ domain: ".shopilam.com" }, resolve)
    ),
    new Promise((resolve) =>
      chrome.cookies.getAll({ domain: "api1.shopilam.com" }, resolve)
    ),
    new Promise((resolve) =>
      chrome.cookies.getAll({ domain: "www.shopilam.com" }, resolve)
    ),
  ])
    .then(([mainCookies, parentCookies, apiCookies, wwwCookies]) => {
      console.log("[BG] Main domain cookies:", mainCookies);
      console.log("[BG] Parent domain cookies:", parentCookies);
      console.log("[BG] API domain cookies:", apiCookies);
      console.log("[BG] WWW domain cookies:", wwwCookies);

      // Combine all cookies
      const allCookies = [
        ...mainCookies,
        ...parentCookies,
        ...apiCookies,
        ...wwwCookies,
      ];
      const uniqueCookies = allCookies.filter(
        (cookie, index, self) =>
          index ===
          self.findIndex(
            (c) => c.name === cookie.name && c.domain === cookie.domain
          )
      );

      console.log("[BG] All unique cookies:", uniqueCookies);

      // Check if we have session cookies
      const sessionCookies = uniqueCookies.filter(
        (cookie) =>
          cookie.name.toLowerCase().includes("session") ||
          cookie.name.toLowerCase().includes("auth") ||
          cookie.name.toLowerCase().includes("token")
      );

      console.log("[BG] Session cookies found:", sessionCookies);

      // If we have session cookies on main domain but not API domain, copy them
      if (sessionCookies.length > 0) {
        const apiHasSession = apiCookies.some(
          (cookie) =>
            cookie.name.toLowerCase().includes("session") ||
            cookie.name.toLowerCase().includes("auth")
        );

        if (!apiHasSession) {
          console.log("[BG] Copying session cookies to API domain...");
          sessionCookies.forEach((cookie) => {
            chrome.cookies.set({
              url: "https://api1.shopilam.com",
              name: cookie.name,
              value: cookie.value,
              domain: "api1.shopilam.com",
              secure: true,
              httpOnly: false,
              sameSite: "none",
              path: "/",
            });
          });
        }
      }

      // Build cookie string
      const cookieString = uniqueCookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      console.log("[BG] Cookie string:", cookieString);

      // Make the API call with enhanced options
      const fetchOptions = {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieString,
          ...options.headers,
        },
      };

      console.log("[BG] Making fetch request with options:", fetchOptions);

      fetch(url, fetchOptions)
        .then((response) => {
          return response.json().then((data) => ({
            status: response.status,
            ok: response.ok,
            data: data,
          }));
        })
        .then(({ status, ok, data }) => {
          console.log("[BG] API Response Status:", status);
          console.log("[BG] API Response Data:", data);

          if (ok) {
            console.log("[BG] API call successful:", data);
            sendResponse({
              success: true,
              ...(url.includes("orders")
                ? { orders: data }
                : { products: data }),
            });
          } else {
            const errorMessage =
              data && (data.detail || data.message)
                ? data.detail || data.message
                : `API error (Status: ${status})`;
            console.log("[BG] API call failed:", errorMessage);
            sendResponse({ success: false, error: errorMessage, data: data });
          }
        })
        .catch((error) => {
          console.error("[BG] Fetch error:", error);
          sendResponse({ success: false, error: error.message });
        });
    })
    .catch((error) => {
      console.error("[BG] Cookie handling error:", error);
      sendResponse({
        success: false,
        error: "Cookie handling failed: " + error.message,
      });
    });
}

function handleUpdateOrderStatus(request, sender, sendResponse) {
  console.log("[BG] Update order status request received:", request);

  const { orderId, status } = request;
  const updateApiUrl = `https://api1.shopilam.com/api/v1/orders/${orderId}`;

  const bodyData = {
    status: status,
  };

  // Use enhanced cookie handling
  handleApiCallWithCookies(
    updateApiUrl,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
    },
    sendResponse
  );

  return true; // Required for async sendResponse
}

function handleSendWhatsAppMessage(request, sender, sendResponse) {
  console.log("[BG] Send WhatsApp message request received:", request);

  const { phoneNumber, message } = request;

  // Open WhatsApp Web with the phone number and message
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(
    message
  )}`;

  chrome.tabs.update(
    {
      url: whatsappUrl,
      active: true,
    },
    (tab) => {
      console.log("[BG] WhatsApp opened in current tab:", tab.id);

      // Inject auto-send script after WhatsApp loads
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (messageText) => {
            console.log("[INJECTED] Auto-send script started");

            let attempts = 0;
            const maxAttempts = 10;

            const tryAutoSend = () => {
              attempts++;
              console.log(
                `[INJECTED] Auto-send attempt ${attempts}/${maxAttempts}`
              );

              // Find message input field
              const messageInput =
                document.querySelector(
                  '[data-testid="conversation-compose-box-input"]'
                ) ||
                document.querySelector('div[contenteditable="true"]') ||
                document.querySelector('[data-testid="compose-box-input"]');

              if (messageInput) {
                console.log("[INJECTED] Message input found");

                // Set the message text
                messageInput.textContent = messageText;
                messageInput.innerText = messageText;

                // Trigger input event
                const inputEvent = new Event("input", { bubbles: true });
                messageInput.dispatchEvent(inputEvent);

                // Find and click send button
                const sendButtonSelectors = [
                  '[aria-label="Send"]',
                  'button[aria-label="Send"]',
                  '[data-tab="11"]',
                  '[data-testid="send"]',
                  '[data-icon="send"]',
                  'span[data-icon="send"]',
                ];

                for (const selector of sendButtonSelectors) {
                  const sendButton = document.querySelector(selector);
                  if (sendButton && sendButton.offsetParent !== null) {
                    console.log(`[INJECTED] Found send button: ${selector}`);
                    sendButton.click();
                    console.log("[INJECTED] ✅ Message sent successfully!");
                    return true;
                  }
                }

                console.log("[INJECTED] Send button not found");
              } else {
                console.log("[INJECTED] Message input not found");
              }

              // Retry if not successful and within max attempts
              if (attempts < maxAttempts) {
                setTimeout(tryAutoSend, 1000);
              } else {
                console.log("[INJECTED] Max attempts reached, giving up");
              }

              return false;
            };

            // Start trying after a delay
            setTimeout(tryAutoSend, 2000);
          },
          args: [message],
        });
      }, 3000);

      sendResponse({ success: true, tabId: tab.id });
    }
  );

  return true; // Required for async sendResponse
}

// Main listener setup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "CREATE_ORDER":
      return handleCreateOrder(request, sender, sendResponse);
    case "FETCH_ORDERS":
      return handleFetchOrders(request, sender, sendResponse);
    case "UPDATE_ORDER_STATUS":
      return handleUpdateOrderStatus(request, sender, sendResponse);
    case "SEND_WHATSAPP_MESSAGE":
      return handleSendWhatsAppMessage(request, sender, sendResponse);
    case "FETCH_PRODUCTS":
      const productsApiUrl = "https://api1.shopilam.com/api/v1/products";

      // Use enhanced cookie handling
      handleApiCallWithCookies(
        productsApiUrl,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
        sendResponse
      );
      return true;
    default:
      console.warn("Unknown message action:", request.action);
      return false;
  }
});
