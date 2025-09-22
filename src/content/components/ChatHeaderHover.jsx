import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";

const ChatHeaderHover = () => {
  const [targetElement, setTargetElement] = useState(null);
  const [contactData, setContactData] = useState(null);
  const [showCard, setShowCard] = useState(false);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0 });
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const cardRef = useRef(null);
  const leaveTimeoutRef = useRef(null);

  // Styles (unchanged, as they are not the source of the issue)
  const popupOverlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  };

  const popupContentStyle = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
    textAlign: "center",
    width: "400px",
    color: "#333",
  };

  const inputStyle = {
    width: "calc(100% - 20px)",
    padding: "10px",
    margin: "10px 0",
    borderRadius: "4px",
    border: "1px solid #ccc",
    fontSize: "16px",
  };

  const buttonContainerStyle = {
    display: "flex",
    justifyContent: "space-around",
    marginTop: "20px",
  };

  const buttonStyle = {
    padding: "10px 20px",
    border: "none",
    borderRadius: "5px",
    color: "white",
    cursor: "pointer",
    fontSize: "16px",
  };

  const hoverCardStyle = {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.2)",
    padding: "15px",
    width: "250px",
    zIndex: 1000,
  };

  const hoverCardHeaderStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "10px",
  };

  const hoverCardImageStyle = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    marginRight: "10px",
  };

  const hoverCardNameStyle = {
    margin: 0,
    flex: 1,
    fontSize: "16px",
  };

  const hoverCardEditButtonStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
  };

  const hoverCardDetailStyle = {
    fontSize: "14px",
    lineHeight: "1.5",
  };

  // Extract contact data from WhatsApp Web chat header
  const extractContactDataFromHeader = (headerElement) => {
    if (!headerElement) {
      console.log("extractContactDataFromHeader: No headerElement provided.");
      return {
        name: "Unknown",
        number: "",
        profilePicUrl: "https://via.placeholder.com/40",
      };
    }

    // Attempt to find the name element
    const nameElement = headerElement.querySelector(
      'span[title], div[data-testid="conversation-info-header"] span, div[data-testid="contact-name"]'
    );
    const name =
      nameElement?.getAttribute("title") ||
      nameElement?.textContent?.trim() ||
      "Unknown";
    console.log("extractContactDataFromHeader: Extracted Name:", name);

    // Attempt to find the number element. This is often the trickiest.
    // The previous HTML provided was for "Message yourself", which doesn't have a number.
    // For regular contacts, numbers might appear in spans with dir="ltr" or specific data-testids.
    // We'll broaden the search a bit.
    let number = "";
    const numberElement = headerElement.querySelector(
      'span[dir="ltr"].selectable-text.copyable-text'
    );
    if (numberElement) {
      number = numberElement.textContent?.replace(/[^0-9+]/g, "") || "";
      if (number.startsWith("+")) {
        number = "+" + number.substring(1).replace(/\s+/g, "");
      }
    }
    // Fallback: Sometimes the number is in an element with a specific data-testid
    if (!number) {
      const testIdNumberElement = headerElement.querySelector(
        '[data-testid="conversation-info-header-meta-text-fallback"] span'
      );
      if (testIdNumberElement) {
        number = testIdNumberElement.textContent?.replace(/[^0-9+]/g, "") || "";
        if (number.startsWith("+")) {
          number = "+" + number.substring(1).replace(/\s+/g, "");
        }
      }
    }
    console.log(
      "extractContactDataFromHeader: Extracted Number:",
      number || "N/A"
    );

    // Attempt to get profile picture URL
    // Look for the img inside elements that are typically for profile pictures in the header.
    const imgElement = headerElement.querySelector(
      'img[draggable="false"], div[data-testid="conversation-info-header"] img'
    );
    const profilePicUrl = imgElement?.src || "https://via.placeholder.com/40"; // Default placeholder
    console.log(
      "extractContactDataFromHeader: Extracted Profile Pic URL:",
      profilePicUrl
    );

    return { name, number, profilePicUrl };
  };

  // Main Effect: Observes the DOM for the chat header element to appear/disappear
  useEffect(() => {
    console.log("Main Observer Effect Initializing...");
    const mainObserver = new MutationObserver(() => {
      // Look for the main chat header element. WhatsApp Web uses different data-testid attributes over time.
      // Prioritize the specific data-testid, then fall back to role="banner" header.
      const currentChatHeader = document.querySelector(
        'header[data-testid="conversation-info-header"], header[role="banner"]'
      );

      if (currentChatHeader && currentChatHeader !== targetElement) {
        console.log("Main Observer: Found new chat header!", currentChatHeader);
        setTargetElement(currentChatHeader);
        const data = extractContactDataFromHeader(currentChatHeader);
        setContactData(data);
      } else if (!currentChatHeader && targetElement) {
        console.log("Main Observer: Chat header disappeared.");
        setTargetElement(null);
        setContactData(null);
        setShowCard(false);
      }
    });

    // Observe the #main element or body for chat header changes
    // The #main element usually contains the entire chat interface.
    const mainContentObserverTarget =
      document.getElementById("main") || document.body;
    if (mainContentObserverTarget) {
      mainObserver.observe(mainContentObserverTarget, {
        childList: true,
        subtree: true,
      });
      console.log("Main Observer: Observing", mainContentObserverTarget);
    } else {
      console.warn(
        "Main Observer: Could not find #main element, observing body."
      );
      mainObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Initial check in case the header is already present on load
    const initialHeader = document.querySelector(
      'header[data-testid="conversation-info-header"], header[role="banner"]'
    );
    if (initialHeader) {
      console.log(
        "Main Observer: Initial header found on mount.",
        initialHeader
      );
      setTargetElement(initialHeader);
      setContactData(extractContactDataFromHeader(initialHeader));
    }

    return () => {
      console.log("Main Observer: Disconnecting...");
      mainObserver.disconnect();
    };
  }, [targetElement]); // Depend on targetElement to re-run observer if it changes (less common, but safe)

  // Secondary Effect: Observes the *content* of the active chat header for changes (e.g., name updates)
  useEffect(() => {
    if (!targetElement) {
      console.log("Content Observer: No targetElement to observe.");
      return;
    }

    console.log(
      "Content Observer: Initializing for targetElement:",
      targetElement
    );
    const headerContentObserver = new MutationObserver(() => {
      console.log(
        "Content Observer: Target element content changed, re-extracting data."
      );
      const newData = extractContactDataFromHeader(targetElement);
      setContactData((prev) => {
        // Only update if data has actually changed to prevent unnecessary re-renders
        if (
          prev?.name !== newData.name ||
          prev?.number !== newData.number ||
          prev?.profilePicUrl !== newData.profilePicUrl
        ) {
          console.log("Content Observer: Data changed, updating state.");
          return newData;
        }
        return prev;
      });
    });

    headerContentObserver.observe(targetElement, {
      childList: true, // Observe direct children additions/removals
      subtree: true, // Observe changes in descendants
      attributes: true, // Observe attribute changes (e.g., title attribute)
      characterData: true, // Observe text content changes
    });
    console.log("Content Observer: Observing content of", targetElement);

    return () => {
      console.log("Content Observer: Disconnecting...");
      headerContentObserver.disconnect();
    };
  }, [targetElement]); // Crucially, this effect re-runs whenever `targetElement` changes.

  // Tertiary Effect: Handles hover events on the target header element
  useEffect(() => {
    if (!targetElement) {
      console.log("Hover Effect: No targetElement to attach listeners to.");
      return;
    }

    console.log("Hover Effect: Attaching listeners to", targetElement);
    const handleMouseEnter = (e) => {
      console.log("Hover Effect: Mouse entered targetElement.");
      clearTimeout(leaveTimeoutRef.current); // Clear any pending hide timeouts
      const rect = e.currentTarget.getBoundingClientRect();
      setCardPosition({
        top: rect.bottom + window.scrollY + 5, // Position below the header
        left: rect.left + window.scrollX,
      });
      setShowCard(true);
    };

    const handleMouseLeave = () => {
      console.log("Hover Effect: Mouse left targetElement.");
      // Set a timeout to hide the card, allowing time to move mouse to the card itself
      leaveTimeoutRef.current = setTimeout(() => {
        // Only hide if the mouse is not over the card
        if (
          !cardRef.current ||
          (!cardRef.current.contains(document.activeElement) &&
            !cardRef.current.matches(":hover"))
        ) {
          console.log("Hover Effect: Hiding card after timeout.");
          setShowCard(false);
        } else {
          console.log(
            "Hover Effect: Card still hovered or focused, not hiding."
          );
        }
      }, 100); // Small delay
    };

    targetElement.addEventListener("mouseenter", handleMouseEnter);
    targetElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      console.log("Hover Effect: Removing listeners from", targetElement);
      targetElement.removeEventListener("mouseenter", handleMouseEnter);
      targetElement.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(leaveTimeoutRef.current); // Clean up timeout on unmount/re-effect
    };
  }, [targetElement]); // This must re-run if targetElement changes!

  // Handle card hover events to keep it open
  const handleCardMouseEnter = () => {
    console.log("Card Hover: Mouse entered card.");
    clearTimeout(leaveTimeoutRef.current);
    setShowCard(true);
  };

  const handleCardMouseLeave = () => {
    console.log("Card Hover: Mouse left card.");
    leaveTimeoutRef.current = setTimeout(() => {
      console.log("Card Hover: Hiding card after timeout.");
      setShowCard(false);
    }, 100);
  };

  const handleEditClick = () => {
    console.log("Edit Clicked.");
    setEditName(contactData?.name || "");
    setEditNumber(contactData?.number || "");
    setShowEditPopup(true);
    setShowCard(false);
  };

  const handleSaveEdit = () => {
    console.log("Save Edit Clicked.");
    if (!contactData) return;

    setContactData((prev) => ({
      ...prev,
      name: editName,
      number: editNumber,
    }));

    console.log("Saved edits locally:", { name: editName, number: editNumber });

    setShowEditPopup(false);
  };

  const handleCancelEdit = () => {
    console.log("Cancel Edit Clicked.");
    setShowEditPopup(false);
  };

  const getLocalTimePKT = () => {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: "Asia/Karachi",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!contactData) {
    console.log("Rendering: No contactData, returning null.");
    return null;
  }
  return ReactDOM.createPortal(
    <>
      {showCard && (
        <div
          ref={cardRef}
          style={{
            ...hoverCardStyle,
            top: `${cardPosition.top}px`,
            left: `${cardPosition.left}px`,
          }}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        >
          <div style={hoverCardHeaderStyle}>
            <img
              src={contactData.profilePicUrl}
              alt="Profile"
              style={hoverCardImageStyle}
            />
            <h3 style={hoverCardNameStyle}>{contactData.name}</h3>
            <button
              onClick={handleEditClick}
              style={hoverCardEditButtonStyle}
              aria-label="Edit contact"
            >
              ✏️ Edit
            </button>
          </div>
          <div style={hoverCardDetailStyle}>
            <p>
              <strong>WhatsApp name:</strong> {contactData.name}
            </p>
            <p>
              <strong>Phone number:</strong> {contactData.number || "N/A"}
            </p>
            <p>
              <strong>Local time (GMT+5):</strong> PK {getLocalTimePKT()}
            </p>
          </div>
        </div>
      )}

      {showEditPopup && (
        <div style={popupOverlayStyle}>
          <div style={popupContentStyle}>
            <h2>Edit Contact</h2>
            <div>
              <label>Name:</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label>Phone Number:</label>
              <input
                type="text"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                placeholder="Enter number if available"
                style={inputStyle}
              />
            </div>
            <div style={buttonContainerStyle}>
              <button
                onClick={handleSaveEdit}
                style={{ ...buttonStyle, backgroundColor: "#25D366" }}
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                style={{ ...buttonStyle, backgroundColor: "#FF6347" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};

export default ChatHeaderHover;
