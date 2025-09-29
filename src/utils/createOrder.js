// src/utils/createOrder.js (MODIFIED to use session-based authentication)
export const createOrder = async (orderData) => {
  try {
    console.log("📦 Order payload:", JSON.stringify(orderData, null, 2));
    console.log("🔐 Using session-based authentication...");

    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      !chrome.runtime.sendMessage
    ) {
      console.error(
        "❌ chrome.runtime.sendMessage is not available. Ensure this script runs in a valid Chrome Extension context."
      );
      throw new Error(
        "Chrome Extension API not available. Please reload the extension."
      );
    }

    // Use background script to bypass CSP with session-based auth
    const response = await chrome.runtime.sendMessage({
      action: "CREATE_ORDER",
      data: orderData,
    });

    console.log("🔵 Order response from background script:", response);

    if (!response) {
      console.error("❌ No response object received from background script.");
      throw new Error("No response object received from background script.");
    }

    // MODIFIED SUCCESS CHECK:
    // Check for response.success first, but also check if the error message
    // itself indicates success, as seen in previous logs.
    const isActuallySuccessful =
      response.success ||
      (response.error === "Order created successfully" &&
        response.data &&
        response.data.message === "Order created successfully");

    if (!isActuallySuccessful) {
      const errorMessage =
        response.error || "Unknown error from background script.";
      console.error(
        "❌ API Error from background script:",
        errorMessage,
        response.data
      );
      throw new Error(`API Error: ${errorMessage}`);
    }

    // If we reach here, it means the order was successfully created (either by success flag or message content)
    return { success: true, data: response.data }; // Explicitly return success: true
  } catch (error) {
    console.error("❌ Order creation error in createOrder utility:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
