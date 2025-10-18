import React, { useState } from "react";
import StoreSelectionModal from "./StoreSelectionModal";

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showStoreSelection, setShowStoreSelection] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const requestData = {
        email: email.trim(),
        password: password,
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/v1/auth/signin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "WhatsappWeb-Extension/1.0",
            user: "ext",
          },
          body: JSON.stringify(requestData),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        localStorage.setItem("whatsopify_token", JSON.stringify(responseData));
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "whatsopify_token",
            newValue: responseData,
          })
        );

        // Check if user has stores and show store selection modal
        const hasStores =
          responseData?.data?.stores &&
          Array.isArray(responseData.data.stores) &&
          responseData.data.stores.length > 0;

        if (hasStores) {
          // If only one store, auto-select it
          if (responseData.data.stores.length === 1) {
            const singleStore = responseData.data.stores[0];
            const storeId = singleStore._id;

            // Save selected store to localStorage
            localStorage.setItem(
              "whatsopify_selected_store",
              JSON.stringify(singleStore)
            );

            // Update global store ID
            window.whatsapofyProducts.storeId = storeId;

            // Dispatch store change event to notify other components (this will trigger API calls)
            window.dispatchEvent(
              new CustomEvent("storeChanged", {
                detail: { storeId, store: singleStore },
              })
            );

            // Open sidebar after store selection
            if (typeof window.toggleWhatsappSidebar === "function") {
              window.toggleWhatsappSidebar(true);
              console.log("[LOGIN] Sidebar opened after store auto-selection");
            }

            // Proceed with login
            if (onLoginSuccess) {
              onLoginSuccess();
            }
            onClose();
          } else {
            // Multiple stores, show store selection modal
            setShowStoreSelection(true);
          }
        } else {
          // No stores available, proceed with login
          if (onLoginSuccess) {
            onLoginSuccess();
          }
          onClose();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log("❌ Login failed:", response.status, errorData);

        let errorMessage = "Login failed";
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        } else if (response.status === 401) {
          errorMessage = "Invalid Email Or Password";
        } else if (response.status === 404) {
          errorMessage = "Account does not exist";
        } else if (response.status === 403) {
          errorMessage = "Access forbidden";
        } else if (response.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }

        setError(errorMessage);
      }
    } catch (error) {
      console.error("❌ Network error:", error);
      setError("Network error: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStoreSelect = (selectedStore) => {
    console.log("Store selected:", selectedStore);
    setShowStoreSelection(false);

    if (onLoginSuccess) {
      onLoginSuccess();
    }
    onClose();
  };

  const handleStoreSelectionClose = () => {
    setShowStoreSelection(false);
    onClose();
    // Don't close the login modal, let user try again
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          width: "100%",
          maxWidth: "400px",
          margin: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0, color: "#333" }}>Login to Whatsopify</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              cursor: "pointer",
              color: "#666",
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#555",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#555",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "#ffebee",
                color: "#c62828",
                padding: "8px",
                borderRadius: "4px",
                marginBottom: "15px",
              }}
            >
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: isLoading ? "#ccc" : "#20c997",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      {/* Store Selection Modal */}
      <StoreSelectionModal
        isOpen={showStoreSelection}
        onStoreSelect={handleStoreSelect}
        onClose={handleStoreSelectionClose}
      />
    </div>
  );
};

export default LoginModal;
