// public/background.js (MODIFIED to correctly handle API success response)

function handleCreateOrder(request, sender, sendResponse) {
  console.log("[BG] Order request received:", request);

  const orderApiUrl = "https://api1.shopilam.com/api/v1/orders";

  // Use token-based authentication
  handleApiCallWithToken(
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

  // Token-based authentication
  handleApiCallWithToken(
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

// Token-based API call handler
function handleApiCallWithToken(url, options, sendResponse) {
  console.log("[BG] Making API call with token authentication:", url);

  // Get token from storage
  chrome.storage.local.get(["whatsopify_token"], (result) => {
    let token = null;

    try {
      if (result.whatsopify_token) {
        const tokenData = JSON.parse(result.whatsopify_token);

        // Handle both old and new token structures
        if (tokenData && tokenData.data && tokenData.data.token) {
          // New structure: { data: { token: "...", user: {...}, stores: [...] } }
          token = tokenData.data.token;
        } else if (tokenData && tokenData.token) {
          // Old structure: { token: "...", user: {...}, stores: [...] }
          token = tokenData.token;
        }
      }
    } catch (err) {
      console.warn("[BG] Error parsing token from storage:", err);
    }

    if (!token) {
      console.warn("[BG] No valid token found, API call will fail");
      sendResponse({
        success: false,
        error: "Authentication token not found. Please login again.",
      });
      return;
    }

    console.log(
      "[BG] Using token for API call:",
      token.substring(0, 20) + "..."
    );

    // Make the API call with token in Authorization header
    const fetchOptions = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    };

    console.log("[BG] Making fetch request with token auth:", fetchOptions);

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
            ...(url.includes("orders") ? { orders: data } : { products: data }),
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
  });
}

function handleUpdateOrderStatus(request, sender, sendResponse) {
  console.log("[BG] Update order status request received:", request);

  const { orderId, status } = request;
  const updateApiUrl = `https://api1.shopilam.com/api/v1/orders/${orderId}`;

  const bodyData = {
    status: status,
  };

  // Token-based authentication
  handleApiCallWithToken(
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

function handleFetchUserInfo(request, sender, sendResponse) {
  console.log("[BG] Fetch user info request received:", request);

  const userInfoApiUrl = "https://api1.shopilam.com/api/v1/auth/me";

  // Token-based authentication
  handleApiCallWithToken(
    userInfoApiUrl,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    (response) => {
      if (response.success) {
        sendResponse({
          success: true,
          userInfo: response.data,
        });
      } else {
        sendResponse(response);
      }
    }
  );

  return true; // Required for async sendResponse
}

function handleFetchStores(request, sender, sendResponse) {
  console.log("[BG] Fetch stores request received:", request);

  const storesApiUrl = "https://api1.shopilam.com/api/v1/stores/";

  // Token-based authentication
  handleApiCallWithToken(
    storesApiUrl,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
    (response) => {
      if (response.success) {
        sendResponse({
          success: true,
          stores: response.data,
        });
      } else {
        sendResponse(response);
      }
    }
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
    case "FETCH_USER_INFO":
      return handleFetchUserInfo(request, sender, sendResponse);
    case "FETCH_STORES":
      return handleFetchStores(request, sender, sendResponse);
    case "FETCH_PRODUCTS":
      const productsApiUrl =
        "https://api1.shopilam.com/api/v1/products?limit=50&page=1&status=active";

      // Token-based authentication
      handleApiCallWithToken(
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
