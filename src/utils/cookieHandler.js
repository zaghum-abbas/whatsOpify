// Cookie handler for cross-domain session management
export const cookieHandler = {
  // Get all cookies for a domain
  async getCookiesForDomain(domain) {
    try {
      const cookies = await new Promise((resolve) => {
        chrome.cookies.getAll({ domain }, resolve);
      });
      console.log(`[COOKIE_HANDLER] Cookies for ${domain}:`, cookies);
      return cookies;
    } catch (error) {
      console.error(
        `[COOKIE_HANDLER] Error getting cookies for ${domain}:`,
        error
      );
      return [];
    }
  },

  // Get cookies for multiple domain variations
  async getAllRelevantCookies() {
    const domains = [
      "shopilam.com",
      ".shopilam.com",
      "api1.shopilam.com",
      "www.shopilam.com",
    ];

    let allCookies = [];

    for (const domain of domains) {
      const cookies = await this.getCookiesForDomain(domain);
      allCookies = allCookies.concat(cookies);
    }

    // Remove duplicates
    const uniqueCookies = allCookies.filter(
      (cookie, index, self) =>
        index ===
        self.findIndex(
          (c) => c.name === cookie.name && c.domain === cookie.domain
        )
    );

    console.log("[COOKIE_HANDLER] All unique cookies:", uniqueCookies);
    return uniqueCookies;
  },

  // Check if session cookie exists
  async hasSessionCookie() {
    const cookies = await this.getAllRelevantCookies();
    const sessionCookie = cookies.find(
      (cookie) =>
        cookie.name.toLowerCase().includes("session") ||
        cookie.name.toLowerCase().includes("auth") ||
        cookie.name.toLowerCase().includes("token")
    );

    console.log("[COOKIE_HANDLER] Session cookie found:", sessionCookie);
    return !!sessionCookie;
  },

  // Copy cookies from main domain to API domain (if needed)
  async copyCookiesToApiDomain() {
    try {
      const mainCookies = await this.getCookiesForDomain("shopilam.com");
      const apiCookies = await this.getCookiesForDomain("api1.shopilam.com");

      console.log("[COOKIE_HANDLER] Main domain cookies:", mainCookies);
      console.log("[COOKIE_HANDLER] API domain cookies:", apiCookies);

      // If main domain has session cookies but API domain doesn't, copy them
      const sessionCookies = mainCookies.filter(
        (cookie) =>
          cookie.name.toLowerCase().includes("session") ||
          cookie.name.toLowerCase().includes("auth")
      );

      if (sessionCookies.length > 0 && apiCookies.length === 0) {
        console.log(
          "[COOKIE_HANDLER] Copying session cookies to API domain..."
        );

        for (const cookie of sessionCookies) {
          await this.setCookieForApiDomain(cookie.name, cookie.value, {
            secure: true,
            httpOnly: false, // Allow extension access
            sameSite: "none",
            path: "/",
          });
        }
      }
    } catch (error) {
      console.error("[COOKIE_HANDLER] Error copying cookies:", error);
    }
  },

  // Set cookie for API domain
  async setCookieForApiDomain(name, value, options = {}) {
    try {
      const cookieDetails = {
        url: "https://api1.shopilam.com",
        name: name,
        value: value,
        domain: "api1.shopilam.com",
        secure: true,
        httpOnly: false,
        sameSite: "none",
        path: "/",
        ...options,
      };

      const result = await new Promise((resolve) => {
        chrome.cookies.set(cookieDetails, resolve);
      });

      console.log(`[COOKIE_HANDLER] Cookie set for API domain:`, result);
      return result;
    } catch (error) {
      console.error(
        `[COOKIE_HANDLER] Error setting cookie for API domain:`,
        error
      );
      return null;
    }
  },

  // Get cookie string for fetch requests
  async getCookieString() {
    const cookies = await this.getAllRelevantCookies();
    const cookieString = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    console.log("[COOKIE_HANDLER] Cookie string for requests:", cookieString);
    return cookieString;
  },
};

// Enhanced API call function that ensures cookies are available
export const makeApiCallWithCookies = async (url, options = {}) => {
  console.log("[API_CALL] Making API call with cookie handling...");

  // First, ensure we have session cookies
  await cookieHandler.copyCookiesToApiDomain();

  // Get cookie string
  const cookieString = await cookieHandler.getCookieString();

  // Enhanced fetch options
  const fetchOptions = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieString, // Explicitly set cookies
      ...options.headers,
    },
    ...options,
  };

  console.log("[API_CALL] Fetch options:", fetchOptions);

  try {
    const response = await fetch(url, fetchOptions);
    console.log("[API_CALL] Response status:", response.status);

    const data = await response.json();
    return {
      success: response.ok,
      status: response.status,
      data: data,
      error: response.ok
        ? null
        : data.detail || data.message || `HTTP ${response.status}`,
    };
  } catch (error) {
    console.error("[API_CALL] Fetch error:", error);
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message,
    };
  }
};

export default {
  cookieHandler,
  makeApiCallWithCookies,
};
