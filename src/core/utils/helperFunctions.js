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
