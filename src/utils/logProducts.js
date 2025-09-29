export const logProductsToConsole = async () => {
  try {
    console.log("🔍 Attempting to fetch products using session-based auth...");

    console.log("⚡ Sending request to background script...");
    const response = await chrome.runtime.sendMessage({
      action: "FETCH_PRODUCTS",
    });

    console.log("🟡 Raw Response from background:", response);

    if (response.success) {
      // Normalize products
      const products = Array.isArray(response.products)
        ? response.products
        : response.products?.data || [];

      console.group("📦 Shopilam Products");
      console.log("Total Products:", products.length);
      console.table(products.slice(0, 10));
      console.groupEnd();

      // Copy to clipboard
      navigator.clipboard
        .writeText(JSON.stringify(products, null, 2))
        .then(() => console.log("📋 Products copied to clipboard!"));
    } else {
      console.error("❌ API Error:", response.error);
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
};
