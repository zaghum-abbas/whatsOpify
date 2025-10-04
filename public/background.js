function handleCreateOrder(request, sender, sendResponse) {
  console.log("[BG] Order request received:", request);

  const orderApiUrl = "https://api.shopilam.com/api/v1/orders";

  const headersToSend = {
    "Content-Type": "application/json",
    // Authorization: `Bearer ${request.token}`,
    Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InNlbGxlckBnbWFpbC5jb20iLCJleHAiOjE3NTk0NDQ2NzV9.xXgJ-4zSawsKJ7QM4bX6yVXKws9krNQGPB0UAFcDuwA`,
  };

  fetch(orderApiUrl, {
    method: "POST",
    headers: headersToSend,
    body: JSON.stringify(request.data),
  })
    .then((response) => {
      // Always parse JSON first to get the data, even if response.ok is false
      return response.json().then((data) => ({
        status: response.status,
        ok: response.ok, // This tells us if the HTTP status was 2xx
        data: data,
      }));
    })
    .then(({ status, ok, data }) => {
      console.log("[BG] API Response Status:", status);
      console.log("[BG] API Response OK:", ok); // Log the 'ok' status
      console.log("[BG] API Response Data:", data);

      // Check if the HTTP response was successful (2xx status code)
      // and if the data contains a success message or identifier.
      // The previous check `data.orderId || data._id` was too specific for your API's success response.
      if (ok) {
        // If HTTP status is 2xx, consider it a success
        console.log("[BG] Order creation API call successful (HTTP OK):", data);
        sendResponse({ success: true, data: data });
      } else {
        // If HTTP status is not 2xx, or 'ok' is false, it's an error.
        const errorMessage =
          data && (data.detail || data.message)
            ? data.detail || data.message
            : `API error (Status: ${status})`;
        console.log(
          "[BG] Order creation API call failed (HTTP NOT OK):",
          errorMessage
        );
        sendResponse({ success: false, error: errorMessage, data: data });
      }
    })
    .catch((error) => {
      console.error("[BG] Fetch error during order creation:", error);
      sendResponse({ success: false, error: error.message });
    });

  return true;
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
    case "SEND_WHATSAPP_MESSAGE":
      return handleSendWhatsAppMessage(request, sender, sendResponse);
    case "FETCH_PRODUCTS":
      const token = request.token;
      console.log(
        "[BG] FETCH_PRODUCTS request received, token:",
        token ? token.substring(0, 20) + "..." : "undefined"
      );

      if (!token) {
        console.error("[BG] No token provided in FETCH_PRODUCTS request");
        sendResponse({
          success: false,
          error: "No authentication token provided",
        });
        return false;
      }

      const productsApiUrl =
        "https://api.shopilam.com/api/v1/products?limit=50&page=1&status=active";

      const productsHeaders = {
        Authorization: `Bearer ${token}`,
      };

      fetch(productsApiUrl, {
        method: "GET",
        headers: productsHeaders,
      })
        .then((response) => {
          console.log("[BG] API response status:", response.status);
          console.log(
            "[BG] API response headers:",
            Object.fromEntries(response.headers.entries())
          );

          if (!response.ok) {
            return response.text().then((text) => {
              console.error("[BG] API error response:", text);
              throw new Error(
                `HTTP error! status: ${response.status}, message: ${text}`
              );
            });
          }
          return response.json();
        })
        .then((productsData) => {
          console.log("[BG] API success response:", productsData);
          console.log(
            "[BG] Products count:",
            Array.isArray(productsData?.data)
              ? productsData?.data?.length
              : "Not an array",
            productsData
          );
          sendResponse({ success: true, products: productsData });
        })
        .catch((error) => {
          console.error("[BG] Fetch error:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case "FETCH_ORDERS":
      const ordersToken = request.token;
      const { status, page = 1, limit = 50 } = request;

      if (!ordersToken) {
        console.error("[BG] No token provided in FETCH_ORDERS request");
        sendResponse({
          success: false,
          error: "No authentication token provided",
        });
        return false;
      }

      const ordersApiUrl = `https://api.shopilam.com/api/v1/orders?status=${status}&page=${page}&limit=${limit}`;

      const ordersHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ordersToken}`,
      };

      fetch(ordersApiUrl, {
        method: "GET",
        headers: ordersHeaders,
      })
        .then((response) => {
          console.log("[BG] Orders API response status:", response.status);
          console.log(
            "[BG] Orders API response headers:",
            Object.fromEntries(response.headers.entries())
          );

          if (!response.ok) {
            return response.text().then((text) => {
              console.error("[BG] Orders API error response:", text);
              throw new Error(
                `HTTP error! status: ${response.status}, message: ${text}`
              );
            });
          }
          return response.json();
        })
        .then((ordersData) => {
          console.log("[BG] Orders API success response:", ordersData);
          console.log(
            "[BG] Orders count:",
            Array.isArray(ordersData?.data)
              ? ordersData?.data?.length
              : Array.isArray(ordersData)
              ? ordersData.length
              : "Not an array"
          );
          sendResponse({ success: true, orders: ordersData });
        })
        .catch((error) => {
          console.error("[BG] Orders fetch error:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case "UPDATE_ORDER_STATUS":
      const updateToken = request.token;
      const { orderId, newStatus } = request;

      if (!updateToken) {
        console.error("[BG] No token provided in UPDATE_ORDER_STATUS request");
        sendResponse({
          success: false,
          error: "No authentication token provided",
        });
        return false;
      }

      if (!orderId || !newStatus) {
        console.error(
          "[BG] Missing orderId or newStatus in UPDATE_ORDER_STATUS request"
        );
        sendResponse({
          success: false,
          error: "Missing orderId or newStatus",
        });
        return false;
      }

      const updateApiUrl = `https://api.shopilam.com/api/v1/orders/${orderId}/status`;

      const updateHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${updateToken}`,
      };

      const updatePayload = {
        status: newStatus,
      };

      console.log("[BG] Making PUT request to:", updateApiUrl);
      console.log("[BG] Request payload:", updatePayload);
      console.log("[BG] Request headers:", updateHeaders);

      fetch(updateApiUrl, {
        method: "PUT",
        headers: updateHeaders,
        body: JSON.stringify(updatePayload),
      })
        .then((response) => {
          console.log("[BG] Update API response status:", response.status);
          console.log(
            "[BG] Update API response headers:",
            Object.fromEntries(response.headers.entries())
          );

          if (!response.ok) {
            return response.text().then((text) => {
              console.error("[BG] Update API error response:", text);
              throw new Error(
                `HTTP error! status: ${response.status}, message: ${text}`
              );
            });
          }
          return response.json();
        })
        .then((updateData) => {
          console.log("[BG] Update API success response:", updateData);
          sendResponse({ success: true, data: updateData });
        })
        .catch((error) => {
          console.error("[BG] Update fetch error:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    case "SEARCH_PRODUCTS":
      const searchToken = request.token;
      const {
        searchTerm,
        page: searchPage = 1,
        limit: searchLimit = 50,
      } = request;

      console.log("[BG] SEARCH_PRODUCTS request received:", {
        searchTerm,
        page: searchPage,
        limit: searchLimit,
        token: searchToken ? searchToken.substring(0, 20) + "..." : "undefined",
      });

      if (!searchToken) {
        console.error("[BG] No token provided in SEARCH_PRODUCTS request");
        sendResponse({
          success: false,
          error: "No authentication token provided",
        });
        return false;
      }

      // Allow empty search term for getting all products
      const searchQuery =
        searchTerm && searchTerm.trim() !== ""
          ? `search=${encodeURIComponent(searchTerm.trim())}&`
          : "";

      const searchApiUrl = `https://api.shopilam.com/api/v1/products?${searchQuery}limit=${searchLimit}&page=${searchPage}&status=active`;

      const searchHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${searchToken}`,
      };

      console.log("[BG] Making search request to:", searchApiUrl);
      console.log("[BG] Request headers:", searchHeaders);

      fetch(searchApiUrl, {
        method: "GET",
        headers: searchHeaders,
      })
        .then((response) => {
          console.log("[BG] Search API response status:", response.status);
          console.log(
            "[BG] Search API response headers:",
            Object.fromEntries(response.headers.entries())
          );

          if (!response.ok) {
            return response.text().then((text) => {
              console.error("[BG] Search API error response:", text);
              throw new Error(
                `HTTP error! status: ${response.status}, message: ${text}`
              );
            });
          }
          return response.json();
        })
        .then((searchData) => {
          console.log("[BG] Search API success response:", searchData);
          console.log(
            "[BG] Search results count:",
            Array.isArray(searchData?.data)
              ? searchData?.data?.length
              : Array.isArray(searchData)
              ? searchData.length
              : "Not an array"
          );
          sendResponse({ success: true, products: searchData });
        })
        .catch((error) => {
          console.error("[BG] Search fetch error:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;

    default:
      console.warn("Unknown message action:", request.action);
      return false;
  }
});
