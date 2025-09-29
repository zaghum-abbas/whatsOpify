// src/utils/api.js
export const fetchProducts = async () => {
  try {
    console.log(
      "[API] Fetching products using session-based authentication..."
    );

    // Send message to background script with session-based auth
    const response = await chrome.runtime.sendMessage({
      action: "FETCH_PRODUCTS",
    });

    if (!response.success) {
      throw new Error(response.error || "Failed to fetch products");
    }

    console.log("[API] Products fetched successfully:", response.products);
    return response.products;
  } catch (error) {
    console.error("[API] Product fetch failed:", error);
    throw error; // Re-throw for components to handle
  }
};
