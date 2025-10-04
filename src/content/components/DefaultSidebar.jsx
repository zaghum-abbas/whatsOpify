import React, { useMemo } from "react";
import OrdersSection from "./OrdersSection";
import ModalForm from "./ModalForm";
import { formatPrice } from "../../core/utils/helperFunctions";

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
  const isActive = !(
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

const DefaultSidebar = ({
  userInfo = null,
  stores = [],
  notes = "",
  onNotesChange,
  showOrderForm = false,
  onOrderFormToggle,
}) => {
  const theme = useMemo(getTheme, []);

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

      {/* My Stores Section */}
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
                }}
              >
                ✕
              </button>
            </div>

            <ModalForm
              onClose={() => onOrderFormToggle && onOrderFormToggle(false)}
              initialData={{
                name: "",
                phone: "",
              }}
            />
          </div>
        </section>
      )}

      {/* Notes Section */}
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
    </div>
  );
};

export default DefaultSidebar;
