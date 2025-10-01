import React, { useState, useEffect } from "react";

const CustomerSupportMessages = () => {
  const theme = {
    bg: "#f0f2f5",
    card: "#fff",
    text: "#111b21",
    subText: "#667781",
    accent: "#00a884",
    border: "#e9edef",
  };

  const [contactName, setContactName] = useState("");
  const [isLoadingContact, setIsLoadingContact] = useState(true);

  // Extract contact name when component mounts
  useEffect(() => {
    const extractContactInfo = () => {
      try {
        setIsLoadingContact(true);

        const contactInfoHeader = Array.from(
          document.querySelectorAll("div")
        ).find((el) => el.textContent.trim() === "Contact info");

        if (!contactInfoHeader) return;

        const contactInfoPanel =
          contactInfoHeader.closest("header")?.parentElement?.parentElement;
        if (!contactInfoPanel) return;

        const nameElement = contactInfoPanel.querySelector('span[dir="auto"]');
        const name = nameElement?.textContent.trim() || "Customer";

        setContactName(name);
      } catch (error) {
        console.error("Error extracting contact info:", error);
        setContactName("Customer");
      } finally {
        setIsLoadingContact(false);
      }
    };

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

  const supportTemplates = [
    {
      title: "Order Status Inquiry",
      messages: [
        "Hi [Customer], your order is being processed and will ship within 24 hours.",
        "Your order is out for delivery today. Expected arrival: 3-5 PM.",
      ],
    },
    {
      title: "Returns & Refunds",
      messages: [
        "We're sorry to hear that! Please share your order number for a return request.",
        "Your refund for order has been processed. It may take 3-5 business days to reflect.",
      ],
    },
    {
      title: "Product Questions",
      messages: [
        "This product is available in sizes S, M, L. Which one are you interested in?",
        "The estimated delivery time for this item is 2-3 business days.",
      ],
    },
    {
      title: "Payment Issues",
      messages: [
        "Your payment for order  was successful. No further action is needed.",
        "We noticed a payment failure. Please try again or use an alternative method.",
      ],
    },
    {
      title: "General Support",
      messages: [
        "Thanks for reaching out! How can I assist you today?",
        "Our customer support team will get back to you within 1 hour.",
      ],
    },
  ];

  const sendWhatsAppMessage = async (message) => {
    // Same reliable implementation from your ModalForm
    try {
      const messageInput = document.querySelector(
        'div[contenteditable="true"][data-tab="10"]'
      );
      if (!messageInput) {
        console.warn("Message input not found");
        return false;
      }

      // Replace [Customer] placeholder
      const personalizedMessage = message.replace("[Customer]", contactName);

      messageInput.focus();
      messageInput.textContent = "";

      try {
        await navigator.clipboard.writeText(personalizedMessage);
        document.execCommand("paste");
      } catch (clipboardError) {
        messageInput.textContent = personalizedMessage;
      }

      const inputEvent = new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: personalizedMessage,
      });
      messageInput.dispatchEvent(inputEvent);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const keyDownEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });

      const keyUpEvent = new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      });

      messageInput.dispatchEvent(keyDownEvent);
      await new Promise((resolve) => setTimeout(resolve, 50));
      messageInput.dispatchEvent(keyUpEvent);

      await new Promise((resolve) => setTimeout(resolve, 500));
      return messageInput.textContent === "";
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  };

  const handleSendMessage = async (message) => {
    if (isLoadingContact) {
      alert("Please wait while we load contact information...");
      return;
    }

    const messageSent = await sendWhatsAppMessage(message);

    if (!messageSent) {
      try {
        const personalizedMessage = message.replace("[Customer]", contactName);
        await navigator.clipboard.writeText(personalizedMessage);
        alert(
          "Message copied to clipboard! Please paste (Ctrl+V) it in WhatsApp"
        );
      } catch {
        alert(
          `Failed to send. Here's the message:\n\n${message.replace(
            "[Customer]",
            contactName
          )}`
        );
      }
    }
  };

  return (
    <section style={{ marginBottom: "28px" }}>
      <h2
        style={{
          color: theme.text,
          fontSize: "1.2rem",
          marginBottom: "16px",
          borderBottom: `1px solid ${theme.border}`,
          paddingBottom: "8px",
        }}
      >
        Quick Replies
      </h2>

      <div
        style={{
          padding: "16px",
          background: theme.bg,
          height: "100%",
          overflowY: "auto",
        }}
      >
        {supportTemplates.map((category, index) => (
          <div
            key={index}
            style={{
              background: theme.card,
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                color: theme.accent,
                fontSize: "0.95rem",
                marginBottom: "8px",
              }}
            >
              {category.title}
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {category.messages.map((msg, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(msg)}
                  disabled={isLoadingContact}
                  style={{
                    background: "transparent",
                    border: `1px solid ${theme.border}`,
                    borderRadius: "6px",
                    padding: "8px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    color: theme.text,
                    fontSize: "0.9rem",
                    transition: "all 0.2s",
                    opacity: isLoadingContact ? 0.7 : 1,
                    ":hover": {
                      background: isLoadingContact
                        ? "transparent"
                        : theme.accent + "15",
                      borderColor: isLoadingContact
                        ? theme.border
                        : theme.accent,
                    },
                  }}
                >
                  {isLoadingContact
                    ? "Loading..."
                    : msg.replace("[Customer]", contactName)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CustomerSupportMessages;
