import React, { useMemo, useState, useEffect } from "react";
import CustomerSupportMessages from "./CustomerSupportMessages";
import { formatPrice } from "../../core/utils/helperFunctions";
import { useDebounce } from "../../hooks/useDebounce";
import { useTheme, getThemeColors } from "../../hooks/useTheme";

const CatalogItem = ({ item, handleProductClick, theme }) => {
  const colors = getThemeColors(theme);

  return (
    <div
      onClick={() => handleProductClick(item)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: colors.card,
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "12px",
        border: `1px solid ${colors.border}`,
        cursor: "pointer",
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
            src={item.images[0]?.url}
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

      {/* Price and Click Indicator */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            color: theme === "dark" ? "white" : "#222",
            fontWeight: 700,
            fontSize: "1rem",
            marginBottom: "4px",
          }}
        >
          Rs. {formatPrice(item?.variants?.[0]?.price)}
        </div>
        <div
          style={{
            fontSize: "0.7em",
            color: theme === "dark" ? "white" : "#222",
            fontStyle: "italic",
          }}
        >
          Click to add
        </div>
      </div>
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

  // Debounce search input
  const debouncedSearch = useDebounce(search, 500);

  const handleSearchChange = (e) => {
    const searchTerm = e.target.value;
    setSearch(searchTerm);
    setIsSearching(true);
  };

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
      {console.log("contact", contact)}
      {/* Contact Info Section */}
      {contact && (
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
                  {contact?.name || "Not available"}
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
                  {contact?.phone ? `${contact.phone}` : ""}
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
