import React, { useMemo, useState, useEffect } from "react";
import ModalForm from "./ModalForm";
import CustomerSupportMessages from "./CustomerSupportMessages";
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

const CatalogItem = ({ item }) => {
  const theme = getTheme();

  const handleProductClick = () => {
    console.log("[PRODUCT] Product clicked:", item.name);

    // Create product message with details
    const productMessage =
      `🛒 *${item.name}*\n\n` +
      `💰 *Price:* ${item.price}\n` +
      (item.description ? `📝 *Description:* ${item.description}\n` : "") +
      (item.vendor ? `👤 *Vendor:* ${item.vendor}\n` : "") +
      (item.category ? `🏷️ *Category:* ${item.category}\n` : "") +
      `\n✨ _Sent from Whatsopify Product Catalog_`;

    // Send message to current chat (including image if available)
    if (window.sendMessageToCurrentChat) {
      window.sendMessageToCurrentChat(productMessage, item);
    } else {
      console.warn("[PRODUCT] sendMessageToCurrentChat function not available");
      // Fallback: copy to clipboard
      navigator.clipboard
        .writeText(productMessage)
        .then(() => {
          console.log("[PRODUCT] Product details copied to clipboard");
          alert("Product details copied to clipboard! Paste in the chat.");
        })
        .catch((err) => {
          console.error("[PRODUCT] Failed to copy to clipboard:", err);
        });
    }
  };

  return (
    <div
      onClick={handleProductClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: theme.card,
        borderRadius: "8px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
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
      {/* Product Image */}
      <div
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "6px",
          overflow: "hidden",
          backgroundColor: theme.bg,
          border: `1px solid ${theme.border}`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {item.image ? (
          <img
            src={item.image}
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
        ) : null}
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
      </div>

      {/* Product Details */}
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
          {item.name}
        </div>
        {item.description && (
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
        )}
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
          {item.price}
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

  useEffect(() => {
    const extractContactInfo = () => {
      try {
        // Find the contact info panel
        const contactInfoHeader = Array.from(
          document.querySelectorAll("div")
        ).find((el) => el.textContent.trim() === "User info");

        if (!contactInfoHeader) {
          throw new Error("Contact info panel not found");
        }

        const contactInfoPanel =
          contactInfoHeader.closest("header")?.parentElement?.parentElement;
        if (!contactInfoPanel) {
          throw new Error("Could not locate contact info container");
        }

        // Extract Name
        const nameElement = contactInfoPanel.querySelector(
          'span[dir="auto"].x1rg5ohu'
        );
        const name = nameElement?.textContent.trim() || "Unknown";

        // Extract Phone Number
        const phoneElement = Array.from(
          contactInfoPanel.querySelectorAll('span[dir="auto"]')
        ).find((el) => el.textContent.match(/\+[\d\s]+/));
        const phone = phoneElement?.textContent.trim() || "Not available";

        // Extract About
        const aboutHeader = Array.from(
          contactInfoPanel.querySelectorAll("div")
        ).find((el) => el.textContent.trim() === "About");
        const about =
          aboutHeader
            ?.closest("div")
            ?.nextElementSibling?.querySelector('span[dir="auto"]')
            ?.textContent.trim() || "No status";

        setContact({ name, phone, about });
        setIsLoading(false);
      } catch (error) {
        console.error("Error extracting contact info:", error);
        setContact({
          name: "Unknown contact",
          phone: "Not available",
          about: "No status available",
        });
        setIsLoading(false);
      }
    };

    // Initial extraction
    extractContactInfo();

    // Set up observer to detect when contact info changes
    const observer = new MutationObserver(extractContactInfo);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false,
    });

    return () => observer.disconnect();
  }, []);

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

      <section style={{ marginBottom: "28px" }}>
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
            <strong>Address:</strong>{" "}
            <span
              style={{ color: contact?.phone ? theme.text : theme.subText }}
            >
              {contact?.phone || "Not available"}
            </span>
          </div>
          <div>
            <strong>City:</strong>{" "}
            <span
              style={{ color: contact?.phone ? theme.text : theme.subText }}
            >
              {contact?.phone || "Not available"}
            </span>
          </div>
        </div>
      </section>

      {/* <section style={{ marginBottom: '28px' }}>
        <h2 style={{ marginBottom: '12px', fontSize: '1.1rem', color: theme.text }}>My Stores</h2>
        <div style={{ background: theme.card, borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '16px', border: `1px solid ${theme.border}` }}>
          {stores && stores.length > 0 ? (
            stores.map((store, idx) => (
              <StoreItem store={store} key={idx} />
            ))
          ) : (
            <div style={{ color: theme.subText }}>No stores available.</div>
          )}
        </div>
      </section> */}

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
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            padding: "16px",
            border: `1px solid ${theme.border}`,
          }}
        >
          {catalog && catalog.length > 0 ? (
            catalog.map((item, idx) => <CatalogItem item={item} key={idx} />)
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
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  color: theme.text,
                }}
              >
                Order Details
              </h3>
              <button
                onClick={() => onOrderFormToggle && onOrderFormToggle(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: theme.subText,
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  padding: "4px",
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

      <section>
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
