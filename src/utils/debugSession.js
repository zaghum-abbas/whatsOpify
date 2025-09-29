// Debug utility for session-based authentication issues
export const debugSessionAuth = async () => {
  console.group("🔍 Session Authentication Debug");

  try {
    // 1. Check if we're in a Chrome extension context
    if (typeof chrome === "undefined" || !chrome.cookies) {
      console.error("❌ Chrome extension API not available");
      return;
    }

    // 2. Check cookies for the API domain
    console.log("🍪 Checking cookies for api1.shopilam.com...");
    const cookies = await new Promise((resolve) => {
      chrome.cookies.getAll({ domain: "api1.shopilam.com" }, resolve);
    });

    console.log("Available cookies:", cookies);

    if (cookies.length === 0) {
      console.warn("⚠️ No cookies found for api1.shopilam.com");
      console.log("💡 Possible solutions:");
      console.log("   1. Make sure you're logged in on the main website");
      console.log("   2. Check if cookies are set for the correct domain");
      console.log("   3. Verify the domain in your backend matches exactly");
    } else {
      console.log(
        "✅ Found cookies:",
        cookies.map((c) => `${c.name}=${c.value.substring(0, 20)}...`)
      );
    }

    // 3. Check cookies for parent domain
    console.log("🍪 Checking cookies for .shopilam.com...");
    const parentCookies = await new Promise((resolve) => {
      chrome.cookies.getAll({ domain: ".shopilam.com" }, resolve);
    });

    console.log("Parent domain cookies:", parentCookies);

    // 4. Test a simple API call
    console.log("🧪 Testing API call...");
    const testResponse = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: "FETCH_PRODUCTS",
        },
        resolve
      );
    });

    console.log("API test response:", testResponse);

    // 5. Check localStorage for any auth data
    console.log("💾 Checking localStorage for auth data...");
    const authKeys = Object.keys(localStorage).filter(
      (key) =>
        key.toLowerCase().includes("auth") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("session")
    );

    console.log("Auth-related localStorage keys:", authKeys);
    authKeys.forEach((key) => {
      console.log(`${key}:`, localStorage.getItem(key));
    });
  } catch (error) {
    console.error("❌ Debug error:", error);
  }

  console.groupEnd();
};

// Test function to check cookie domains
export const testCookieDomains = async () => {
  console.group("🍪 Cookie Domain Testing");

  const domains = [
    "api1.shopilam.com",
    ".shopilam.com",
    "shopilam.com",
    "localhost",
    "127.0.0.1",
  ];

  for (const domain of domains) {
    try {
      const cookies = await new Promise((resolve) => {
        chrome.cookies.getAll({ domain }, resolve);
      });
      console.log(`Domain: ${domain}`, cookies);
    } catch (error) {
      console.error(`Error checking domain ${domain}:`, error);
    }
  }

  console.groupEnd();
};

// Function to manually set cookies for testing (if needed)
export const setTestCookie = async (
  name,
  value,
  domain = "api1.shopilam.com"
) => {
  try {
    const result = await new Promise((resolve) => {
      chrome.cookies.set(
        {
          url: `https://${domain}`,
          name: name,
          value: value,
          domain: domain,
          secure: true,
          httpOnly: false,
        },
        resolve
      );
    });

    console.log("Cookie set:", result);
    return result;
  } catch (error) {
    console.error("Failed to set cookie:", error);
    return null;
  }
};

// Function to check if we can access cookies from the main domain
export const checkMainDomainCookies = async () => {
  console.group("🌐 Main Domain Cookie Check");

  try {
    // Try to get cookies from the main shopilam.com domain
    const mainCookies = await new Promise((resolve) => {
      chrome.cookies.getAll({ domain: "shopilam.com" }, resolve);
    });

    console.log("Main domain cookies:", mainCookies);

    // Check if there are any session cookies
    const sessionCookies = mainCookies.filter(
      (cookie) =>
        cookie.name.toLowerCase().includes("session") ||
        cookie.name.toLowerCase().includes("auth") ||
        cookie.name.toLowerCase().includes("token")
    );

    console.log("Session-related cookies:", sessionCookies);
  } catch (error) {
    console.error("Error checking main domain cookies:", error);
  }

  console.groupEnd();
};

export default {
  debugSessionAuth,
  testCookieDomains,
  setTestCookie,
  checkMainDomainCookies,
};
