// public/background.js (MODIFIED to correctly handle API success response)

function handleCreateOrder(request, sender, sendResponse) {
  console.log("[BG] Order request received:", request);

  const orderApiUrl = "https://api1.shopilam.com/api/v1/orders";

  const headersToSend = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${request.token}`,
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

  return true; // Required for async sendResponse
}

// Main listener setup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "CREATE_ORDER":
      return handleCreateOrder(request, sender, sendResponse);
    case "FETCH_PRODUCTS":
      const token = request.token;
      const productsApiUrl = "https://api1.shopilam.com/api/v1/products";

      const productsHeaders = {
        Authorization: `Bearer ${token}`,
      };

      fetch(productsApiUrl, {
        method: "GET",
        headers: productsHeaders,
      })
        .then((response) => {
          if (!response.ok) {
            return response.text().then((text) => {
              throw new Error(
                `HTTP error! status: ${response.status}, message: ${text}`
              );
            });
          }
          return response.json();
        })
        .then((productsData) => {
          sendResponse({ success: true, products: productsData });
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    default:
      console.warn("Unknown message action:", request.action);
      return false;
  }
});
