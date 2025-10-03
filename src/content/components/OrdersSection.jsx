// src/components/OrdersSection.jsx
import React, { useState, useEffect } from "react";
import {
  formatDate,
  formatPrice,
  getToken,
} from "../../core/utils/helperFunctions";

const OrdersSection = () => {
  const [activeTab, setActiveTab] = useState("new");
  const [orders, setOrders] = useState({
    new: [],
    pending: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debug function to test orders API
  const testOrdersAPI = async (status = "open") => {
    console.log(`🧪 Testing Orders API for status: ${status}`);
    try {
      const result = await fetchOrders(status);
      console.log(`✅ Orders API test successful for ${status}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Orders API test failed for ${status}:`, error);
      return null;
    }
  };

  // Expose debug function to window for testing
  React.useEffect(() => {
    window.testOrdersAPI = testOrdersAPI;
  }, []);

  const fetchOrders = async (status, page = 1, limit = 50) => {
    try {
      setLoading(true);
      setError(null);
      const tokenData = localStorage.getItem("whatsopify_token");
      if (!tokenData) {
        throw new Error("No authentication token found");
      }

      const parsedToken = JSON.parse(tokenData);
      const token = parsedToken?.data?.token || parsedToken?.token;

      if (!token) {
        throw new Error("Invalid authentication token");
      }

      console.log(
        `[ORDERS] Fetching ${status} orders with token:`,
        token.substring(0, 20) + "..."
      );

      // Use background script to fetch orders with token authentication
      const response = await chrome.runtime.sendMessage({
        action: "FETCH_ORDERS",
        token: token,
        status: status,
        page: page,
        limit: limit,
      });

      console.log(`[ORDERS] API Response for ${status}:`, response);

      if (response.success) {
        console.log(
          `[ORDERS] ✅ ${status} orders fetched successfully:`,
          response.orders
        );

        let ordersData = [];

        // Handle different response structures
        if (Array.isArray(response.orders)) {
          ordersData = response.orders;
        } else if (
          response.orders?.data &&
          Array.isArray(response.orders.data)
        ) {
          ordersData = response.orders.data;
        } else if (
          response.orders?.orders &&
          Array.isArray(response.orders.orders)
        ) {
          ordersData = response.orders.orders;
        } else {
          console.warn(
            `[ORDERS] Unexpected response structure for ${status}:`,
            response.orders
          );
          ordersData = [];
        }

        return ordersData;
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

  // Load orders when component mounts
  useEffect(() => {
    const loadOrders = async () => {
      try {
        console.log("[ORDERS] Loading orders...");
        console.log("[ORDERS] Authentication check:", getToken());

        if (getToken()) {
          // Fetch real orders from API if authenticated
          console.log("[ORDERS] Fetching real orders from API...");

          try {
            const [newOrders, pendingOrders] = await Promise.all([
              fetchOrders("open"), // Map "new" tab to "open" status
              fetchOrders("pending"), // Map "pending" tab to "pending" status
            ]);

            setOrders({
              new: newOrders,
              pending: pendingOrders,
            });

            console.log(
              `[ORDERS] ✅ Loaded ${newOrders.length} new orders and ${pendingOrders.length} pending orders`
            );
          } catch (apiError) {
            console.error(
              "[ORDERS] API fetch failed, falling back to dummy data:",
              apiError
            );
            setError(apiError.message);
          }
        } else {
          // Use dummy data if not authenticated
          console.log("[ORDERS] Using dummy orders data (not authenticated)");
        }
      } catch (err) {
        setError(err.message);
        console.error("[ORDERS] Error loading orders:", err);
        // Fallback to dummy data on any error
      }
    };

    loadOrders();
  }, []);

  useEffect(() => {
    const reloadCurrentTab = async () => {
      try {
        // Only reload if we don't have data for this tab
        if (orders[activeTab].length > 0) {
          console.log(
            `[ORDERS] ${activeTab} tab already has data, skipping reload`
          );
          return;
        }

        console.log(`[ORDERS] Reloading ${activeTab} tab...`);

        if (isAuthenticated()) {
          // Map tab names to API status values
          const status = activeTab === "new" ? "open" : "pending";
          console.log(
            `[ORDERS] Fetching ${status} orders for ${activeTab} tab`
          );

          try {
            const newOrders = await fetchOrders(status);

            setOrders((prev) => ({
              ...prev,
              [activeTab]: newOrders,
            }));

            console.log(
              `[ORDERS] ✅ Reloaded ${newOrders.length} orders for ${activeTab} tab`
            );
          } catch (apiError) {
            console.error(
              `[ORDERS] API fetch failed for ${activeTab} tab, using cached data:`,
              apiError
            );
            // Don't update orders if API fails, keep existing data
          }
        } else {
          // Use empty data for the current tab if not authenticated
          console.log(
            `[ORDERS] Using empty data for ${activeTab} tab (not authenticated)`
          );
          setOrders((prev) => ({
            ...prev,
            [activeTab]: [],
          }));
        }
      } catch (err) {
        console.error(`[ORDERS] Error reloading ${activeTab} orders:`, err);
      }
    };

    // Only reload if we don't have data for this tab
    reloadCurrentTab();
  }, [activeTab]);

  const handleWhatsAppRedirect = (order) => {
    const phoneNumber = order?.shipmentDetails?.addresses[0]?.phone;
    const customerName = order?.shipmentDetails?.addresses[0]?.name;
    const orderId = order?.name;
    const storeName = order?.lineItems[0]?.vendor;
    const productName = order?.lineItems?.[0]?.name;
    const orderTotal = formatPrice(order?.pricing?.currentTotalPrice);

    if (phoneNumber) {
      const cleanedNumber = "92" + phoneNumber?.slice(1);
      if (cleanedNumber) {
        const message =
          activeTab === "new"
            ? `Hello ${customerName}, 👋  

We’ve received your order ${orderId} at ${storeName}.  

🛒 Product: ${productName}  
💰 Order Total: ${orderTotal}  

Please reply with *YES* to confirm your order, or *NO* if you’d like to cancel/change it.  

Thank you for choosing us!  
– ${storeName} Team`
            : `Hello ${customerName}, ⏰  

Your order ${orderId} at ${storeName} is still awaiting confirmation.  

🛒 Product: ${productName}  
💰 Order Total: ${orderTotal}  

Please reply with *YES* to confirm or *NO* to cancel/change.  
We’ll only process the order once we get your response.  

Thank you!  
– ${storeName} Team`;

        chrome.runtime.sendMessage(
          {
            action: "SEND_WHATSAPP_MESSAGE",
            phoneNumber: cleanedNumber,
            message: message,
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
    } else {
      console.warn("[ORDERS] No phone number found for order:", order);
    }
  };

  const currentOrders = orders[activeTab];

  return (
    <div className="orders-section" style={{ padding: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: "#333",
            margin: 0,
          }}
        >
          Orders Management
        </h2>
        <button
          onClick={async () => {
            console.log("[ORDERS] Manual refresh triggered for both tabs");
            setError(null);
            try {
              if (isAuthenticated()) {
                console.log(
                  "[ORDERS] Fetching fresh data for both new and pending orders..."
                );

                const [newOrders, pendingOrders] = await Promise.all([
                  fetchOrders("open"), // Map "new" tab to "open" status
                  fetchOrders("pending"), // Map "pending" tab to "pending" status
                ]);

                setOrders({
                  new: newOrders,
                  pending: pendingOrders,
                });
              } else {
                console.log(
                  "[ORDERS] Manual refresh: not authenticated, clearing both tabs"
                );
                setOrders({
                  new: [],
                  pending: [],
                });
              }
            } catch (err) {
              console.error("[ORDERS] Manual refresh failed:", err);
              setError(err.message);
            }
          }}
          disabled={loading}
          style={{
            padding: "6px 12px",
            backgroundColor: loading ? "#ccc" : "#25D366",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

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
                {/* <th
                  style={{
                    padding: "12px 8px",
                    textAlign: "left",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: "600",
                  }}
                >
                  Order Number
                </th> */}
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
                    {order.name}
                  </td>
                  {/* <td style={{ padding: "12px 8px" }}>{order.orderNumber}</td> */}
                  <td
                    style={{
                      padding: "12px 8px",
                      fontSize: "12px",
                      color: "#666",
                    }}
                  >
                    {formatDate(order.createdAt)}
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <div>
                      <div style={{ fontWeight: "500" }}>
                        {order?.shipmentDetails?.addresses[0]?.name}
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
                        {order?.shipmentDetails?.addresses[0]?.phone}
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                    }}
                  >
                    <button
                      onClick={() => handleWhatsAppRedirect(order)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor:
                          activeTab === "new" ? "#25D366" : "#FFA500",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}
                    >
                      {activeTab === "new" ? "Confirm" : "Resend"}
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
