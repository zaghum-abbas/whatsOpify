// src/utils/createOrder.js (MODIFIED to be more robust in success check)
export const createOrder = async (orderData) => {
  try {
    console.log("📦 Order payload:", JSON.stringify(orderData, null, 2));

    const whatsopifyTokenRaw = localStorage.getItem('whatsopify_token'); 
    
    if (!whatsopifyTokenRaw) {
      console.error("❌ No auth token found in localStorage - please login first.");
      throw new Error("No auth token found - please login first.");
    }

    let tokenObj;
    try {
      tokenObj = JSON.parse(whatsopifyTokenRaw);
    } catch (parseError) {
      console.error("❌ Failed to parse token from localStorage:", parseError);
      throw new Error("Invalid token format in localStorage.");
    }

    // Extract the actual JWT token string
    const token = tokenObj?.data?.token;

    if (!token) {
      console.error("❌ JWT token string not found within the parsed token object.");
      throw new Error("JWT token not available. Please login again.");
    }
    
    console.log('⚡ Sending request to background script...');
    console.log('DEBUG: createOrder.js - Extracted JWT Token (should be plain string):', token); // Added for debug

    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      console.error("❌ chrome.runtime.sendMessage is not available. Ensure this script runs in a valid Chrome Extension context.");
      throw new Error("Chrome Extension API not available. Please reload the extension.");
    }

    // Use background script to bypass CSP
    const response = await chrome.runtime.sendMessage({
      action: 'CREATE_ORDER',
      token: token, // Pass the *extracted plain string token*
      data: orderData
    });

    console.log("🔵 Order response from background script:", response);
    
    if (!response) {
      console.error("❌ No response object received from background script.");
      throw new Error("No response object received from background script.");
    }

    // MODIFIED SUCCESS CHECK:
    // Check for response.success first, but also check if the error message
    // itself indicates success, as seen in previous logs.
    const isActuallySuccessful = response.success || 
                                 (response.error === 'Order created successfully' && response.data && response.data.message === 'Order created successfully');

    if (!isActuallySuccessful) {
      const errorMessage = response.error || "Unknown error from background script.";
      console.error("❌ API Error from background script:", errorMessage, response.data);
      throw new Error(`API Error: ${errorMessage}`);
    }

    // If we reach here, it means the order was successfully created (either by success flag or message content)
    return { success: true, data: response.data }; // Explicitly return success: true

  } catch (error) {
    console.error("❌ Order creation error in createOrder utility:", error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};
