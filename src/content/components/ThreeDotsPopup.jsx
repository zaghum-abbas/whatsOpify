import React, { useEffect, useRef, useState } from "react";

const ThreeDotsPopup = ({
  isOpen,
  onClose,
  position = { top: 0, right: 0 },
  isAuthenticated = false,
  onSettingsClick = () => {},
  onLogoutClick = () => {},
  onLoginClick = () => {},
  onSwitchStoreClick = () => {},
  onAddProductsClick = () => {},
  onCreateOrderClick = () => {},
  onOrdersClick = () => {},
}) => {
  const popupRef = useRef(null);

  const [userDetails, setUserDetails] = useState({
    userEmail: "",
    userSelectedStore: "",
  });

  useEffect(() => {
    const savedStore = JSON.parse(
      localStorage.getItem("whatshopify_selected_store")
    );
    const userInfo = JSON.parse(localStorage.getItem("whatshopify_token"));
    console.log("userInfo", userInfo?.data);
    setUserDetails({
      userEmail: userInfo?.data?.user?.email,
      userSelectedStore: savedStore?.name || "",
    });
  }, [
    localStorage.getItem("whatshopify_token"),
    localStorage.getItem("whatshopify_selected_store"),
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const openChatWithNumber = (phoneNumber) => {
    try {
      console.log(`📱 Opening direct chat with number: ${phoneNumber}`);

      // Format the phone number - remove all non-digits
      const cleanedNumber = phoneNumber.replace(/\D/g, "");
      console.log(`🔍 Cleaned number: ${cleanedNumber}`);

      // Direct URL approach - this will open the chat directly
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanedNumber}`;
      console.log(`🔗 Direct WhatsApp URL: ${whatsappUrl}`);

      // Navigate directly to the chat URL
      window.location.href = whatsappUrl;

      console.log("✅ Direct chat opened!");
    } catch (error) {
      console.error("❌ Error opening chat:", error);
    }
  };

  const handleMenuItemClick = (action) => {
    console.log(`Clicked on: ${action}`);
    // You can add specific functionality for each menu item here
    switch (action) {
      case "billing":
        // Handle billing action - redirect to shopilam.com
        console.log("Opening billing page...");
        window.open("https://shopilam.com", "_blank");
        break;
      case "about":
        // Handle about us action - redirect to shopilam.com
        console.log("Opening about us page...");
        window.open("https://shopilam.com", "_blank");
        break;
      case "contact":
        // Handle contact us action - open chat with your number
        console.log("Opening chat with contact number...");
        openChatWithNumber("+923039551524");
        break;
      default:
        break;
    }
    onClose();
  };

  return (
    <div
      ref={popupRef}
      style={{
        position: "absolute",
        top: `${position.top}px`,
        right: `${position.right}px`,
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: 10001,
        minWidth: "160px",
        padding: "8px 0",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      {console.log("userDetails", userDetails)}
      {userDetails.userEmail && userDetails.userSelectedStore && (
        <div
          style={{ padding: "12px 16px", fontSize: "14px", color: "#374151" }}
        >
          <div style={{ marginBottom: "4px" }}>
            Email: {userDetails.userEmail}
          </div>
          <div>Store: {userDetails.userSelectedStore}</div>
        </div>
      )}
      <button
        onClick={() => handleMenuItemClick("billing")}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "none",
          backgroundColor: "transparent",
          textAlign: "left",
          cursor: "pointer",
          fontSize: "14px",
          color: "#374151",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
        }}
      >
        <span style={{ fontSize: "16px" }}>💳</span>
        Billing
      </button>
      <button
        onClick={() => handleMenuItemClick("about")}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "none",
          backgroundColor: "transparent",
          textAlign: "left",
          cursor: "pointer",
          fontSize: "14px",
          color: "#374151",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
        }}
      >
        <span style={{ fontSize: "16px" }}>ℹ️</span>
        About US
      </button>
      <button
        onClick={() => handleMenuItemClick("contact")}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "none",
          backgroundColor: "transparent",
          textAlign: "left",
          cursor: "pointer",
          fontSize: "14px",
          color: "#374151",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
        }}
      >
        <span style={{ fontSize: "16px" }}>📞</span>
        Contact US
      </button>
      {/* Divider */}
      <div
        style={{
          height: "1px",
          backgroundColor: "#e5e7eb",
          margin: "8px 0",
        }}
      />
      {/* Add Products Button - Only show when authenticated */}
      {isAuthenticated && (
        <button
          onClick={() => {
            onAddProductsClick();
            onClose();
          }}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "none",
            backgroundColor: "transparent",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
            color: "#10B981",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "background-color 0.2s",
            fontWeight: "500",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
          }}
        >
          <span style={{ fontSize: "16px" }}>🛍️</span>
          Add Products
        </button>
      )}
      {/* Create Order Button - Only show when authenticated */}
      {isAuthenticated && (
        <button
          onClick={() => {
            onCreateOrderClick();
            onClose();
          }}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "none",
            backgroundColor: "transparent",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
            color: "#3B82F6",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "background-color 0.2s",
            fontWeight: "500",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
          }}
        >
          <span style={{ fontSize: "16px" }}>📝</span>
          Create Order
        </button>
      )}
      {/* Orders Button - Only show when authenticated */}
      {isAuthenticated && (
        <button
          onClick={() => {
            onOrdersClick();
            onClose();
          }}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "none",
            backgroundColor: "transparent",
            textAlign: "left",
            cursor: "pointer",
            fontSize: "14px",
            color: "#8B5CF6",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "background-color 0.2s",
            fontWeight: "500",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
          }}
        >
          <span style={{ fontSize: "16px" }}>📋</span>
          Orders
        </button>
      )}
      {/* Divider */}
      <div
        style={{
          height: "1px",
          backgroundColor: "#e5e7eb",
          margin: "8px 0",
        }}
      />
      {/* Settings Button */}
      <button
        onClick={() => {
          onSettingsClick();
          onClose();
        }}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "none",
          backgroundColor: "transparent",
          textAlign: "left",
          cursor: "pointer",
          fontSize: "14px",
          color: "#374151",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
        }}
      >
        <span style={{ fontSize: "16px" }}>⚙️</span>
        Settings
      </button>
      {/* Switch Store Button - Only show when authenticated */}
      {isAuthenticated &&
        JSON.parse(localStorage.getItem("whatshopify_token"))?.data?.stores
          ?.length > 1 && (
          <button
            onClick={() => {
              onSwitchStoreClick();
              onClose();
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "none",
              backgroundColor: "transparent",
              textAlign: "left",
              cursor: "pointer",
              fontSize: "14px",
              color: "#8B5CF6",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "background-color 0.2s",
              fontWeight: "500",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f3f4f6";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
            }}
          >
            <span style={{ fontSize: "16px" }}>🏪</span>
            Switch Store
          </button>
        )}
      {/* Login/Logout Button */}
      <button
        onClick={() => {
          if (isAuthenticated) {
            onLogoutClick();
          } else {
            onLoginClick();
          }
          onClose();
        }}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "none",
          backgroundColor: "transparent",
          textAlign: "left",
          cursor: "pointer",
          fontSize: "14px",
          color: isAuthenticated ? "#EF4444" : "#10B981",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transition: "background-color 0.2s",
          fontWeight: isAuthenticated ? "600" : "500",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "#f3f4f6";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
        }}
      >
        <span style={{ fontSize: "16px" }}>
          {isAuthenticated ? "🚪" : "🔑"}
        </span>
        {isAuthenticated ? "Logout" : "Login"}
      </button>
    </div>
  );
};

export default ThreeDotsPopup;
