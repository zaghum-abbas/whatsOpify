export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);

  if (isNaN(date.getTime())) return dateString;

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  // const year = date.getFullYear();
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

export const formatPrice = (value) => {
  const numberValue =
    typeof value === "string" ? value?.replace(/,/g, "") : value;
  return Number(numberValue).toLocaleString("en-US");
};

export const getToken = () => {
  try {
    const raw = localStorage.getItem("whatshopify_token");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data?.token || parsed?.token || null;
  } catch (err) {
    console.warn("[TOKEN] Failed to parse whatshopify_token:", err);
    return false;
  }
};

export const sanitizePhone = (phone) => {
  if (phone?.startsWith("+92")) return "0" + phone?.slice(3);
  if (phone?.startsWith("92")) return "0" + phone?.slice(2);
  return phone;
};

export const extractPhoneNumberFromDOM = () => {
  console.log("🔍 [PHONE] Starting phone number extraction...");

  // Try multiple selectors to find the phone number element
  const selectors = [
    ".x10l6tqk.x13vifvy.xtijo5x.x1ey2m1c.x1o0tod.x1280gxy", // Original selector
    'span[dir="ltr"]', // Phone numbers are often in LTR direction
    'section[data-testid="contact-info"] span', // Contact info section
    'div[role="button"] span[dir="ltr"]', // Sometimes in buttons
  ];

  let phoneNumber = null;

  for (const selector of selectors) {
    console.log(`🔍 [PHONE] Trying selector: ${selector}`);

    if (selector.includes("[") || selector.startsWith(".")) {
      // For class or attribute selectors, try querySelector
      const el = document.querySelector(selector);
      if (el) {
        const extracted = extractPhoneFromElement(el);
        if (extracted) {
          phoneNumber = extracted;
          console.log(`✅ [PHONE] Found phone with selector: ${selector}`);
          break;
        }
      }
    } else {
      // For more complex selectors, try querySelectorAll
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const extracted = extractPhoneFromElement(el);
        if (extracted) {
          phoneNumber = extracted;
          console.log(`✅ [PHONE] Found phone in element: ${selector}`);
          break;
        }
      }
      if (phoneNumber) break;
    }
  }

  if (!phoneNumber) {
    console.warn("⚠️ [PHONE] No phone number found with any selector");
  }

  return phoneNumber;
};

// Helper function to extract phone from an element
function extractPhoneFromElement(el) {
  if (!el) return null;

  let text = el.textContent || "";
  console.log("🧾 [PHONE] Raw text:", text);

  const cleanedText = text.replace(/\u200B/g, "").replace(/\u00A0/g, " ");
  console.log("✨ [PHONE] Cleaned text:", cleanedText);
  const phonePatterns = [
    /\+\d{1,3}\s?\d{10,14}/,
    /\d{11,14}/,
    /\+\d{1,3}[-\s]?\d{2,5}[-\s]?\d{3,5}[-\s]?\d{3,5}/,
  ];

  for (const pattern of phonePatterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      const number = match[0].replace(/[\s\-]/g, "");
      console.log("📞 [PHONE] Found number:", number);
      return number;
    }
  }

  return null;
}

export const ensureArray = (value) => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

export const showVariantImages = (images, variant) => {
  if (!images?.length || !variant) {
    return undefined;
  }
  const matchedImage = ensureArray(images)?.find(
    (image) => image?.id === variant?.imageId
  );
  console.log("[VARIANT] Matched image:", matchedImage);
  if (!matchedImage?.url) {
    return undefined;
  }
  return matchedImage?.thumbnailUrl ?? matchedImage?.url;
};

export const showProductImages = (product) => {
  if (!product?.images?.length) {
    return undefined;
  }
  const images = ensureArray(product?.images);
  const variantImageIds = product?.variants
    ?.map((variant) => variant?.imageId)
    ?.filter(Boolean);
  const productImages = images?.filter(
    (image) => image?.id && !variantImageIds?.includes(image?.id)
  );
  console.log("[PRODUCT] Product images:", productImages);

  if (!productImages?.length) {
    return undefined;
  }
  const imageUrl = productImages?.[0]?.thumbnailUrl ?? productImages?.[0]?.url;
  if (!imageUrl) {
    return undefined;
  }

  console.log("[PRODUCT] Image URL:11", imageUrl);

  return imageUrl;
};

export const getAllProductImages = (product) => {
  if (!product?.images?.length) {
    return undefined;
  }
  const images = ensureArray(product?.images);
  const variantImageIds = product?.variants
    ?.map((variant) => variant?.imageId)
    ?.filter(Boolean);
  const productImages = images?.filter(
    (image) => image?.id && !variantImageIds?.includes(image?.id)
  );
  console.log("[PRODUCT] Product images:", productImages);

  if (!productImages?.length) {
    return undefined;
  }

  return productImages;
};

export const formatPhoneNumber = (number) => {
  const cleaned = number.replace(/\D/g, "");

  if (cleaned.startsWith("92")) {
    return "0" + cleaned.slice(2);
  }

  return cleaned;
};

export const downloadImageAsFile = async (imageUrl, filename) => {
  try {
    console.log("[IMAGE] Downloading image from:", imageUrl);

    // Try multiple methods to download the image
    let response = null;

    // Method 1: Direct fetch (works for same-origin images)
    try {
      response = await fetch(imageUrl);
      if (!response.ok)
        throw new Error(`Direct fetch failed: ${response.status}`);
    } catch (directError) {
      console.log("[IMAGE] Direct fetch failed, trying CORS proxy...");

      // Method 2: CORS proxy
      try {
        const corsProxy = "https://corsproxy.io/?";
        const proxyUrl = corsProxy + encodeURIComponent(imageUrl);
        response = await fetch(proxyUrl);
        if (!response.ok)
          throw new Error(`CORS proxy failed: ${response.status}`);
      } catch (proxyError) {
        console.log("[IMAGE] CORS proxy failed, trying alternative proxy...");

        // Method 3: Alternative proxy
        const altProxy = "https://api.allorigins.win/raw?url=";
        const altProxyUrl = altProxy + encodeURIComponent(imageUrl);
        response = await fetch(altProxyUrl);
        if (!response.ok)
          throw new Error(`Alternative proxy failed: ${response.status}`);
      }
    }

    const blob = await response.blob();
    console.log("[IMAGE] Blob created:", {
      size: blob.size,
      type: blob.type,
    });

    const file = new File([blob], filename, {
      type: blob.type || "image/jpeg",
    });

    console.log("[IMAGE] Image downloaded successfully:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });
    return file;
  } catch (error) {
    console.error("[IMAGE] Error downloading image:", error);
    return null;
  }
};

export const getLatestOrder = (orders) => {
  if (!orders?.length) return null;
  return orders?.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )[0];
};
