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

// export const extractPhoneNumberFromDOM = () => {
//   const phoneEl = document.querySelector(
//     ".x10l6tqk.x13vifvy.xtijo5x.x1ey2m1c.x1o0tod.x1280gxy"
//   );

//   console.log("🔍 phoneEl", phoneEl);

//   const phoneRegex = /(?:\+92|92|0)?3\d{9}\b/g;

//   const matches = phoneEl.match(phoneRegex);

//   console.log("🔍 matches", matches);

//   if (matches && matches.length > 0) {
//     console.log("📞 Found phone numbers:", matches);
//     return matches[0];
//   } else {
//     console.log("⚠️ No phone numbers found in DOM");
//     return null;
//   }
// };

// export const extractPhoneNumberFromDOM = () => {
//   // Target your specific element
//   const phoneElement = document.querySelector(
//     ".x10l6tqk.x13vifvy.xtijo5x.x1ey2m1c.x1o0tod.x1280gxy"
//   );

//   if (!phoneElement) {
//     console.warn("⚠️ No contact element found");
//     return null;
//   }

//   // Get full raw text
//   const text = phoneElement.textContent?.trim() || "";
//   console.log("📋 Extracted text:", text);

//   // Match Pakistani number formats (+92, 92, or 03)
//   const phoneRegex = /(\+92|92|0)?3\d{9}\b/;

//   // Extract the first valid match
//   const match = text.match(phoneRegex);

//   console.log("🔍 match", match);

//   if (match) {
//     // Clean and standardize number to '92XXXXXXXXXX' format
//     let number = match[0].replace(/^\+?92|^0/, "92");
//     console.log("📞 Found number:", number);
//     return number;
//   }

//   console.warn("⚠️ No valid phone number found");
//   return null;
// };

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
