// src/components/OrdersSection.jsx
import React, { useState, useEffect } from "react";

const OrdersSection = () => {
  const [activeTab, setActiveTab] = useState("new");
  const [orders, setOrders] = useState({
    new: [],
    pending: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dummy orders data
  const dummyOrders = {
    new: [
      {
        id: "ORD-001",
        orderNumber: "WO-2024-001",
        dateTime: "2024-01-15 10:30 AM",
        customerName: "Ahmed Ali",
        phoneNumber: "+923039551524",
        status: "new",
        total: "$150.00",
        items: ["Product A", "Product B"],
      },
      {
        id: "ORD-002",
        orderNumber: "WO-2024-002",
        dateTime: "2024-01-15 11:45 AM",
        customerName: "Fatima Khan",
        phoneNumber: "+923039551524",
        status: "new",
        total: "$85.50",
        items: ["Product C"],
      },
      {
        id: "ORD-003",
        orderNumber: "WO-2024-003",
        dateTime: "2024-01-15 02:15 PM",
        customerName: "Muhammad Hassan",
        phoneNumber: "+923039551524",
        status: "new",
        total: "$200.00",
        items: ["Product D", "Product E", "Product F"],
      },
    ],
    pending: [
      {
        id: "ORD-004",
        orderNumber: "WO-2024-004",
        dateTime: "2024-01-14 09:20 AM",
        customerName: "Aisha Ahmed",
        phoneNumber: "+923039551524",
        status: "pending",
        total: "$120.00",
        items: ["Product G"],
      },
      {
        id: "ORD-005",
        orderNumber: "WO-2024-005",
        dateTime: "2024-01-14 03:45 PM",
        customerName: "Omar Sheikh",
        phoneNumber: "+923039551524",
        status: "pending",
        total: "$75.25",
        items: ["Product H", "Product I"],
      },
    ],
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    try {
      const tokenData = localStorage.getItem("whatsopify_token");
      if (tokenData) {
        const parsed = JSON.parse(tokenData);
        // Check both old and new token structures
        return !!(
          parsed &&
          ((parsed.data && parsed.data.token) || parsed.token)
        );
      }
    } catch (err) {
      console.warn("[ORDERS] Error checking authentication:", err);
    }
    return false;
  };

  // Function to fetch orders from API
  const fetchOrders = async (status, page = 1, limit = 50) => {
    try {
      setLoading(true);
      setError(null);

      // Use background script to fetch orders with token authentication
      const response = await chrome.runtime.sendMessage({
        action: "FETCH_ORDERS",
        status: status,
        page: page,
        limit: limit,
      });

      if (response.success) {
        console.log(
          `[ORDERS] ✅ ${status} orders fetched successfully:`,
          response.orders
        );

        // Process the orders data
        const processedOrders = Array.isArray(response.orders)
          ? response.orders.map((order) => ({
              id: order._id || order.id || order.orderId,
              orderNumber:
                order.orderNumber || order.order_number || order.order_id,
              dateTime:
                order.createdAt || order.created_at || order.date || "N/A",
              customerName:
                order.customerName ||
                order.customer_name ||
                order.customer?.name ||
                "Unknown",
              phoneNumber:
                order.customerPhone ||
                order.customer_phone ||
                order.customer?.phone ||
                "N/A",
              status: status,
              // Include any additional fields you might need
              total: order.total || order.totalAmount || "N/A",
              items: order.items || order.products || [],
            }))
          : [];

        return processedOrders;
      } else {
        throw new Error(response.error || "Failed to fetch orders");
      }
    } catch (err) {
      console.error(`[ORDERS] ❌ Error fetching ${status} orders:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load orders when component mounts or tab changes
  useEffect(() => {
    const loadOrders = async () => {
      try {
        console.log("[ORDERS] Loading orders...");
        console.log("[ORDERS] Authentication check:", isAuthenticated());
        console.log(
          "[ORDERS] Token in localStorage:",
          localStorage.getItem("whatsopify_token")
        );

        // For now, always show dummy data to ensure it's visible
        console.log("[ORDERS] Using dummy orders data");
        setOrders(dummyOrders);

        // TODO: Uncomment this when authentication is properly set up
        /*
        if (isAuthenticated()) {
          // Fetch real orders from API if authenticated
          const [newOrders, pendingOrders] = await Promise.all([
            fetchOrders("open"),
            fetchOrders("pending"),
          ]);

          setOrders({
            new: newOrders,
            pending: pendingOrders,
          });
        } else {
          // Use dummy data if not authenticated
          console.log("[ORDERS] Using dummy orders data (not authenticated)");
          setOrders(dummyOrders);
        }
        */
      } catch (err) {
        setError(err.message);
        console.error("[ORDERS] Error loading orders:", err);
      }
    };

    loadOrders();
  }, []);

  // Reload orders when tab changes
  useEffect(() => {
    const reloadCurrentTab = async () => {
      try {
        // For now, always use dummy data for tab switching
        console.log(`[ORDERS] Reloading ${activeTab} tab with dummy data`);
        setOrders((prev) => ({
          ...prev,
          [activeTab]: dummyOrders[activeTab],
        }));

        // TODO: Uncomment this when authentication is properly set up
        /*
        if (isAuthenticated()) {
          const status = activeTab === "new" ? "open" : "pending";
          const newOrders = await fetchOrders(status);

          setOrders((prev) => ({
            ...prev,
            [activeTab]: newOrders,
          }));
        } else {
          // Use dummy data for the current tab if not authenticated
          setOrders((prev) => ({
            ...prev,
            [activeTab]: dummyOrders[activeTab],
          }));
        }
        */
      } catch (err) {
        console.error(`[ORDERS] Error reloading ${activeTab} orders:`, err);
      }
    };

    // Only reload if we don't have data for this tab
    if (orders[activeTab].length === 0) {
      reloadCurrentTab();
    }
  }, [activeTab]);

  // const handleWhatsAppRedirect = (order) => {
  //   const cleanedNumber = order.phoneNumber.replace(/[^0-9]/g, "");
  //   if (cleanedNumber) {
  //     console.log("[ORDERS] Sending WhatsApp message request:", {
  //       phoneNumber: cleanedNumber,
  //       customerName: order.customerName,
  //       orderId: order.id,
  //     });

  //     chrome.runtime.sendMessage(
  //       {
  //         action: "SEND_WHATSAPP_MESSAGE",
  //         phoneNumber: cleanedNumber,
  //         message: `Hello ${order.customerName}, Your order #${order.id} has been successfully placed! We're processing it and will keep you updated as it moves forward. Thank you for choosing us!`,
  //       },
  //       (response) => {
  //         if (chrome.runtime.lastError) {
  //           console.error(
  //             "[ORDERS] Error sending message:",
  //             chrome.runtime.lastError
  //           );
  //         } else {
  //           console.log("[ORDERS] Message sent successfully:", response);
  //         }
  //       }
  //     );
  //   }
  // };

  const handleWhatsAppRedirect = (order) => {
    const cleanedNumber = order.phoneNumber.replace(/[^0-9]/g, "");
    if (cleanedNumber) {
      console.log("[ORDERS] Sending WhatsApp message request:", {
        phoneNumber: cleanedNumber,
        customerName: order.customerName,
        orderId: order.id,
      });

      chrome.runtime.sendMessage(
        {
          action: "SEND_WHATSAPP_MESSAGE",
          phoneNumber: cleanedNumber,
          message: `Hello ${order.customerName}, Your order #${order.id} has been successfully placed! We're processing it and will keep you updated as it moves forward. Thank you for choosing us!`,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "[ORDERS] Error sending message:",
              chrome.runtime.lastError
            );
          } else {
            console.log("[ORDERS] Message sent successfully:", response);
          }
        }
      );
    }
  };

  const currentOrders = orders[activeTab];

  return (
    <div className="orders-section" style={{ padding: "16px" }}>
      <h2
        style={{
          marginBottom: "16px",
          fontSize: "18px",
          fontWeight: "bold",
          color: "#333",
        }}
      >
        Orders Management
      </h2>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#666",
            fontSize: "14px",
          }}
        >
          Loading orders...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#dc2626",
            fontSize: "14px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            marginBottom: "16px",
          }}
        >
          Error: {error}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginLeft: "10px",
              padding: "4px 8px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e0e0e0",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => setActiveTab("new")}
          style={{
            padding: "8px 16px",
            border: "none",
            background: activeTab === "new" ? "#25D366" : "transparent",
            color: activeTab === "new" ? "white" : "#666",
            cursor: "pointer",
            borderBottom:
              activeTab === "new"
                ? "2px solid #25D366"
                : "2px solid transparent",
            transition: "all 0.3s ease",
          }}
        >
          New Orders ({orders.new.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          style={{
            padding: "8px 16px",
            border: "none",
            background: activeTab === "pending" ? "#FFA500" : "transparent",
            color: activeTab === "pending" ? "white" : "#666",
            cursor: "pointer",
            borderBottom:
              activeTab === "pending"
                ? "2px solid #FFA500"
                : "2px solid transparent",
            transition: "all 0.3s ease",
          }}
        >
          Pending Orders ({orders.pending.length})
        </button>
      </div>

      {/* Orders Table */}
      <div
        style={{
          overflowX: "auto",
          border: "1px solid #e0e0e0",
          borderRadius: "8px",
        }}
      >
        {currentOrders.length > 0 ? (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "left",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: "600",
                  }}
                >
                  Order ID
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "left",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: "600",
                  }}
                >
                  Order Number
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "left",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: "600",
                  }}
                >
                  Date & Time
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "left",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: "600",
                  }}
                >
                  Name & Phone
                </th>
                <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "center",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: "600",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {currentOrders.map((order) => (
                <tr
                  key={order.id}
                  style={{ borderBottom: "1px solid #f0f0f0" }}
                >
                  <td
                    style={{
                      padding: "12px 8px",
                      fontFamily: "monospace",
                      fontSize: "12px",
                    }}
                  >
                    {order.id}
                  </td>
                  <td style={{ padding: "12px 8px" }}>{order.orderNumber}</td>
                  <td
                    style={{
                      padding: "12px 8px",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    {order.dateTime}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <div>
                      <div style={{ fontWeight: "500" }}>
                        {order.customerName}
                      </div>
                      <div
                        style={{
                          color: "#25D366",
                          cursor: "pointer",
                          fontSize: "12px",
                          textDecoration: "underline",
                        }}
                        title="Click to open WhatsApp"
                      >
                        {order.phoneNumber}
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                    }}
                  >
                    {/* Show Confirm button for both new and pending orders */}
                    <button
                      onClick={() => handleWhatsAppRedirect(order)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#25D366",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}
                    >
                      Confirm
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#666",
              fontSize: "14px",
            }}
          >
            No {activeTab} orders found.
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersSection;
