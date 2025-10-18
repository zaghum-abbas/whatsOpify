export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);

  if (isNaN(date.getTime())) return dateString;

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

export const formatPrice = (value) => {
  const numberValue =
    typeof value === "string" ? value?.replace(/,/g, "") : value;
  return Number(numberValue).toLocaleString("en-US");
};

export const getToken = () => {
  try {
    const raw = localStorage.getItem("whatsopify_token");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data?.token || parsed?.token || null;
  } catch (err) {
    console.warn("[TOKEN] Failed to parse whatsopify_token:", err);
    return false;
  }
};

export const sanitizePhone = (phone) => {
  if (phone?.startsWith("+92")) return "0" + phone?.slice(3);
  if (phone?.startsWith("92")) return "0" + phone?.slice(2);
  return phone;
};

export const extractPhoneNumberFromDOM = () => {
  const el = document.querySelector(
    ".x10l6tqk.x13vifvy.xtijo5x.x1ey2m1c.x1o0tod.x1280gxy"
  );

  if (!el) {
    console.warn("⚠️ No contact element found");
    return null;
  }

  let text = el.textContent || "";
  console.log("🧾 Raw text:", text);

  // Clean hidden characters and normalize spaces
  text = text
    .replace(/\u200B/g, "") // zero-width spaces
    .replace(/\u00A0/g, " ") // non-breaking spaces
    .replace(/[\s\-]+/g, "") // remove spaces, dashes
    .trim();

  console.log("✨ Cleaned text:", text);

  // Allow optional +92 / 92 / 0 and any spacing variations
  const phoneRegex = /(\+\d{1,3}[-\s]?\d{2,5}[-\s]?\d{3,5}[-\s]?\d{3,5})/;

  const match = text.match(phoneRegex);
  console.log("🔍 match:", match);

  if (match) {
    let number = match[0];
    console.log("📞 Found number:", number);
    return number;
  }

  console.warn("⚠️ No phone number found in text");
  return null;
};

export const ensureArray = (value) => {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

export const showVariantImages = (images, product) => {
  if (!images?.length || !product) {
    return undefined;
  }
  const matchedImage = ensureArray(images)?.find(
    (image) => image?.id === product?.imageId
  );
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
  if (!productImages?.length) {
    return undefined;
  }
  const imageUrl = productImages?.[0]?.thumbnailUrl ?? productImages?.[0]?.url;
  if (!imageUrl) {
    return undefined;
  }
  return imageUrl;
};
