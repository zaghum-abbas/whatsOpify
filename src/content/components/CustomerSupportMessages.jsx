import React, { useState, useEffect, useMemo } from "react";
import { useTheme } from "../../hooks/useTheme";
import { getLatestOrder } from "../../core/utils/helperFunctions";

const CustomerSupportMessages = ({ userOrders }) => {
  const theme = useTheme();

  const latestOrder = useMemo(() => {
    return userOrders?.orders ? getLatestOrder(userOrders?.orders) : null;
  }, [userOrders?.orders]);

  // Only log when userOrders actually changes
  useEffect(() => {
    if (userOrders?.userInfo?.name) {
      console.log("🧾userOrders?.userInfo?.name", userOrders?.userInfo?.name);
    }
  }, [userOrders?.userInfo?.name]);

  const selectedStore = useMemo(() => {
    try {
      const store = localStorage.getItem("whatshopify_selected_store");
      return store ? JSON.parse(store) : null;
    } catch (error) {
      console.error("Error parsing selected store:", error);
      return null;
    }
  }, [localStorage.getItem("whatshopify_selected_store")]); // Only parse once, or you can add a dependency if store changes frequently

  console.log("🧾 selectedStore", selectedStore);

  const [contactName, setContactName] = useState("");
  const [isLoadingContact, setIsLoadingContact] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Only log latestOrder when it actually changes
  useEffect(() => {
    if (latestOrder) {
      console.log("🧾 [CUSTOMER SUPPORT MESSAGES] Latest order:", latestOrder);
    }
  }, [latestOrder]);

  useEffect(() => {
    let debounceTimer;
    let lastContactName = "";

    const extractContactInfo = () => {
      try {
        // Clear any pending debounce
        clearTimeout(debounceTimer);

        // Debounce the extraction to avoid too many calls
        debounceTimer = setTimeout(() => {
          const contactInfoHeader = Array.from(
            document.querySelectorAll("div")
          ).find((el) => el.textContent.trim() === "Contact info");
          if (!contactInfoHeader) {
            setIsLoadingContact(false);
            return;
          }

          const contactInfoPanel =
            contactInfoHeader.closest("header")?.parentElement?.parentElement;
          if (!contactInfoPanel) {
            setIsLoadingContact(false);
            return;
          }

          const nameElement =
            contactInfoPanel.querySelector('span[dir="auto"]');
          const name = nameElement?.textContent.trim() || "Customer";

          // Only update if the name actually changed
          if (name !== lastContactName) {
            lastContactName = name;
            setContactName(name);
            setIsLoadingContact(false);
          } else {
            setIsLoadingContact(false);
          }
        }, 300); // Wait 300ms before extracting
      } catch (error) {
        console.error("Error extracting contact info:", error);
        setContactName("Customer");
        setIsLoadingContact(false);
      }
    };

    // Initial extraction
    extractContactInfo();

    // Observe only the conversation panel, not the entire body
    const conversationPanel =
      document.querySelector('[data-testid="conversation-panel-wrapper"]') ||
      document
        .querySelector('[data-testid="conversation-header"]')
        ?.closest("header")?.parentElement;

    const targetElement = conversationPanel || document.body;

    const observer = new MutationObserver((mutations) => {
      // Only process if there are actual structural changes (not just attribute changes)
      const hasRelevantChanges = mutations.some(
        (mutation) =>
          mutation.type === "childList" && mutation.addedNodes.length > 0
      );

      if (hasRelevantChanges) {
        extractContactInfo();
      }
    });

    // Observe with more specific options - only childList changes, not attributes or characterData
    observer.observe(targetElement, {
      childList: true,
      subtree: true,
      attributes: false, // Don't watch attribute changes
      characterData: false, // Don't watch text changes
    });

    return () => {
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, []);

  const supportTemplates = useMemo(
    () => [
      {
        title: "Orders",
        messages: [
          {
            label: "Being Processed",
            message: `🚚 Order in Process

Your order #${latestOrder?.name} is now being prepared for dispatch 🧳
We’ll notify you as soon as it’s shipped and share the tracking link for easy updates.

💚 Thank you for your patience!`,
          },
          {
            label: "Slight Delivery Delay",
            message: `Hi ${userOrders?.userInfo?.name}, we’re experiencing a slight delay. Your order will be shipped soon.`,
          },
          {
            label: "Payment Received",
            message: `💰 Payment Received! 🎉

We’ve successfully received your payment for order #${latestOrder?.name} 💵

🧾 Amount: ${latestOrder?.prepaid_amount}
📅 Received on: ${latestOrder?.paymentDate}
💰Remaining COD amount: ${latestOrder?.amount}

Your order will now move to the next stage — we’ll notify you once it’s dispatched 🚀
💚 Thanks for your prompt payment!`,
          },
          {
            label: "Delivered order",
            message: `🎁 Yay, it’s here! 🎉

Hello ${userOrders?.userInfo?.name}, order #${latestOrder?.name} has just been delivered 🚚💨

Hope you’ve opened it already and loved what’s inside 😄💚

If everything looks good, we’d love to hear your thoughts — your feedback means a lot! 💬`,
          },
          {
            label: "Asking Feedback",
            message: `💬 How did we do, ${userOrders?.userInfo?.name}? 🤍

Hope you’re enjoying your order from ${selectedStore?.name} 😄

We’d love your quick feedback!

✨ Please reply with your rating:
𝟏 ☆ — 😞 Not great
𝟐 ☆☆ — 😐 Okay
𝟑 ☆☆☆ — 🙂 Good
𝟒 ☆☆☆☆ — 😍 Loved it
𝟓 ☆☆☆☆☆ — 🤩 Absolutely perfect! 💚

Your feedback means a lot — thank you for shopping with ${selectedStore?.name}!
🛍️ (Order: ${latestOrder?.products?.[0]?.name})`,
          },
          {
            label: "Exchange / Return Initiated",
            message: `🔁 Return / Exchange Request Received!

Hi ${userOrders?.userInfo?.name}, we’ve received your request for a return/exchange of ${latestOrder?.products?.[0]?.name} from your order #${latestOrder?.name}.

Our team will review it shortly and update you on the next steps.
🕒 Please allow 24–48 hours for processing.

💚 Thanks for your patience,
— 𝐓𝐞𝐚𝐦 ${selectedStore?.name}`,
          },
          {
            label: "Refund Processed",
            message: `💰 Refund Completed!

Hi ${userOrders?.userInfo?.name}, your refund for Order #${latestOrder?.name} has been successfully approved.

✅ You’ll receive the amount via your original payment method within 1–3 business days.
Thanks again for shopping with ${selectedStore?.name}. We hope to serve you again soon! 💚

- 𝐓𝐞𝐚𝐦 ${selectedStore?.name}`,
          },
          {
            label: "Courier Waiting / No Response",
            message: `🚚 Are you not available?

Hi ${userOrders?.userInfo?.name}, courier tried to reach you for your order #${latestOrder?.name}, but couldn’t get a response.

Please make sure your phone is reachable 📱 or reply here if you’d like to reschedule your delivery.
Your parcel is waiting! 💚

- 𝐓𝐞𝐚𝐦 ${selectedStore?.name}`,
          },
          {
            label: "Returned / Unreceived Order Inquiry",
            message: `⚠️ Your Order Was Returned

Hi ${userOrders?.userInfo?.name}, your parcel for order #${latestOrder?.name} having ${latestOrder?.products?.[0]?.name} was

Could you please confirm if:
1️⃣ You missed the delivery call, or
2️⃣ You no longer wish to receive the order?

💬 Please reply to let us know how you’d like to proceed — we can resend it or cancel it as per your choice.

— 𝐓𝐞𝐚𝐦 ${selectedStore?.name} 💚`,
          },
        ],
      },
      {
        title: "Products",
        messages: [
          {
            label: "Availability",
            message:
              "🛍️ Yes, this item is available right now! You can place your order whenever you’re ready — I’ll help you through the process.",
          },
          {
            label: "Low Stock",
            message:
              "⚠️ This item is almost sold out! Try to confirm your order soon before it runs out.",
          },
          {
            label: "Out of Stock",
            message:
              "😔 This item is currently out of stock but will be restocked soon. Updates will be shared as soon as it’s available again.",
          },
          {
            label: "Variants",
            message:
              "👕 This product comes in multiple options and sizes. Please tell me which one you’d like to go with.",
          },
          {
            label: "City Inquiry",
            message:
              "🚚 We do deliver to most cities across Pakistan. Standard delivery time is usually 2–4 working days depending on your location.",
          },
          {
            label: "Offers Inquiry",
            message:
              "💰 There may be some ongoing offers — I’ll check and let you know if this product qualifies for any discount.",
          },
          {
            label: "Catalog",
            message:
              "📒 You can explore our full collection here: ${catalogLink}, or tell me what you’re looking for so I can share a few suggestions.",
          },
          {
            label: "Discount",
            message:
              "😅 Prices are already kept as low as possible. But I’ll check if there’s any current offer or voucher that can be applied.",
          },
        ],
      },
      {
        title: "Customers",
        messages: [
          {
            label: "Welcome",
            message:
              "👋 Hello and welcome to ${storeName}! Thank you for reaching out — our team will be with you shortly. 😊",
          },
          {
            label: "Got It",
            message:
              "🕐 Got your message! I’m checking the details and will update you shortly.",
          },
          {
            label: "Delay Reply",
            message:
              "⏳ Sorry for the delay — we’re experiencing a high number of messages right now, but we’ll get back to you very soon. Thanks for waiting!",
          },
          {
            label: "Need Help?",
            message:
              "🤝 Is there anything else I can help you with? I’ll be happy to assist further.",
          },
          {
            label: "Apology",
            message:
              "🙏 Sorry for the trouble you’ve faced. We’re already working to sort it out and will update you as soon as possible.",
          },
          {
            label: "Appreciation",
            message:
              "💚 That means a lot to us at ${storeName}! Thank you for your kind words and continued support.",
          },
          {
            label: "Thank you",
            message:
              "😊 Glad I could help you out! If you ever need assistance again, just message here — we’re always around.",
          },
        ],
      },
      {
        title: "Issues",
        messages: [
          {
            label: "Wrong Item",
            message: `😔 Sorry about that! Looks like you received the wrong item. Please share a quick photo, and we’ll fix it right away.`,
          },
          {
            label: "Missing Item",
            message: `📦 That shouldn’t have happened! Please confirm which item is missing so we can investigate and send a replacement if needed.`,
          },
          {
            label: "Damaged Product",
            message: `💢 Oh no! We’re really sorry your item arrived damaged. Please share a photo so we can process a replacement or refund for you.`,
          },
          {
            label: "Refund Request",
            message: `💸 Got it! Please share your order number so we can review and start your refund process.`,
          },
          {
            label: "Exchange Request",
            message: `🔁 Sure! Please tell us which item or size you’d like to exchange for — we’ll guide you through the next steps.`,
          },
          {
            label: "Late Delivery",
            message: `⏳ Sorry your order is delayed! It’s still on the way and should arrive soon. We’re tracking it closely and will update you soon.`,
          },
          {
            label: "Courier Issue",
            message: `🚚 Sorry for the courier inconvenience. We’ll contact them to resolve this and update you shortly.`,
          },
          {
            label: "Cancel Request",
            message: `❌ Okay! Please confirm if you’d like to cancel your order #${latestOrder?.name} before it’s shipped.`,
          },
          {
            label: "Not Received",
            message: `📭 Sorry to hear your parcel hasn’t arrived yet. We’re checking with the courier and will get back with a delivery update soon.`,
          },
          {
            label: "Feedback / Complaint",
            message: `💬 We’re sorry you faced an issue. Please share a little detail about what happened — we’ll do our best to fix it quickly.`,
          },
        ],
      },
    ],
    [
      userOrders?.userInfo?.name,
      latestOrder?.name,
      latestOrder?.prepaid_amount,
      latestOrder?.paymentDate,
      latestOrder?.amount,
      latestOrder?.products?.[0]?.name,
      selectedStore?.name,
    ]
  );

  const sendWhatsAppMessage = async (message) => {
    try {
      const messageInput = document.querySelector(
        'div[contenteditable="true"][data-tab="10"]'
      );
      if (!messageInput) {
        console.warn("Message input not found");
        return false;
      }

      const personalizedMessage = message.replace("[Customer]", contactName);
      messageInput.focus();
      messageInput.textContent = "";

      const inputEvent = new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: personalizedMessage,
      });
      messageInput.dispatchEvent(inputEvent);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const keyDown = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
      });
      const keyUp = new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
      });

      messageInput.dispatchEvent(keyDown);
      await new Promise((resolve) => setTimeout(resolve, 50));
      messageInput.dispatchEvent(keyUp);

      await new Promise((resolve) => setTimeout(resolve, 500));
      return messageInput.textContent === "";
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  };

  const handleSendMessage = async (msg) => {
    if (isLoadingContact) {
      alert("Please wait while we load contact information...");
      return;
    }

    const messageSent = await sendWhatsAppMessage(msg.message);

    if (!messageSent) {
      try {
        const personalizedMessage = msg.message.replace(
          "[Customer]",
          contactName
        );
        await navigator.clipboard.writeText(personalizedMessage);
      } catch {
        alert(
          `Failed to send. Here's the message:\n\n${msg.message.replace(
            "[Customer]",
            contactName
          )}`
        );
      }
    }
  };

  return (
    <section style={{ marginBottom: "10px" }}>
      {/* <h2
        style={{
          color: theme === "dark" ? "white" : "black",
          fontSize: "1.2rem",
          borderBottom: `1px solid ${theme === "dark" ? "#333" : "#e9edef"}`,
          paddingBottom: "8px",
        }}
      >
        Quick Replies
      </h2> */}

      <div
        style={{
          background: theme === "dark" ? "#23272a" : "#fff",
          borderRadius: "10px",
          border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
          overflow: "hidden",
        }}
      >
        {/* Tab Headers */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            background: theme === "dark" ? "#1a1a1a" : "#f8f9fa",
          }}
        >
          {supportTemplates.map((category, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              style={{
                flex: 1,
                padding: "12px 8px",
                background: activeTab === index ? "#00a884" : "transparent",
                color:
                  activeTab === index
                    ? "white"
                    : theme === "dark"
                    ? "white"
                    : "#222",
                border: "none",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: activeTab === index ? "600" : "400",
                borderRight:
                  index < supportTemplates.length - 1
                    ? `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`
                    : "none",
              }}
            >
              {category.title}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div
          style={{
            padding: "8px",
            // minHeight: "200px",
            maxHeight: "300px",
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
          }}
        >
          {supportTemplates[activeTab]?.messages.map((msg, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(msg)}
              disabled={isLoadingContact}
              style={{
                background: "transparent",
                border: `1px solid ${theme === "dark" ? "#333" : "#e9edef"}`,
                borderRadius: "6px",
                padding: "6px",
                textAlign: "left",
                cursor: isLoadingContact ? "not-allowed" : "pointer",
                color: theme === "dark" ? "white" : "black",
                fontSize: "14px",
                fontWeight: "400px",
                transition: "all 0.2s",
                // marginBottom: "8px",
                maxWidth: "200px",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
                opacity: isLoadingContact ? 0.7 : 1,
              }}
            >
              {msg.label}
              {/* <div
                style={{
                  fontSize: "0.8rem",
                  color: theme === "dark" ? "#ccc" : "#555",
                  marginTop: "4px",
                }}
              >
                {msg.message.replace("[Customer]", contactName)}
              </div> */}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CustomerSupportMessages;
