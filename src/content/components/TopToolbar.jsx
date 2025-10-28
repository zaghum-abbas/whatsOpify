import React, { useEffect, useState, useCallback, useRef } from "react";
import { FaBell, FaCog } from "react-icons/fa";
import CreateCustomTabModal from "./CreateCustomTabModal";
import LoginModal from "./LoginModal";
import StoreSelectionModal from "./StoreSelectionModal";
import ThreeDotsPopup from "./ThreeDotsPopup";
import {
  requireAuth,
  useAuthState,
  TOKEN_KEY,
  handleAuthMessage,
  handleAuthStorage,
} from "./authMiddleware.jsx";
import { useTheme } from "../../hooks/useTheme.js";
import { getActiveChatDetails } from "../index.jsx";

const SELECTORS = {
  Inbox: 'button#all-filter[role="tab"]',
  Unread: 'button#unread-filter[role="tab"]',
  Starred: 'button#favorites-filter[role="tab"]',
  Groups: 'button#group-filter[role="tab"]',
};

const TopToolbar = (props) => {
  const theme = useTheme();
  console.log("@@theme", theme);
  const [showModal, setShowModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showStoreSelectionModal, setShowStoreSelectionModal] = useState(false);
  const [customTabs, setCustomTabs] = useState([]);
  const [activeTabLabel, setActiveTabLabel] = useState("Inbox");
  const [isAuthenticated, setIsAuthenticated] = useAuthState();
  const [showThreeDotsPopup, setShowThreeDotsPopup] = useState(false);
  const threeDotsRef = useRef(null);

  // Handler for withAuthCheck
  useEffect(() => {
    if (props.onRequireLogin) {
      props.onRequireLogin(() => setShowLoginModal(true));
    }
  }, [props]);

  // Listen for store selection modal events
  useEffect(() => {
    const handleShowStoreSelectionModal = () => {
      setShowStoreSelectionModal(true);
    };

    window.addEventListener(
      "showStoreSelectionModal",
      handleShowStoreSelectionModal
    );

    return () => {
      window.removeEventListener(
        "showStoreSelectionModal",
        handleShowStoreSelectionModal
      );
    };
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
      // Check if store is selected before proceeding
      if (typeof window.requireStoreSelection === "function") {
        window.requireStoreSelection(() => {
          // Get current contact info if in chat mode
          const currentContact =
            typeof window.getCurrentSidebarMode === "function" &&
            window.getCurrentSidebarMode() === "chat" &&
            window.sidebarProps?.contact
              ? window.sidebarProps.contact
              : { name: "", phone: "" };

          // Switch to order form sidebar mode
          if (typeof window.switchToOrderFormSidebar === "function") {
            window.switchToOrderFormSidebar(currentContact);
          }

          // Ensure sidebar is open
          if (typeof window.toggleWhatsappSidebar === "function") {
            window.toggleWhatsappSidebar(true);
          }

          console.log("✅ Switched to Order Form Sidebar");
        });
      }
    } else if (label === "Orders") {
      // Check if store is selected before proceeding
      if (typeof window.requireStoreSelection === "function") {
        window.requireStoreSelection(() => {
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
        });
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
    const keysToRemove = [TOKEN_KEY, "whatsopify_selected_store"];
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    ["session"].forEach((cookieName) => {
      document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    });
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

  const handleSwitchStoreClick = () => {
    setShowStoreSelectionModal(true);
  };

  const handleStoreSelect = (selectedStore) => {
    console.log("Store selected:", selectedStore);
    setShowStoreSelectionModal(false);
  };

  const handleStoreSelectionClose = () => {
    setShowStoreSelectionModal(false);
  };

  // Handler for Add Products
  const handleAddProductsClick = () => {
    if (!requireAuth(setShowLoginModal)) return;

    // Check if store is selected before proceeding
    if (typeof window.requireStoreSelection === "function") {
      window.requireStoreSelection(() => {
        // Open Add Product sidebar
        if (typeof window.openAddProductSidebar === "function") {
          window.openAddProductSidebar();
        } else {
          console.warn("openAddProductSidebar function not available");
        }
      });
    }
  };

  // Handler for Create Order
  const handleCreateOrderClick = () => {
    if (!requireAuth(setShowLoginModal)) return;

    // Check if store is selected before proceeding
    if (typeof window.requireStoreSelection === "function") {
      window.requireStoreSelection(() => {
        // Get current contact info if in chat mode
        const currentContact =
          typeof window.getCurrentSidebarMode === "function" &&
          window.getCurrentSidebarMode() === "chat" &&
          window.sidebarProps?.contact
            ? window.sidebarProps.contact
            : { name: "", phone: "" };

        // Switch to order form sidebar mode
        if (typeof window.switchToOrderFormSidebar === "function") {
          window.switchToOrderFormSidebar(currentContact);
        }

        // Ensure sidebar is open
        if (typeof window.toggleWhatsappSidebar === "function") {
          window.toggleWhatsappSidebar(true);
        }
      });
    }
  };

  // Handler for Orders
  const handleOrdersClick = () => {
    if (!requireAuth(setShowLoginModal)) return;

    // Check if store is selected before proceeding
    if (typeof window.requireStoreSelection === "function") {
      window.requireStoreSelection(() => {
        // Switch to default sidebar mode to show orders
        if (typeof window.switchSidebarMode === "function") {
          window.switchSidebarMode("default");
        }

        // Ensure sidebar is open
        if (typeof window.toggleWhatsappSidebar === "function") {
          window.toggleWhatsappSidebar(true);
        }
      });
    } else {
      // If no store selection required, directly open default sidebar
      if (typeof window.switchSidebarMode === "function") {
        window.switchSidebarMode("default");
      }

      // Ensure sidebar is open
      if (typeof window.toggleWhatsappSidebar === "function") {
        window.toggleWhatsappSidebar(true);
      }
    }
  };

  // Handler for Check States button
  const handleCheckStatesClick = async () => {
    if (!requireAuth(setShowLoginModal)) return;

    console.log("📊 Check States button clicked");

    try {
      // Get active chat details
      const contact = await getActiveChatDetails();

      if (contact && (contact.name || contact.phone)) {
        console.log("📊 Active chat details:", contact);

        // Use switchToChatSidebar to properly set contact and switch mode
        if (typeof window.switchToChatSidebar === "function") {
          window.switchToChatSidebar(contact);
        } else {
          // Fallback: manually set contact and switch mode
          if (window.sidebarProps) {
            window.sidebarProps.contact = contact;
            console.log("✅ Set sidebarProps.contact:", contact);
          }

          if (typeof window.switchSidebarMode === "function") {
            window.switchSidebarMode("chat");
          }
        }

        // Ensure sidebar is open
        if (typeof window.toggleWhatsappSidebar === "function") {
          window.toggleWhatsappSidebar(true);
        }

        console.log("✅ Chat sidebar opened with user states");
      } else {
        console.warn("⚠️ No active chat found or no contact details available");
        alert("Please open a chat first to view user states");
      }
    } catch (error) {
      console.error("❌ Error opening chat sidebar:", error);
      alert("Failed to open chat sidebar. Please try again.");
    }
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
        backgroundColor: theme === "dark" ? "#18191a" : "white",
        color: theme === "dark" ? "white" : "#18191a",
        zIndex: 10000,
        position: "relative",
      }}
    >
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
        <button
          onClick={handleCheckStatesClick}
          style={{
            color: "#4a5568",
            transition: "all 0.2s",
            background: "transparent",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
          onMouseEnter={(e) => {
            e.target.style.color = "#2563EB";
            e.target.style.backgroundColor = "#f0f9ff";
            e.target.style.borderColor = "#2563EB";
          }}
          onMouseLeave={(e) => {
            e.target.style.color = "#4a5568";
            e.target.style.backgroundColor = "transparent";
            e.target.style.borderColor = "#e2e8f0";
          }}
        >
          📊 Check States
        </button>

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
        {/* <button
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
        </button> */}

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
            e.target.style.backgroundColor = "#10b981";
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

      {/* Store Selection Modal */}
      <StoreSelectionModal
        isOpen={showStoreSelectionModal}
        onStoreSelect={handleStoreSelect}
        onClose={handleStoreSelectionClose}
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
          onSwitchStoreClick={handleSwitchStoreClick}
          onAddProductsClick={handleAddProductsClick}
          onCreateOrderClick={handleCreateOrderClick}
          onOrdersClick={handleOrdersClick}
        />
      )}
    </div>
  );
};

export default TopToolbar;
