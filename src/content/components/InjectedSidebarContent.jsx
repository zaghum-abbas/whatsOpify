import React, { useMemo, useState, useEffect } from "react";
import ModalForm from "./ModalForm";
import CustomerSupportMessages from "./CustomerSupportMessages";
import OrdersSection from "./OrdersSection";
import { formatPrice, getToken } from "../../core/utils/helperFunctions";
import { useDebounce } from "../../hooks/useDebounce";
const getTheme = () => {
  // Try to detect WhatsApp dark mode from body class or style
  const body = document.body;
  const isDark =
    (body.classList.contains("web") && body.classList.contains("dark")) ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return isDark
    ? {
        bg: "#18191a",
        card: "#23272a",
        text: "#e4e6eb",
        subText: "#b0b3b8",
        accent: "#00bfae",
        border: "#333",
      }
    : {
        bg: "#f7f7f7",
        card: "#fff",
        text: "#222",
        subText: "#555",
        accent: "#00bfae",
        border: "#e2e8f0",
      };
};

const StoreItem = ({ store }) => {
  const theme = getTheme();

  // Default to active status unless explicitly marked as inactive
  const isActive =
    // Only mark as inactive if explicitly set to inactive values
    !(
      store.status === "inactive" ||
      store.status === "Inactive" ||
      store.status === "INACTIVE" ||
      store.status === "disabled" ||
      store.status === "Disabled" ||
      store.isActive === false ||
      store.active === false ||
      store.enabled === false ||
      store.is_active === false
    );

  console.log(
    "[STORE] Store status check for:",
    store.name || store.store_name,
    "- defaulting to ACTIVE"
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: theme.card,
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        padding: "12px 16px",
        marginBottom: "12px",
        border: `1px solid ${theme.border}`,
      }}
    >
      {/* Store Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "1.2em", color: theme.accent }}>🏪</span>
          <div style={{ color: theme.text, fontWeight: 600, fontSize: "1rem" }}>
            {store.name || store.store_name || "Unnamed Store"}
          </div>
        </div>
        <div
          style={{
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "0.75em",
            fontWeight: 600,
            textTransform: "uppercase",
            backgroundColor: isActive ? "#dcfce7" : "#fef2f2",
            color: isActive ? "#166534" : "#dc2626",
            border: `1px solid ${isActive ? "#bbf7d0" : "#fecaca"}`,
          }}
        >
          {isActive ? "Active" : "Inactive"}
        </div>
      </div>

      {/* Store Details */}
      <div
        style={{ fontSize: "0.85em", color: theme.subText, lineHeight: "1.4" }}
      >
        {store.description && (
          <div style={{ marginBottom: "4px" }}>
            {store.description.length > 80
              ? store.description.substring(0, 80) + "..."
              : store.description}
          </div>
        )}
        {store.email && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginBottom: "2px",
            }}
          >
            <span>📧</span>
            <span>{store.email}</span>
          </div>
        )}
        {store.category && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span>🏷️</span>
            <span>{store.category}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const CatalogItem = ({ item, handleProductClick }) => {
  const theme = getTheme();

  return (
    <div
      onClick={() => handleProductClick(item)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: theme.card,
        borderRadius: "8px",
        // boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        padding: "12px",
        marginBottom: "12px",
        border: `1px solid ${theme.border}`,
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
          // backgroundColor: theme.bg,
          border: `1px solid ${theme.border}`,
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
              color: theme.accent,
            }}
          >
            🛒
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: theme.text,
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
        {/* {item.description && (
          <div
            style={{
              color: theme.subText,
              fontSize: "0.8em",
              marginBottom: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.description}
          </div>
        )} */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.8em",
          }}
        >
          {item.vendor && (
            <span style={{ color: theme.subText }}>👤 {item.vendor}</span>
          )}
          {item.category && (
            <span style={{ color: theme.subText }}>🏷️ {item.category}</span>
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
            color: theme.accent,
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
            color: theme.subText,
            fontStyle: "italic",
          }}
        >
          Click to add
        </div>
      </div>
    </div>
  );
};

const InjectedSidebarContent = ({
  catalog = [],
  stores = [],
  notes = "",
  onNotesChange,
  userInfo = null,
  showOrderForm = false,
  onOrderFormToggle,
}) => {
  const theme = useMemo(getTheme, []);
  const [isLoading, setIsLoading] = useState(true);
  const [contact, setContact] = useState(null);
  const [showOrders, setShowOrders] = useState(false);
  const [search, setSearch] = useState("");
  const [filteredCatalog, setFilteredCatalog] = useState(catalog);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search input
  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    const extractContactInfo = () => {
      try {
        console.log("[CONTACT_EXTRACTION] Starting contact info extraction...");

        // Try multiple selectors to find contact info
        let contactInfoPanel = null;
        let name = "Unknown";
        let phone = "Not available";
        let about = "No status available";

        // Method 1: Look for contact info header
        const contactInfoHeaders = [
          "User info",
          "Contact info",
          "Profile",
          "Contact details",
        ];

        for (const headerText of contactInfoHeaders) {
          const contactInfoHeader = Array.from(
            document.querySelectorAll("div, span")
          ).find((el) => el.textContent.trim() === headerText);

          if (contactInfoHeader) {
            console.log(`[CONTACT_EXTRACTION] Found header: ${headerText}`);
            contactInfoPanel =
              contactInfoHeader.closest("header")?.parentElement
                ?.parentElement ||
              contactInfoHeader.closest("div[data-testid*='contact']") ||
              contactInfoHeader.closest("div[role='region']");
            break;
          }
        }

        // Method 2: Look for conversation header directly
        if (!contactInfoPanel) {
          const conversationHeader =
            document.querySelector('[data-testid="conversation-header"]') ||
            document.querySelector('header[role="banner"]') ||
            document.querySelector('[data-testid="chat-header"]');

          if (conversationHeader) {
            console.log("[CONTACT_EXTRACTION] Found conversation header");
            contactInfoPanel = conversationHeader;
          }
        }

        // Method 3: Look for any header with contact-like content
        if (!contactInfoPanel) {
          const allHeaders = document.querySelectorAll(
            'header, [role="banner"], [data-testid*="header"]'
          );
          for (const header of allHeaders) {
            const hasContactInfo =
              header.textContent.includes("+") ||
              header.querySelector('span[dir="auto"]') ||
              header.textContent.trim().length > 0;
            if (hasContactInfo) {
              console.log(
                "[CONTACT_EXTRACTION] Found potential contact header"
              );
              contactInfoPanel = header;
              break;
            }
          }
        }

        if (contactInfoPanel) {
          console.log(
            "[CONTACT_EXTRACTION] Contact panel found, extracting info..."
          );

          // Extract Name - try multiple selectors
          const nameSelectors = [
            'span[dir="auto"].x1rg5ohu',
            'span[dir="auto"]',
            '[data-testid="conversation-header"] span',
            'header span[dir="auto"]:first-child',
          ];

          for (const selector of nameSelectors) {
            const nameElement = contactInfoPanel.querySelector(selector);
            if (
              nameElement &&
              nameElement.textContent.trim() &&
              !nameElement.textContent.match(/\+[\d\s]+/)
            ) {
              name = nameElement.textContent.trim();
              console.log(`[CONTACT_EXTRACTION] Found name: ${name}`);
              break;
            }
          }

          // Extract Phone Number - look for + pattern
          const phoneElement = Array.from(
            contactInfoPanel.querySelectorAll('span[dir="auto"], div')
          ).find((el) => el.textContent.match(/\+[\d\s\-\(\)]+/));

          if (phoneElement) {
            phone = phoneElement.textContent.trim();
            console.log(`[CONTACT_EXTRACTION] Found phone: ${phone}`);
          }

          // Extract About/Status - look for status section
          const aboutHeaders = ["About", "Status", "Bio"];
          for (const aboutHeaderText of aboutHeaders) {
            const aboutHeader = Array.from(
              contactInfoPanel.querySelectorAll("div, span")
            ).find((el) => el.textContent.trim() === aboutHeaderText);

            if (aboutHeader) {
              const aboutText = aboutHeader
                .closest("div")
                ?.nextElementSibling?.querySelector('span[dir="auto"]')
                ?.textContent.trim();
              if (aboutText) {
                about = aboutText;
                console.log(`[CONTACT_EXTRACTION] Found about: ${about}`);
                break;
              }
            }
          }
        } else {
          console.warn(
            "[CONTACT_EXTRACTION] No contact info panel found, using defaults"
          );
        }

        setContact({ name, phone, about });
        setIsLoading(false);
        console.log(
          "[CONTACT_EXTRACTION] Contact extraction completed successfully"
        );
      } catch (error) {
        console.error(
          "[CONTACT_EXTRACTION] Error extracting contact info:",
          error
        );
        setContact({
          name: "Unknown contact",
          phone: "Not available",
          about: "No status available",
        });
        setIsLoading(false);
      }
    };

    // Initial extraction with delay to ensure DOM is ready
    const timeoutId = setTimeout(extractContactInfo, 1000);

    // Set up observer to detect when contact info changes
    const observer = new MutationObserver(() => {
      // Debounce the extraction to avoid too many calls
      clearTimeout(timeoutId);
      setTimeout(extractContactInfo, 500);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  // Set up global function to show orders section
  useEffect(() => {
    window.showOrdersSection = () => {
      setShowOrders(true);
    };
    return () => {
      delete window.showOrdersSection;
    };
  }, []);

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
        token: getToken(),
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

  console.log(catalog, "catalog");

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "inherit",
        background: theme.bg,
        minHeight: "100vh",
      }}
    >
      {/* User Info Section */}
      {userInfo && (
        <section style={{ marginBottom: "28px" }}>
          <h2
            style={{
              marginBottom: "12px",
              fontSize: "1.1rem",
              color: theme.text,
            }}
          >
            User Account
          </h2>
          <div
            style={{
              background: theme.card,
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              padding: "16px",
              fontSize: "0.98rem",
              color: theme.text,
              border: `1px solid ${theme.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "1.1em" }}>👤</span>
              <strong>Name:</strong>
              <span
                style={{ color: userInfo?.name ? theme.text : theme.subText }}
              >
                {userInfo?.name || userInfo?.username || "Not available"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "1.1em" }}>📧</span>
              <strong>Email:</strong>
              <span
                style={{ color: userInfo?.email ? theme.text : theme.subText }}
              >
                {userInfo?.email || "Not available"}
              </span>
            </div>
            {userInfo?.role && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "1.1em" }}>🏷️</span>
                <strong>Role:</strong>
                <span
                  style={{
                    color: theme.accent,
                    textTransform: "capitalize",
                    fontWeight: 500,
                  }}
                >
                  {userInfo.role}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme.text,
          }}
        >
          User Info
        </h2>
        <div
          style={{
            background: theme.card,
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            padding: "16px",
            fontSize: "0.98rem",
            color: theme.text,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            border: `1px solid ${theme.border}`,
          }}
        >
          <div>
            <strong>Name:</strong>{" "}
            <span style={{ color: contact?.name ? theme.text : theme.subText }}>
              {contact?.name || "Not available"}
            </span>
          </div>
          <div>
            <strong>Phone:</strong>{" "}
            <span
              style={{ color: contact?.phone ? theme.text : theme.subText }}
            >
              {contact?.phone || "Not available"}
            </span>
          </div>
          <div>
            <strong>About:</strong>{" "}
            <span
              style={{ color: contact?.about ? theme.text : theme.subText }}
            >
              {contact?.about || "Not available"}
            </span>
          </div>
        </div>
      </section> */}

      {/* Orders Section - Always visible */}
      <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme.text,
          }}
        >
          Orders
        </h2>
        <div
          style={{
            background: theme.card,
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            border: `1px solid ${theme.border}`,
          }}
        >
          <OrdersSection />
        </div>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme.text,
          }}
        >
          My Stores
        </h2>
        <div
          style={{
            background: theme.card,
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            padding: "16px",
            border: `1px solid ${theme.border}`,
          }}
        >
          {stores && stores.length > 0 ? (
            stores.map((store, idx) => <StoreItem store={store} key={idx} />)
          ) : (
            <div style={{ color: theme.subText }}>No stores available.</div>
          )}
        </div>
      </section>

      <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme.text,
          }}
        >
          Catalog
        </h2>
        <div
          style={{
            background: theme.card,
            borderRadius: "10px",
            // boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            padding: "16px",
            border: `1px solid ${theme.border}`,
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
                border: `1px solid ${theme.border}`,
                fontSize: "0.95rem",
                boxSizing: "border-box",
                backgroundColor: theme.bg,
                color: theme.text,
              }}
            />
            {isSearching && (
              <div
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: theme.accent,
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
                color: theme.subText,
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
              />
            ))
          ) : search.trim() ? (
            <div
              style={{
                color: theme.subText,
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
              }}
            >
              No products found for "{search}"
            </div>
          ) : (
            <div style={{ color: theme.subText }}>No products available.</div>
          )}
        </div>
      </section>

      {/* Order Form Section - Only shown when triggered from top toolbar */}
      {showOrderForm && (
        <section style={{ marginBottom: "28px" }}>
          <h2
            style={{
              marginBottom: "12px",
              fontSize: "1.1rem",
              color: theme.text,
            }}
          >
            Create New Order
          </h2>
          <div
            style={{
              background: theme.card,
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              padding: "16px",
              border: `1px solid ${theme.border}`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <button
                onClick={() => onOrderFormToggle && onOrderFormToggle(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.subText,
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  // padding: "4px",
                }}
              >
                ✕
              </button>
            </div>

            <ModalForm
              onClose={() => onOrderFormToggle && onOrderFormToggle(false)}
              initialData={{
                name: contact?.name || "",
                phone: contact?.phone || "",
              }}
            />
          </div>
        </section>
      )}

      <section style={{ marginBottom: "28px" }}>
        <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme.text,
          }}
        >
          Notes
        </h2>
        <div
          style={{
            background: theme.card,
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            padding: "16px",
            border: `1px solid ${theme.border}`,
          }}
        >
          <textarea
            style={{
              width: "100%",
              minHeight: "80px",
              borderRadius: "6px",
              border: `1px solid ${theme.border}`,
              padding: "10px",
              resize: "vertical",
              fontSize: "1rem",
              color: theme.text,
              background: theme.bg,
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

export default InjectedSidebarContent;
