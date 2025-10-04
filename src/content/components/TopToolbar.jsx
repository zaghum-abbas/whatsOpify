import React, { useEffect, useState, useCallback, useRef } from "react";
import { FaBell, FaCog } from "react-icons/fa";
import CreateCustomTabModal from "./CreateCustomTabModal";
import LoginModal from "./LoginModal";
import ThreeDotsPopup from "./ThreeDotsPopup";
import {
  requireAuth,
  useAuthState,
  TOKEN_KEY,
  handleAuthMessage,
  handleAuthStorage,
} from "./authMiddleware.jsx";

const SELECTORS = {
  Inbox: 'button#all-filter[role="tab"]',
  Unread: 'button#unread-filter[role="tab"]',
  Starred: 'button#favorites-filter[role="tab"]',
  Groups: 'button#group-filter[role="tab"]',
};

const TopToolbar = (props) => {
  const [showModal, setShowModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [customTabs, setCustomTabs] = useState([]);
  const [activeTabLabel, setActiveTabLabel] = useState("Inbox"); // default active tab
  const [isAuthenticated, setIsAuthenticated] = useAuthState();
  const [showThreeDotsPopup, setShowThreeDotsPopup] = useState(false);
  const threeDotsRef = useRef(null);

  // Handler for withAuthCheck
  useEffect(() => {
    if (props.onRequireLogin) {
      props.onRequireLogin(() => setShowLoginModal(true));
    }
  }, [props]);

  useEffect(() => {
    console.log("📌 TopToolbar mounted on WhatsApp Web");
  }, []);

  const clickWhatsAppFilterButton = useCallback(async (label) => {
    const selector = SELECTORS[label];
    if (!selector) {
      console.warn(`❌ No selector found for WhatsApp filter: ${label}`);
      return;
    }
    let button = document.querySelector(selector);
    if (!button) {
      for (let i = 0; i < 5; i++) {
        await new Promise((res) => setTimeout(res, 500));
        button = document.querySelector(selector);
        if (button) break;
      }
    }

    if (button) {
      button.click();
      console.log(`🟢 Clicked native WhatsApp filter: ${label}`);
    } else {
      console.warn(`❌ Could not find WhatsApp filter button for: ${label}`);
    }
  }, []);

  const handleClick = async (label) => {
    if (!requireAuth(setShowLoginModal)) return;
    if (label === "Add") {
      setShowModal(true);
    } else if (label === "CreateOrder") {
      // Switch to default sidebar mode for order form
      if (typeof window.switchToDefaultSidebar === "function") {
        window.switchToDefaultSidebar();
      }
      // Trigger order form in sidebar
      if (typeof window.showOrderForm === "function") {
        window.showOrderForm(true);
      }
      // Ensure sidebar is open
      if (typeof window.toggleWhatsappSidebar === "function") {
        window.toggleWhatsappSidebar(true);
      }

      // Smooth scroll to the order form in sidebar
      setTimeout(() => {
        const sidebarContainer = document.getElementById(
          "whatsapp-sidebar-root"
        );
        if (sidebarContainer) {
          // Find the order form section within the sidebar
          const orderFormSection = Array.from(
            sidebarContainer.querySelectorAll("section")
          ).find((section) => {
            const h2 = section.querySelector("h2");
            return h2 && h2.textContent.includes("Create New Order");
          });

          if (orderFormSection) {
            // Scroll to the order form section with smooth behavior
            orderFormSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
              inline: "nearest",
            });
            console.log("✅ Smooth scrolled to Create Order form");
          } else {
            // Fallback: scroll to top of sidebar if form section not found
            sidebarContainer.scrollTo({
              top: 0,
              behavior: "smooth",
            });
            console.log(
              "⚠️ Order form section not found, scrolled to top of sidebar"
            );
          }
        } else {
          console.warn("⚠️ Sidebar container not found for scrolling");
        }
      }, 500); // Wait for sidebar and form to render
    } else if (label === "Orders") {
      // Switch to default sidebar mode for orders
      if (typeof window.switchToDefaultSidebar === "function") {
        window.switchToDefaultSidebar();
      }
      // Open orders section in sidebar
      if (typeof window.showOrdersSection === "function") {
        window.showOrdersSection();
      }
      // Ensure sidebar is open
      if (typeof window.toggleWhatsappSidebar === "function") {
        window.toggleWhatsappSidebar(true);
      }

      // Smooth scroll to the orders section in sidebar
      setTimeout(() => {
        const sidebarContainer = document.getElementById(
          "whatsapp-sidebar-root"
        );
        if (sidebarContainer) {
          // Find the orders section within the sidebar
          const ordersSection = Array.from(
            sidebarContainer.querySelectorAll("section")
          ).find((section) => {
            const h2 = section.querySelector("h2");
            return h2 && h2.textContent.includes("Orders");
          });

          if (ordersSection) {
            // Scroll to the orders section with smooth behavior
            ordersSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
              inline: "nearest",
            });
            console.log("✅ Smooth scrolled to Orders section");
          } else {
            // Fallback: scroll to top of sidebar if orders section not found
            sidebarContainer.scrollTo({
              top: 0,
              behavior: "smooth",
            });
            console.log(
              "⚠️ Orders section not found, scrolled to top of sidebar"
            );
          }
        } else {
          console.warn("⚠️ Sidebar container not found for scrolling");
        }
      }, 500); // Wait for sidebar to render
    } else {
      setActiveTabLabel(label); // update active tab
      await clickWhatsAppFilterButton(label);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleCreateCustomTab = (tabName, emoji) => {
    setCustomTabs((prevTabs) => [
      ...prevTabs,
      { emoji: emoji || "📄", label: tabName },
    ]);
    setShowModal(false);
    setActiveTabLabel(tabName); // make new tab active after creation
  };

  const defaultTabs = [
    { emoji: "🟢", label: "Inbox" },
    { emoji: "🤎", label: "Unread" },
    { emoji: "⭐", label: "Starred" },
    { emoji: "👥", label: "Groups" },
    { emoji: "🤎", label: "Closed" },
    { emoji: "⏰", label: "Snoozed" },
    { emoji: "🚩", label: "Follow Up" },
  ];

  const allExistingTabs = [...defaultTabs, ...customTabs];

  useEffect(() => {
    // Initial check is handled by useAuthState
    const handleStorageChange = (event) =>
      handleAuthStorage(event, setIsAuthenticated);
    const handleMessage = (event) =>
      handleAuthMessage(event, setIsAuthenticated);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("message", handleMessage);
    };
  }, [setIsAuthenticated]);

  const handleToolbarLogin = () => {
    console.log("🔑 Login button clicked");
    setShowLoginModal(true);
  };

  const handleToolbarLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setIsAuthenticated(false);
    if (typeof window.toggleWhatsappSidebar === "function") {
      window.toggleWhatsappSidebar(false);
    }
  };

  const handleLoginSuccess = (token) => {
    console.log("✅ Login successful in TopToolbar:", token);
    setIsAuthenticated(true);
    setShowLoginModal(false);
  };

  const handleThreeDotsClick = () => {
    setShowThreeDotsPopup(!showThreeDotsPopup);
  };

  const handleCloseThreeDotsPopup = () => {
    setShowThreeDotsPopup(false);
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: "1rem",
        paddingRight: "1rem",
        boxSizing: "border-box",
        backgroundColor: "white",
        zIndex: 10000,
        position: "relative",
      }}
    >
      {/* Left side: Buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "hidden",
          paddingBottom: "4px",
          alignItems: "center",
        }}
      >
        {[...allExistingTabs, { emoji: "+", label: "Add" }].map((item, idx) => {
          const isActive = item.label === activeTabLabel;

          return (
            <button
              key={idx}
              onClick={() => handleClick(item.label)}
              style={{
                color: "#4a5568",
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "0.875rem",
                whiteSpace: "nowrap",
                backgroundColor: isActive ? "#f0f0f0" : "transparent",
                boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                margin: isActive ? "0 -1px" : "0",
                cursor: "pointer",
                border: "none",
                transition: "all 0.2s ease",
                boxSizing: "border-box",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f0f0f0";
                e.target.style.boxShadow = "0 2px 6px rgba(0,0,0,0.1)";
                e.target.style.transform = "scale(1.05)";
                e.target.style.margin = "0 -1px";
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.target.style.backgroundColor = "transparent";
                  e.target.style.boxShadow = "none";
                  e.target.style.transform = "scale(1)";
                  e.target.style.margin = "0";
                }
              }}
            >
              {item.emoji} {item.label}
            </button>
          );
        })}
      </div>

      {/* Right side: App name + icons + login/logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div
          style={{ fontSize: "1.125rem", fontWeight: "bold", color: "#10B981" }}
        >
          Whatsopify
        </div>
        <button
          onClick={() => handleClick("Notifications")}
          style={{
            color: "#4a5568",
            transition: "all 0.2s",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.target.style.color = "#2563EB")}
          onMouseLeave={(e) => (e.target.style.color = "#4a5568")}
        >
          <FaBell size={20} />
        </button>
        <button
          onClick={() => handleClick("CreateOrder")}
          style={{
            color: "#4a5568",
            transition: "all 0.2s",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "8px 0px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
          }}
          onMouseEnter={(e) => {
            e.target.style.color = "#2563EB";
            e.target.style.backgroundColor = "#f0f9ff";
          }}
          onMouseLeave={(e) => {
            e.target.style.color = "#4a5568";
            e.target.style.backgroundColor = "transparent";
          }}
        >
          🛒 Create Order
        </button>
        <button
          onClick={() => handleClick("Orders")}
          style={{
            color: "#4a5568",
            transition: "all 0.2s",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "8px 0px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
          }}
          onMouseEnter={(e) => {
            e.target.style.color = "#2563EB";
            e.target.style.backgroundColor = "#f0f9ff";
          }}
          onMouseLeave={(e) => {
            e.target.style.color = "#4a5568";
            e.target.style.backgroundColor = "transparent";
          }}
        >
          📋 Orders
        </button>

        <div
          ref={threeDotsRef}
          onClick={handleThreeDotsClick}
          style={{
            cursor: "pointer",
            padding: "8px",
            borderRadius: "4px",
            transition: "background-color 0.2s",
            position: "relative",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "transparent";
          }}
        >
          <svg
            viewBox="0 0 24 24"
            height="24"
            width="24"
            preserveAspectRatio="xMidYMid meet"
            class=""
            fill="none"
          >
            <title>more-refreshed</title>
            <path
              d="M12 20C11.45 20 10.9792 19.8042 10.5875 19.4125C10.1958 19.0208 10 18.55 10 18C10 17.45 10.1958 16.9792 10.5875 16.5875C10.9792 16.1958 11.45 16 12 16C12.55 16 13.0208 16.1958 13.4125 16.5875C13.8042 16.9792 14 17.45 14 18C14 18.55 13.8042 19.0208 13.4125 19.4125C13.0208 19.8042 12.55 20 12 20ZM12 14C11.45 14 10.9792 13.8042 10.5875 13.4125C10.1958 13.0208 10 12.55 10 12C10 11.45 10.1958 10.9792 10.5875 10.5875C10.9792 10.1958 11.45 10 12 10C12.55 10 13.0208 10.1958 13.4125 10.5875C13.8042 10.9792 14 11.45 14 12C14 12.55 13.8042 13.0208 13.4125 13.4125C13.0208 13.8042 12.55 14 12 14ZM12 8C11.45 8 10.9792 7.80417 10.5875 7.4125C10.1958 7.02083 10 6.55 10 6C10 5.45 10.1958 4.97917 10.5875 4.5875C10.9792 4.19583 11.45 4 12 4C12.55 4 13.0208 4.19583 13.4125 4.5875C13.8042 4.97917 14 5.45 14 6C14 6.55 13.8042 7.02083 13.4125 7.4125C13.0208 7.80417 12.55 8 12 8Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <CreateCustomTabModal
          onClose={handleCloseModal}
          onCreate={handleCreateCustomTab}
          existingTabs={allExistingTabs}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Three Dots Popup */}
      {showThreeDotsPopup && threeDotsRef.current && (
        <ThreeDotsPopup
          isOpen={showThreeDotsPopup}
          onClose={handleCloseThreeDotsPopup}
          position={{
            top:
              threeDotsRef.current.offsetTop +
              threeDotsRef.current.offsetHeight +
              8,
            right: 0,
          }}
          isAuthenticated={isAuthenticated}
          onSettingsClick={() => handleClick("Settings")}
          onLogoutClick={handleToolbarLogout}
          onLoginClick={() => setShowLoginModal(true)}
        />
      )}
    </div>
  );
};

export default TopToolbar;
