// import React, { useState, useEffect } from "react";
// import { useTheme } from "../../hooks/useTheme";

// const CustomerSupportMessages = () => {
//   const theme = useTheme();

//   const [contactName, setContactName] = useState("");
//   const [isLoadingContact, setIsLoadingContact] = useState(true);
//   const [activeTab, setActiveTab] = useState(0);

//   // Extract contact name when component mounts
//   useEffect(() => {
//     const extractContactInfo = () => {
//       try {
//         setIsLoadingContact(true);

//         const contactInfoHeader = Array.from(
//           document.querySelectorAll("div")
//         ).find((el) => el.textContent.trim() === "Contact info");

//         if (!contactInfoHeader) return;

//         const contactInfoPanel =
//           contactInfoHeader.closest("header")?.parentElement?.parentElement;
//         if (!contactInfoPanel) return;

//         const nameElement = contactInfoPanel.querySelector('span[dir="auto"]');
//         const name = nameElement?.textContent.trim() || "Customer";

//         setContactName(name);
//       } catch (error) {
//         console.error("Error extracting contact info:", error);
//         setContactName("Customer");
//       } finally {
//         setIsLoadingContact(false);
//       }
//     };

//     extractContactInfo();

//     // Set up observer to detect when contact info changes
//     const observer = new MutationObserver(extractContactInfo);
//     observer.observe(document.body, {
//       childList: true,
//       subtree: true,
//       attributes: false,
//       characterData: false,
//     });

//     return () => observer.disconnect();
//   }, []);

//   const supportTemplates = [
//     {
//       title: "Orders",
//       messages: [
//         "Hi [Customer], your order is being processed and will ship within 24 hours.",
//         "Your order is out for delivery today. Expected arrival: 3-5 PM.",
//       ],
//     },
//     {
//       title: "Products",
//       messages: [
//         "We're sorry to hear that! Please share your order number for a return request.",
//         "Your refund for order has been processed. It may take 3-5 business days to reflect.",
//       ],
//     },
//     {
//       title: "Customers",
//       messages: [
//         "This product is available in sizes S, M, L. Which one are you interested in?",
//         "The estimated delivery time for this item is 2-3 business days.",
//       ],
//     },
//     {
//       title: "Issues",
//       messages: [
//         "Your payment for order  was successful. No further action is needed.",
//         "We noticed a payment failure. Please try again or use an alternative method.",
//       ],
//     },
//   ];

//   const sendWhatsAppMessage = async (message) => {
//     // Same reliable implementation from your ModalForm
//     try {
//       const messageInput = document.querySelector(
//         'div[contenteditable="true"][data-tab="10"]'
//       );
//       if (!messageInput) {
//         console.warn("Message input not found");
//         return false;
//       }

//       // Replace [Customer] placeholder
//       const personalizedMessage = message.replace("[Customer]", contactName);

//       messageInput.focus();
//       messageInput.textContent = "";

//       try {
//         await navigator.clipboard.writeText(personalizedMessage);
//         document.execCommand("paste");
//       } catch (clipboardError) {
//         messageInput.textContent = personalizedMessage;
//       }

//       const inputEvent = new InputEvent("input", {
//         bubbles: true,
//         inputType: "insertText",
//         data: personalizedMessage,
//       });
//       messageInput.dispatchEvent(inputEvent);

//       await new Promise((resolve) => setTimeout(resolve, 200));

//       const keyDownEvent = new KeyboardEvent("keydown", {
//         key: "Enter",
//         code: "Enter",
//         keyCode: 13,
//         which: 13,
//         bubbles: true,
//         cancelable: true,
//       });

//       const keyUpEvent = new KeyboardEvent("keyup", {
//         key: "Enter",
//         code: "Enter",
//         keyCode: 13,
//         which: 13,
//         bubbles: true,
//         cancelable: true,
//       });

//       messageInput.dispatchEvent(keyDownEvent);
//       await new Promise((resolve) => setTimeout(resolve, 50));
//       messageInput.dispatchEvent(keyUpEvent);

//       await new Promise((resolve) => setTimeout(resolve, 500));
//       return messageInput.textContent === "";
//     } catch (error) {
//       console.error("Error sending message:", error);
//       return false;
//     }
//   };

//   const handleSendMessage = async (message) => {
//     if (isLoadingContact) {
//       alert("Please wait while we load contact information...");
//       return;
//     }

//     const messageSent = await sendWhatsAppMessage(message);

//     if (!messageSent) {
//       try {
//         const personalizedMessage = message.replace("[Customer]", contactName);
//         await navigator.clipboard.writeText(personalizedMessage);
//         alert(
//           "Message copied to clipboard! Please paste (Ctrl+V) it in WhatsApp"
//         );
//       } catch {
//         alert(
//           `Failed to send. Here's the message:\n\n${message.replace(
//             "[Customer]",
//             contactName
//           )}`
//         );
//       }
//     }
//   };

//   return (
//     <section style={{ marginBottom: "28px" }}>
//       <h2
//         style={{
//           color: theme === "dark" ? "white" : "black",
//           fontSize: "1.2rem",
//           // marginBottom: "16px",
//           borderBottom: `1px solid ${theme === "dark" ? "#333" : "#e9edef"}`,
//           paddingBottom: "8px",
//         }}
//       >
//         Quick Replies
//       </h2>

//       <div
//         style={{
//           background: theme === "dark" ? "#23272a" : "#fff",
//           borderRadius: "10px",
//           border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
//           overflow: "hidden",
//         }}
//       >
//         {/* Tab Headers */}
//         <div
//           style={{
//             display: "flex",
//             borderBottom: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
//             background: theme === "dark" ? "#1a1a1a" : "#f8f9fa",
//           }}
//         >
//           {supportTemplates.map((category, index) => (
//             <button
//               key={index}
//               onClick={() => setActiveTab(index)}
//               style={{
//                 flex: 1,
//                 padding: "12px 8px",
//                 background:
//                   activeTab === index
//                     ? theme === "dark"
//                       ? "#00a884"
//                       : "#00a884"
//                     : "transparent",
//                 color:
//                   activeTab === index
//                     ? "white"
//                     : theme === "dark"
//                     ? "white"
//                     : "#222",
//                 border: "none",
//                 cursor: "pointer",
//                 fontSize: "0.85rem",
//                 fontWeight: activeTab === index ? "600" : "400",
//                 transition: "all 0.2s ease",
//                 borderRight:
//                   index < supportTemplates.length - 1
//                     ? `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`
//                     : "none",
//               }}
//               onMouseEnter={(e) => {
//                 if (activeTab !== index) {
//                   e.target.style.background =
//                     theme === "dark" ? "#333" : "#e9ecef";
//                 }
//               }}
//               onMouseLeave={(e) => {
//                 if (activeTab !== index) {
//                   e.target.style.background = "transparent";
//                 }
//               }}
//             >
//               {category.title}
//             </button>
//           ))}
//         </div>

//         {/* Tab Content */}
//         <div
//           style={{
//             padding: "16px",
//             minHeight: "200px",
//             maxHeight: "300px",
//             overflowY: "auto",
//           }}
//         >
//           <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
//             {supportTemplates[activeTab]?.messages.map((msg, i) => (
//               <button
//                 key={i}
//                 onClick={() => handleSendMessage(msg)}
//                 disabled={isLoadingContact}
//                 style={{
//                   background: "transparent",
//                   border: `1px solid ${theme === "dark" ? "#333" : "#e9edef"}`,
//                   borderRadius: "6px",
//                   padding: "10px 12px",
//                   textAlign: "left",
//                   cursor: isLoadingContact ? "not-allowed" : "pointer",
//                   color: theme === "dark" ? "white" : "black",
//                   fontSize: "0.9rem",
//                   transition: "all 0.2s",
//                   opacity: isLoadingContact ? 0.7 : 1,
//                 }}
//                 onMouseEnter={(e) => {
//                   if (!isLoadingContact) {
//                     e.target.style.background =
//                       theme === "dark" ? "#333" : "#f8f9fa";
//                     e.target.style.borderColor =
//                       theme === "dark" ? "#00a884" : "#00a884";
//                   }
//                 }}
//                 onMouseLeave={(e) => {
//                   if (!isLoadingContact) {
//                     e.target.style.background = "transparent";
//                     e.target.style.borderColor =
//                       theme === "dark" ? "#333" : "#e9edef";
//                   }
//                 }}
//               >
//                 {isLoadingContact
//                   ? "Loading..."
//                   : msg.replace("[Customer]", contactName)}
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default CustomerSupportMessages;

import React, { useState, useEffect } from "react";
import { useTheme } from "../../hooks/useTheme";

const CustomerSupportMessages = () => {
  const theme = useTheme();

  const [contactName, setContactName] = useState("");
  const [isLoadingContact, setIsLoadingContact] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Extract contact name
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

    const observer = new MutationObserver(extractContactInfo);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const supportTemplates = [
    {
      title: "Orders",
      messages: [
        {
          label: "Being Processed",
          message: `🚚 Order in Process

Your order #${orderId} is now being prepared for dispatch 🧳
We’ll notify you as soon as it’s shipped and share the tracking link for easy updates.

💚 Thank you for your patience!`,
        },
        {
          label: "Slight Delivery Delay",
          message:
            "Hi [Customer], we’re experiencing a slight delay. Your order will be shipped soon.",
        },
        {
          label: "Dispatched",
          message:
            "Hi [Customer], your order has been dispatched and is on its way!",
        },
        {
          label: "Payment Received",
          message:
            "Hi [Customer], your payment has been received successfully. Thank you for your order!",
        },
      ],
    },
    {
      title: "Products",
      messages: [
        {
          label: "Return Request",
          message:
            "We're sorry to hear that! Please share your order number for a return request.",
        },
        {
          label: "Refund Processed",
          message:
            "Your refund for order has been processed. It may take 3-5 business days to reflect.",
        },
      ],
    },
    {
      title: "Customers",
      messages: [
        {
          label: "Available Sizes",
          message:
            "This product is available in sizes S, M, L. Which one are you interested in?",
        },
        {
          label: "Delivery Time",
          message:
            "The estimated delivery time for this item is 2-3 business days.",
        },
      ],
    },
    {
      title: "Issues",
      messages: [
        {
          label: "Payment Successful",
          message:
            "Your payment for order was successful. No further action is needed.",
        },
        {
          label: "Payment Failed",
          message:
            "We noticed a payment failure. Please try again or use an alternative method.",
        },
      ],
    },
  ];

  // 🔹 Message sender
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

      try {
        await navigator.clipboard.writeText(personalizedMessage);
        document.execCommand("paste");
      } catch {
        messageInput.textContent = personalizedMessage;
      }

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
        alert(
          "Message copied to clipboard! Please paste (Ctrl+V) it in WhatsApp"
        );
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
    <section style={{ marginBottom: "28px" }}>
      <h2
        style={{
          color: theme === "dark" ? "white" : "black",
          fontSize: "1.2rem",
          borderBottom: `1px solid ${theme === "dark" ? "#333" : "#e9edef"}`,
          paddingBottom: "8px",
        }}
      >
        Quick Replies
      </h2>

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
            padding: "16px",
            // minHeight: "200px",
            maxHeight: "300px",
            overflowY: "auto",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
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
                padding: "10px 12px",
                textAlign: "left",
                cursor: isLoadingContact ? "not-allowed" : "pointer",
                color: theme === "dark" ? "white" : "black",
                fontSize: "0.9rem",
                transition: "all 0.2s",
                // marginBottom: "8px",
                opacity: isLoadingContact ? 0.7 : 1,
              }}
            >
              <strong>{msg.label}</strong>
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
