import React, { useState } from "react";
import ModalForm from "./ModalForm";
import { useTheme } from "../../hooks/useTheme";
import { getToken } from "../../core/utils/helperFunctions";

const OrderFormSidebar = ({
  contact = { name: "", phone: "", about: "" },
  onClose,
}) => {
  const theme = useTheme();
  const [orderDetails, setOrderDetails] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "inherit",
        background: theme === "dark" ? "#18191a" : "#fff",
        // minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header Section */}
      {/* <div
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
      </div> */}

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
          // flex: 1,
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

      <div
        style={{
          marginTop: "20px",
          background: theme === "dark" ? "#23272a" : "#fff",
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          padding: "20px",
          border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
        }}
      >
        <label
          style={{
            display: "block",
            marginBottom: "10px",
            fontSize: "0.95rem",
            fontWeight: "500",
            color: theme === "dark" ? "white" : "#222",
          }}
        >
         Create Orders
        </label>
        <textarea
          value={orderDetails}
          onChange={(e) => {
            setOrderDetails(e.target.value);
            // Clear messages when user starts typing
            if (error) setError("");
            if (success) setSuccess("");
          }}
          placeholder="Write the order details here..."
          rows={4}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: `1px solid ${theme === "dark" ? "#444" : "#ddd"}`,
            fontSize: "0.95rem",
            fontFamily: "inherit",
            backgroundColor: theme === "dark" ? "#18191a" : "#fff",
            color: theme === "dark" ? "white" : "#222",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        
        {/* Error Message - Show under textarea */}
        {error && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              backgroundColor: theme === "dark" ? "#4b1f1f" : "#fee",
              border: `1px solid ${theme === "dark" ? "#722" : "#fcc"}`,
              borderRadius: "6px",
              color: theme === "dark" ? "#ff9999" : "#c33",
              fontSize: "0.9rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Success Message - Show under textarea */}
        {success && (
          <div
            style={{
              marginTop: "12px",
              padding: "12px",
              backgroundColor: theme === "dark" ? "#1f4b1f" : "#efe",
              border: `1px solid ${theme === "dark" ? "#272" : "#cfc"}`,
              borderRadius: "6px",
              color: theme === "dark" ? "#99ff99" : "#3c3",
              fontSize: "0.9rem",
            }}
          >
            {success}
          </div>
        )}
      </div>

      {/* Create Order Button */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "center",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={async () => {
            try {
              setIsCreating(true);
              setError("");
              setSuccess("");

              if (!orderDetails.trim()) {
                setError("Please enter order details");
                setIsCreating(false);
                return;
              }

              const token = getToken();
              if (!token) {
                setError("Authentication required. Please log in again.");
                setIsCreating(false);
                return;
              }

              // Send payload as JSON string
              const response = await fetch(
                "https://api.shopilam.com/api/v1/orders/orders/create-from-message",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify(orderDetails.trim()), // Send as string
                }
              );

              // Handle response
              const data = await response.json();

              console.log("@@data", data);

              if (response.ok) {
                console.log("✅ Order created from message:", data);
                const successMessage = data.message || data.data?.message || "Order created successfully!";
                setSuccess(successMessage);
                // Clear the textarea after successful creation
                setTimeout(() => {
                  setOrderDetails("");
                  setSuccess("");
                }, 3000);
              } else {
                // Handle error response
                const errorMessage = 
                  data.message || 
                  data.detail || 
                  data.error || 
                  `Failed to create order (Status: ${response.status})`;
                setError(errorMessage);
                console.error("❌ Order creation failed:", errorMessage);
              }
            } catch (error) {
              console.error("❌ Error creating order:", error);
              setError(
                error.message || "An error occurred while creating the order. Please try again."
              );
            } finally {
              setIsCreating(false);
            }
          }}
          disabled={isCreating}
          style={{
            width: "100%",
            padding: "14px 24px",
            backgroundColor: isCreating ? "#6b7280" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "1rem",
            fontWeight: "600",
            cursor: isCreating ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            opacity: isCreating ? 0.7 : 1,
          }}
        >
          {isCreating ? "Creating Order..." : "Create Order"}
        </button>
      </div>

      {/* Footer Info */}
      {/* <div
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
      </div> */}
    </div>
  );
};

export default OrderFormSidebar;
