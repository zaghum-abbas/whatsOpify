import React from "react";
import ModalForm from "./ModalForm";
import { useTheme } from "../../hooks/useTheme";

const OrderFormSidebar = ({
  contact = { name: "", phone: "", about: "" },
  onClose,
}) => {
  const theme = useTheme();

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "inherit",
        background: theme === "dark" ? "#18191a" : "#fff",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          paddingBottom: "15px",
          borderBottom: `2px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "1.5rem",
            color: theme === "dark" ? "white" : "#222",
            fontWeight: "600",
          }}
        >
          📝 Create New Order
        </h2>
        <button
          onClick={() => {
            // Switch back to chat sidebar or default sidebar
            if (typeof window.switchToChatSidebar === "function") {
              window.switchToChatSidebar(contact);
            }
          }}
          style={{
            background: theme === "dark" ? "#333" : "#f0f0f0",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: "0.9rem",
            color: theme === "dark" ? "white" : "#333",
            fontWeight: "500",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = theme === "dark" ? "#444" : "#e0e0e0";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = theme === "dark" ? "#333" : "#f0f0f0";
          }}
        >
          ← Back
        </button>
      </div>

      {/* Contact Info Card (if available) */}
      {contact && (contact.name || contact.phone) && (
        <div
          style={{
            background: theme === "dark" ? "#23272a" : "#f9fafb",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "20px",
            border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
          }}
        >
          <h3
            style={{
              margin: "0 0 12px 0",
              fontSize: "1rem",
              color: theme === "dark" ? "white" : "#222",
              fontWeight: "600",
            }}
          >
            Customer Information
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "0.9rem",
              color: theme === "dark" ? "#b0b3b8" : "#555",
            }}
          >
            {contact.name && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "1.1em" }}>👤</span>
                <strong style={{ color: theme === "dark" ? "white" : "#222" }}>
                  Name:
                </strong>
                <span>{contact.name}</span>
              </div>
            )}
            {contact.phone && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <span style={{ fontSize: "1.1em" }}>📞</span>
                <strong style={{ color: theme === "dark" ? "white" : "#222" }}>
                  Phone:
                </strong>
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order Form Section */}
      <div
        style={{
          background: theme === "dark" ? "#23272a" : "#fff",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          padding: "20px",
          border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
          flex: 1,
        }}
      >
        <ModalForm
          onClose={() => {
            // Switch back to chat sidebar after order is created
            if (typeof window.switchToChatSidebar === "function") {
              window.switchToChatSidebar(contact);
            }
          }}
          initialData={{
            name: contact?.name || "",
            phone: contact?.phone || "",
          }}
          theme={theme}
        />
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: "20px",
          padding: "15px",
          background: theme === "dark" ? "#23272a" : "#f9fafb",
          borderRadius: "8px",
          border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
          fontSize: "0.85rem",
          color: theme === "dark" ? "#b0b3b8" : "#666",
          textAlign: "center",
        }}
      >
        ℹ️ Fill out the form to create a new order for this customer. The order
        will be sent to WhatsApp upon completion.
      </div>
    </div>
  );
};

export default OrderFormSidebar;




