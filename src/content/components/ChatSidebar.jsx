import React, { useMemo, useState, useEffect } from "react";
import CustomerSupportMessages from "./CustomerSupportMessages";
import {
  ensureArray,
  formatDate,
  formatPhoneNumber,
  formatPrice,
  showProductImages,
  showVariantImages,
} from "../../core/utils/helperFunctions";
import { useDebounce } from "../../hooks/useDebounce";
import { useTheme, getThemeColors } from "../../hooks/useTheme";

const CatalogItem = ({ item, handleProductClick, theme }) => {
  const colors = getThemeColors(theme);
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if product has variants
  const hasVariants = item?.variants && item.variants.length > 1;

  const handleToggleExpand = (e) => {
    e.stopPropagation(); // Prevent triggering product click
    setIsExpanded(!isExpanded);
  };

  const handleVariantClick = (e, variant) => {
    e.stopPropagation();

    const variantItem = { ...item, variants: [variant] };

    // Get matched images for that single variant
    const variantImages = showVariantImages(item.images, variant);
    console.log("Variant images:", variantImages);

    // Pass it along with variant data
    handleProductClick({
      ...variantItem,
      images: [{ url: variantImages }],
    });
  };

  return (
    <div
      style={{
        background: colors.card,
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "12px",
        border: `1px solid ${colors.border}`,
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = "translateY(-1px)";
        e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "translateY(0)";
        e.target.style.boxShadow = "0 1px 4px rgba(0,0,0,0.07)";
      }}
    >
      {/* Main Product Row */}
      <div
        onClick={() => handleProductClick(item)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "6px",
            overflow: "hidden",
            border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.images && item.images.length > 0 ? (
            <img
              src={showProductImages(item)}
              alt={item.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
          ) : (
            <div
              style={{
                display: item.image ? "none" : "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                fontSize: "1.2em",
                color: theme === "dark" ? "white" : "#222",
              }}
            >
              🛒
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: theme === "dark" ? "white" : "#222",
              fontWeight: 600,
              fontSize: "0.95rem",
              marginBottom: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item?.title}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.8em",
            }}
          >
            {item.vendor && (
              <span style={{ color: theme === "dark" ? "white" : "#222" }}>
                👤 {item.vendor}
              </span>
            )}
            {item.category && (
              <span style={{ color: theme === "dark" ? "white" : "#222" }}>
                🏷️ {item.category}
              </span>
            )}
          </div>
        </div>

        {/* Price and Toggle/Click Indicator */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
            gap: "8px",
          }}
        >
          <div
            style={{
              color: theme === "dark" ? "white" : "#222",
              fontWeight: 700,
              fontSize: "1rem",
            }}
          >
            {hasVariants ? (
              <span
                style={{
                  fontSize: "0.8em",
                  color: theme === "dark" ? "#25d366" : "#25d366",
                }}
              >
                From Rs.{" "}
                {formatPrice(Math.min(...item.variants.map((v) => v.price)))}
              </span>
            ) : (
              `Rs. ${formatPrice(item?.variants?.[0]?.price)}`
            )}
          </div>

          {hasVariants ? (
            <button
              onClick={handleToggleExpand}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "0.7em",
                color: theme === "dark" ? "#25d366" : "#25d366",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.target.style.background =
                  theme === "dark" ? "#333" : "#f0f0f0";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "transparent";
              }}
            >
              {isExpanded ? "▼ Hide" : "▶ Show"} variants
            </button>
          ) : (
            <div
              style={{
                fontSize: "0.7em",
                color: theme === "dark" ? "white" : "#222",
                fontStyle: "italic",
              }}
            >
              Click to add
            </div>
          )}
        </div>
      </div>

      {/* Variants Section */}
      {hasVariants && isExpanded && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
          }}
        >
          <div
            style={{
              fontSize: "0.8em",
              fontWeight: 600,
              color: theme === "dark" ? "white" : "#222",
              marginBottom: "8px",
            }}
          >
            Available Variants:
          </div>
          <div style={{ paddingInline: `10px` }}>
            {item.variants.map((variant, index) => (
              <div
                key={index}
                onClick={(e) => handleVariantClick(e, variant)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px",
                  marginBottom: "6px",
                  background: theme === "dark" ? "#1a1a1a" : "#f8f9fa",
                  borderRadius: "6px",
                  cursor: "pointer",
                  border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
                }}
              >
                {/* Variant Image */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    border: `1px solid ${
                      theme === "dark" ? "#333" : "#e2e8f0"
                    }`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {variant?.imageId ? (
                    <img
                      src={showVariantImages(item.images, variant)}
                      alt={variant.title || `Variant ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: item.image ? "none" : "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        fontSize: "1.2em",
                        color: theme === "dark" ? "white" : "#222",
                      }}
                    >
                      🛒
                    </div>
                  )}
                </div>

                {/* Variant Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: theme === "dark" ? "white" : "#222",
                      fontWeight: 500,
                      fontSize: "0.85rem",
                      marginBottom: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {variant.title || `Variant ${index + 1}`}
                  </div>
                  {variant.option1 && (
                    <div
                      style={{
                        fontSize: "0.7em",
                        color: theme === "dark" ? "#aaa" : "#666",
                      }}
                    >
                      {variant.option1}
                      {variant.option2 && ` • ${variant.option2}`}
                      {variant.option3 && ` • ${variant.option3}`}
                    </div>
                  )}
                </div>

                {/* Variant Price */}
                <div
                  style={{
                    color: theme === "dark" ? "white" : "#222",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    flexShrink: 0,
                  }}
                >
                  Rs. {formatPrice(variant.price)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ChatSidebar = ({
  contact = { name: "", phone: "", about: "" },
  catalog = [],
  notes = "",
  onNotesChange,
}) => {
  const theme = useTheme();

  console.log("catalog", catalog);
  const [search, setSearch] = useState("");
  const [filteredCatalog, setFilteredCatalog] = useState(catalog);
  const [isSearching, setIsSearching] = useState(false);

  // User orders state
  const [userOrders, setUserOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  // Debounce search input
  const debouncedSearch = useDebounce(search, 500);

  // API function to fetch user orders by phone number
  const fetchUserOrders = async (phoneNumber) => {
    if (!phoneNumber) {
      console.log("[ORDERS] No phone number provided");
      return;
    }

    setIsLoadingOrders(true);
    setOrdersError(null);

    try {
      console.log(`[ORDERS] Fetching orders for phone: ${phoneNumber}`);

      const response = await chrome.runtime.sendMessage({
        action: "FETCH_USER_ORDERS",
        token: localStorage.getItem("whatsopify_token")
          ? JSON.parse(localStorage.getItem("whatsopify_token"))?.data?.token ||
            JSON.parse(localStorage.getItem("whatsopify_token"))?.token
          : null,
        phone: formatPhoneNumber(phoneNumber),
        storeId: localStorage.getItem("whatsopify_selected_store")
          ? JSON.parse(localStorage.getItem("whatsopify_selected_store"))?._id
          : null,
      });

      console.log("[ORDERS] API Response:", response);

      if (response.success) {
        // Handle different response structures
        let orders = [];
        if (response.success) {
          orders = response.orders;

          console.log(
            `[ORDERS] ✅ Found ${orders} orders for phone: ${phoneNumber}`
          );
          setUserOrders(orders);
        }
      } else {
        console.error("[ORDERS] API failed:", response.error);
        setOrdersError(response.detail);
        setUserOrders([]);
      }
    } catch (error) {
      console.error("[ORDERS] Error fetching user orders:", error);
      setOrdersError(error.detail);
      setUserOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSearchChange = (e) => {
    const searchTerm = e.target.value;
    setSearch(searchTerm);
    setIsSearching(true);
  };
  console.log("userOrders", userOrders);
  const searchProducts = async (searchTerm) => {
    try {
      console.log(`[CATALOG] Searching products with term: "${searchTerm}"`);

      const response = await chrome.runtime.sendMessage({
        action: "SEARCH_PRODUCTS",
        token: localStorage.getItem("whatsopify_token")
          ? JSON.parse(localStorage.getItem("whatsopify_token"))?.data?.token ||
            JSON.parse(localStorage.getItem("whatsopify_token"))?.token
          : null,
        searchTerm: searchTerm,
        storeId: localStorage.getItem("whatsopify_selected_store")
          ? JSON.parse(localStorage.getItem("whatsopify_selected_store"))?._id
          : null,
      });

      console.log("[CATALOG] Search API Response:", response);

      if (response.success) {
        let products = [];

        // Handle different response structures
        if (Array.isArray(response.products)) {
          products = response.products;
        } else if (
          response.products?.data &&
          Array.isArray(response.products.data)
        ) {
          products = response.products.data;
        } else if (
          response.products?.products &&
          Array.isArray(response.products.products)
        ) {
          products = response.products.products;
        } else {
          console.warn(
            "[CATALOG] Unexpected search response structure:",
            response.products
          );
          products = [];
        }

        console.log(
          `[CATALOG] ✅ Found ${products.length} products for search: "${searchTerm}"`
        );
        return products;
      } else {
        console.error("[CATALOG] Search API failed:", response.error);
        return [];
      }
    } catch (error) {
      console.error("[CATALOG] Error searching products:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Effect to handle debounced search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearch.trim() === "") {
        setFilteredCatalog(catalog);
        setIsSearching(false);
        return;
      }

      const searchResults = await searchProducts(debouncedSearch);
      setFilteredCatalog(searchResults);
    };

    performSearch();
  }, [debouncedSearch, catalog]);

  // Update filtered catalog when catalog prop changes
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredCatalog(catalog);
    }
  }, [catalog]);

  // Fetch user orders when contact phone number is available
  useEffect(() => {
    if (contact?.phone) {
      console.log(
        "[ORDERS] Contact phone detected, fetching orders:",
        contact.phone
      );
      fetchUserOrders(contact.phone);
    } else {
      console.log("[ORDERS] No contact phone available");
      setUserOrders([]);
      setOrdersError(null);
    }
  }, [contact?.phone]);

  const formattedDescription = (description) => {
    if (!description) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(description, "text/html");
    return doc.body.textContent || "";
  };

  const handleProductClick = (item) => {
    console.log("[PRODUCT] Product clicked:", item);

    const productMessage =
      `🛒 *${item.title}*\n\n` +
      `**Product Description**\n` +
      `${formattedDescription(item.description)}\n` +
      `**Price**\n` +
      `Rs ${item?.variants?.[0]?.price}\n`;

    if (window.sendMessageToCurrentChat) {
      window.sendMessageToCurrentChat(productMessage, item);
    } else {
      console.warn("[PRODUCT] sendMessageToCurrentChat not available");
      navigator.clipboard.writeText(productMessage).then(() => {
        alert("Product details copied to clipboard! Paste in the chat.");
      });
    }
  };
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const handleWhatsAppRedirect = async (order) => {
    const data = localStorage.getItem("whatsopify_token");
    const store = JSON.parse(data)?.data?.stores;
    const phoneNumber = userOrders?.userInfo?.phone;
    const city = userOrders?.userInfo?.address?.city;
    const orderId = order?.name;
    const storeName = store?.find((s) => s._id === order?.storeId)?.name;
    const orderTotal = formatPrice(order?.amount);
    console.log("store", storeName, store);

    try {
      setUpdatingOrder(order?._id);
    } catch (updateError) {
      setError(`Failed to update order status: ${updateError.message}`);
      return;
    } finally {
      setUpdatingOrder(null);
    }

    if (phoneNumber) {
      const cleanedNumber = phoneNumber
        .replace(/^\+92/, "92")
        .replace(/^0/, "92");
      if (cleanedNumber) {
        const message = `🎉 *Great News!* 🎉  

Your order *#${orderId}* is out today to your city ${city} 🚚✨  



Please keep ${orderTotal} handy as your parcel  will be at your door step in 3-4 days. 

🧾 Tracking: ${`https://shopilam.com/tracking/${order?.trackingNo}`}  
 

You can follow your parcel using the link above — it’ll be with you soon! 😄  

💚 *Thanks for choosing us!*`;
        chrome.runtime.sendMessage(
          {
            action: "SEND_WHATSAPP_MESSAGE",
            phoneNumber: cleanedNumber,
            message: message,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "[ORDERS] Error sending message:",
                chrome.runtime.lastError
              );
            } else {
              console.log("[ORDERS] Message sent successfully:", response);
            }
          }
        );
      }
    } else {
      console.warn("[ORDERS] No phone number found for order:", order);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "inherit",
        // background: theme.bg,
        background: theme === "dark" ? "#18191a" : "#fff",
        minHeight: "100vh",
      }}
    >
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {console.log("contact", contact)}
      {/* Contact Info Section */}
      {contact && userOrders?.userInfo && (
        <section style={{ marginBottom: "28px" }}>
          <h2
            style={{
              marginBottom: "12px",
              fontSize: "1.1rem",
              color: theme === "dark" ? "white" : "#222",
            }}
          >
            Contact Info
          </h2>
          <div
            style={{
              background: theme === "dark" ? "#23272a" : "#fff",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              padding: "16px",
              fontSize: "0.98rem",
              color: theme === "dark" ? "white" : "#222",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>Name:</strong>
                <p
                  style={{
                    color: theme === "dark" ? "white" : "#222",
                  }}
                >
                  {userOrders?.userInfo?.name || "Not available"}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>Phone:</strong>
                <p
                  style={{
                    color: theme === "dark" ? "white" : "#222",
                  }}
                >
                  {contact?.phone ? `${userOrders?.userInfo?.phone}` : ""}
                </p>
              </div>
            </div>
            {contact?.about && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "1.1em" }}>💬</span>
                <strong>About:</strong>
                <span
                  style={{
                    color: contact?.about
                      ? theme === "dark"
                        ? "white"
                        : "#222"
                      : theme === "dark"
                      ? "white"
                      : "#222",
                  }}
                >
                  {contact?.about || "Not available"}
                </span>
              </div>
            )}
          </div>
        </section>
      )}
      {userOrders?.userStatus && (
        <section style={{ marginBottom: "28px" }}>
          <h2
            style={{
              marginBottom: "12px",
              fontSize: "1.1rem",
              color: theme === "dark" ? "white" : "#222",
            }}
          >
            User States
          </h2>
          <div
            style={{
              background: theme === "dark" ? "#23272a" : "#fff",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              padding: "16px",
              fontSize: "0.98rem",
              color: theme === "dark" ? "white" : "#222",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>Total Orders:</strong>
                <p
                  style={{
                    color: theme === "dark" ? "white" : "#222",
                  }}
                >
                  {userOrders?.userStatus?.totalOrders || 0}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>Total Spent:</strong>
                <p
                  style={{
                    color: theme === "dark" ? "white" : "#222",
                  }}
                >
                  Rs. {formatPrice(userOrders?.userStatus?.totalSpent) || 0}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>First Order Date:</strong>
                <p
                  style={{
                    color: theme === "dark" ? "white" : "#222",
                  }}
                >
                  {formatDate(userOrders?.userStatus?.firstOrderDate) || ""}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>Last Order Date:</strong>
                <p
                  style={{
                    color: theme === "dark" ? "white" : "#222",
                  }}
                >
                  {formatDate(userOrders?.userStatus?.lastOrderDate) || ""}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>Cancelled orders:</strong>
                <p
                  style={{
                    color: theme === "dark" ? "white" : "#222",
                  }}
                >
                  {formatDate(userOrders?.userStatus?.cancelledOrders) || 0}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <strong>Returned orders:</strong>
                <p
                  style={{
                    color: theme === "dark" ? "white" : "#222",
                  }}
                >
                  {formatDate(userOrders?.userStatus?.returnedOrders) || 0}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* User Orders Section */}
      <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          Customer Orders
        </h2>
        <div
          style={{
            background: theme === "dark" ? "#23272a" : "#fff",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            padding: "16px",
            border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          {isLoadingOrders ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                gap: "8px",
                color: theme === "dark" ? "white" : "#222",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: `2px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
                  borderTop: `2px solid ${
                    theme === "dark" ? "#25d366" : "#25d366"
                  }`,
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              Loading orders...
            </div>
          ) : ordersError ? (
            <div
              style={{
                color: "#e74c3c",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
              }}
            >
              {ordersError}
            </div>
          ) : userOrders && ensureArray(userOrders?.orders)?.length > 0 ? (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      backgroundColor: theme === "dark" ? "#23272a" : "#f5f5f5",
                    }}
                  >
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "left",
                        borderBottom: "1px solid #e0e0e0",
                        fontWeight: "600",
                      }}
                    >
                      Order ID
                    </th>

                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "left",
                        borderBottom: "1px solid #e0e0e0",
                        fontWeight: "600",
                      }}
                    >
                      Amount
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "left",
                        borderBottom: "1px solid #e0e0e0",
                        fontWeight: "600",
                        width: "200px",
                      }}
                    >
                      Order Date
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        borderBottom: "1px solid #e0e0e0",
                        fontWeight: "600",
                      }}
                    >
                      Order Status
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        borderBottom: "1px solid #e0e0e0",
                        fontWeight: "600",
                      }}
                    >
                      Tracking Number
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ensureArray(userOrders?.orders)?.map((order) => (
                    <tr
                      key={order.id}
                      style={{ borderBottom: "1px solid #f0f0f0" }}
                    >
                      <td
                        style={{
                          padding: "12px 8px",
                          fontFamily: "monospace",
                          fontSize: "12px",
                          alignContent: "center",
                        }}
                      >
                        {order.name}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          fontSize: "12px",
                          alignContent: "center",
                        }}
                      >
                        {formatPrice(order.amount)}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          alignContent: "center",
                        }}
                      >
                        <div style={{ fontWeight: "500" }}>
                          {formatDate(order?.createdAt)}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          fontSize: "12px",
                          alignContent: "center",
                        }}
                      >
                        {order?.status}
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          textAlign: "center",
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                          alignContent: "center",
                          height: "100%",
                          width: "100px",
                        }}
                      >
                        {order?.trackingNo && (
                          <button
                            onClick={() => handleWhatsAppRedirect(order)}
                            disabled={updatingOrder === order?._id}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: "#25D366",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor:
                                updatingOrder === order?._id
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                              opacity: updatingOrder === order?._id ? 0.6 : 1,
                            }}
                          >
                            {updatingOrder === order?._id
                              ? "Updating..."
                              : "Order status"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                color: theme === "dark" ? "#aaa" : "#666",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
              }}
            >
              No orders found for this customer
            </div>
          )}
        </div>
      </section>

      {/* Create Order Button */}
      <section style={{ marginBottom: "28px" }}>
        <button
          onClick={() => {
            // Switch to order form sidebar
            if (typeof window.switchToOrderFormSidebar === "function") {
              window.switchToOrderFormSidebar(contact);
            }
          }}
          style={{
            width: "100%",
            padding: "16px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 6px 16px rgba(102, 126, 234, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
          }}
        >
          <span style={{ fontSize: "1.3em" }}>📝</span>
          <span>Create New Order</span>
          <span style={{ fontSize: "1em", marginLeft: "auto" }}>→</span>
        </button>
      </section>

      {/* Catalog Section */}
      <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          Product Catalog
        </h2>
        <div
          style={{
            background: theme === "dark" ? "#23272a" : "#fff",
            borderRadius: "10px",
            padding: "16px",
            border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              type="text"
              name="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search for a product..."
              style={{
                width: "100%",
                padding: "10px 12px",
                paddingRight: isSearching ? "40px" : "12px",
                borderRadius: "6px",
                border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
                fontSize: "0.95rem",
                boxSizing: "border-box",
                backgroundColor: theme === "dark" ? "#23272a" : "#fff",
                color: theme === "dark" ? "white" : "#222",
              }}
            />
            {isSearching && (
              <div
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: theme === "dark" ? "white" : "#222",
                  fontSize: "14px",
                }}
              >
                🔍
              </div>
            )}
          </div>
          {isSearching ? (
            <div
              style={{
                color: theme === "dark" ? "white" : "#222",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
              }}
            >
              Searching products...
            </div>
          ) : filteredCatalog && filteredCatalog.length > 0 ? (
            filteredCatalog?.map((item, idx) => (
              <CatalogItem
                item={item}
                key={idx}
                handleProductClick={handleProductClick}
                theme={theme}
              />
            ))
          ) : search.trim() ? (
            <div
              style={{
                color: theme === "dark" ? "white" : "#222",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
              }}
            >
              No products found for "{search}"
            </div>
          ) : (
            <div style={{ color: theme === "dark" ? "white" : "#222" }}>
              No products available.
            </div>
          )}
        </div>
      </section>

      {/* Notes Section */}
      <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          Notes
        </h2>
        <div
          style={{
            background: theme === "dark" ? "#23272a" : "#fff",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            padding: "16px",
            border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          <textarea
            style={{
              width: "100%",
              minHeight: "80px",
              borderRadius: "6px",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
              padding: "10px",
              resize: "vertical",
              fontSize: "1rem",
              color: theme === "dark" ? "white" : "#222",
              background: theme === "dark" ? "#23272a" : "#fff",
              boxSizing: "border-box",
            }}
            placeholder="Type your notes here..."
            value={notes || ""}
            onChange={(e) => onNotesChange && onNotesChange(e.target.value)}
          />
        </div>
      </section>

      <CustomerSupportMessages />
    </div>
  );
};

export default ChatSidebar;
