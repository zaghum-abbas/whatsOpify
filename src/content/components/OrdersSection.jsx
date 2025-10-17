// src/components/OrdersSection.jsx
import React, { useState, useEffect } from "react";
import {
  formatDate,
  formatPrice,
  getToken,
  sanitizePhone,
} from "../../core/utils/helperFunctions";

const OrdersSection = ({ whatsappTheme }) => {
  const [activeTab, setActiveTab] = useState("new");
  const [orders, setOrders] = useState({
    new: [],
    pending: [],
    length: {
      new: 0,
      pending: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);

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

      const response = await chrome.runtime.sendMessage({
        action: "FETCH_ORDERS",
        token: getToken(),
        status: status,
        page: page,
        limit: limit,
      });

      if (response.success) {
        console.log("response.orders", response.orders);

        return response.orders;
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

  useEffect(() => {
    const loadOrders = async () => {
      try {
        console.log("[ORDERS] Loading orders...");
        console.log("[ORDERS] Authentication check:", getToken());

        if (getToken()) {
          console.log("[ORDERS] Fetching real orders from API...");

          const [newOrders, pendingOrders] = await Promise.all([
            fetchOrders("open"),
            fetchOrders("pending"),
          ]);

          setOrders({
            new: newOrders.data,
            pending: pendingOrders.data,
            length: {
              new: newOrders.len,
              pending: pendingOrders.len,
            },
          });

          console.log(
            `[ORDERS] ✅ Loaded ${newOrders} new orders and ${pendingOrders} pending orders`
          );
        } else {
          console.log("[ORDERS] Using dummy orders data (not authenticated)");
        }
      } catch (err) {
        console.error("[ORDERS] Error loading orders:", err);
        setError(err.message);
      }
    };

    loadOrders();
  }, []);

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      console.log(`[ORDERS] Updating order ${orderId} status to ${newStatus}`);

      const tokenData = localStorage.getItem("whatsopify_token");
      if (!tokenData) {
        throw new Error("No authentication token found");
      }

      const parsedToken = JSON.parse(tokenData);
      const token = parsedToken?.data?.token || parsedToken?.token;

      if (!token) {
        throw new Error("Invalid authentication token");
      }

      const response = await chrome.runtime.sendMessage({
        action: "UPDATE_ORDER_STATUS",
        token: token,
        orderId: orderId,
        newStatus: newStatus,
      });

      console.log(`[ORDERS] Update status response:`, response);

      if (response.success) {
        console.log(
          `[ORDERS] ✅ Order ${orderId} status updated to ${newStatus}`
        );
        return true;
      } else {
        throw new Error(response.error || "Failed to update order status");
      }
    } catch (err) {
      console.error(`[ORDERS] ❌ Error updating order status:`, err);
      throw err;
    }
  };

  const handleWhatsAppRedirect = async (order, status) => {
    console.log("status", status);
    const data = localStorage.getItem("whatsopify_token");
    const store = JSON.parse(data)?.data?.stores;
    const phoneNumber = order?.shipmentDetails?.addresses[0]?.phone;
    const customerName = order?.shipmentDetails?.addresses[0]?.name;
    const city = order?.shipmentDetails?.addresses[0]?.city;
    const orderDateTime = formatDate(order?.createdAt);
    const orderId = order?.name;
    const storeName = store?.find((s) => s._id === order?.storeId)?.name;
    const productName = order?.lineItems?.[0]?.name;
    const orderTotal = formatPrice(order?.pricing?.currentTotalPrice);
    console.log("store", storeName, store);

    try {
      setUpdatingOrder(order?._id);
      if (status !== "resend") {
        await updateOrderStatus(order?._id, status);
      }
      if (activeTab === "new") {
        setOrders((prev) => ({
          ...prev,
          new: prev.new.filter((o) => o._id !== order._id),
          pending: [...prev.pending, { ...order, status: "pending" }],
        }));

        console.log(`[ORDERS] ✅ Order ${order._id} moved from new to pending`);
      }
    } catch (updateError) {
      setError(`Failed to update order status: ${updateError.message}`);
      return;
    } finally {
      setUpdatingOrder(null);
    }

    if (phoneNumber) {
      const cleanedNumber = phoneNumber
        .replace(/^\+92/, "92")
        .replace(/^0/, "92");
      if (cleanedNumber) {
        const message =
          status === "pending"
            ? `👋 Hello ${customerName},
we’ve just received your order #${orderId} at ${storeName} 🛍️ placed at ${orderDateTime}, for ${city}

🛒 𝐎𝐫𝐝𝐞𝐫 𝐃𝐞𝐭𝐚𝐢𝐥𝐬
 ${order?.lineItems
   ?.map((item) => `${item.name} - ${item.quantity}`)
   .join("\n")}


💰 ${orderTotal}

Please reply: ✅ YES to confirm your order, or
❌ NO if you’d like to cancel or make any changes.

Thanks for shopping with ${storeName} 💚
— 𝐓𝐞𝐚𝐦 ${storeName}`
            : status === "resend"
            ? `⏰ Reminder for your order #${orderId}
👋 Hello ${customerName},

We’re still waiting for your confirmation for your order placed at ${storeName} 🛍️ on ${orderDateTime}, for ${city}.

🧾 𝐎𝐫𝐝𝐞𝐫 𝐃𝐞𝐭𝐚𝐢𝐥𝐬
 ${order?.lineItems
   ?.map((item) => `${item.name} - ${item.quantity}`)
   .join("\n")}
💰 ${orderTotal}

Please reply:
✅ YES to confirm your order, or
❌ NO if you’d like to cancel or make any changes.

If we don’t hear back soon, the order may be auto-cancelled to free up stock.

💚 Thank you for shopping with ${storeName}!
— 𝐓𝐞𝐚𝐦 ${storeName}`
            : status === "confirm"
            ? `🎉 Thank you for confirmation,  ${customerName},

Our team will start processing it soon 🚚
You’ll receive updates once it’s packed and dispatched. 😊

💚 Thank you for confirming your order with ${storeName}!
— 𝐓𝐞𝐚𝐦 ${storeName}`
            : status === "cancel"
            ? `❌ Order Cancelled

Your order #${orderId} at ${storeName} 🛍️ has been cancelled as per your request on ${orderDateTime}.

We’re sorry to see you cancel 😔 — if there’s anything we can improve or if you’d like to place a new order, just reply here.

💚 Thank you for considering ${storeName}!
— 𝐓𝐞𝐚𝐦 ${storeName}`
            : "";
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
            color: whatsappTheme === "dark" ? "white" : "#333",
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
              if (getToken()) {
                console.log(
                  "[ORDERS] Fetching fresh data for both new and pending orders..."
                );

                const [newOrders, pendingOrders] = await Promise.all([
                  fetchOrders("open"), // Map "new" tab to "open" status
                  fetchOrders("pending"), // Map "pending" tab to "pending" status
                ]);

                setOrders({
                  new: newOrders.data,
                  pending: pendingOrders.data,
                  length: {
                    new: newOrders.len,
                    pending: pendingOrders.len,
                  },
                });
              } else {
                console.log(
                  "[ORDERS] Manual refresh: not authenticated, clearing both tabs"
                );
                setOrders({
                  new: [],
                  pending: [],
                  length: {
                    new: 0,
                    pending: 0,
                  },
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
          New Orders ({orders.length.new})
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
          Pending Orders ({orders.length.pending})
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
              <tr
                style={{
                  backgroundColor:
                    whatsappTheme === "dark" ? "#23272a" : "#f5f5f5",
                }}
              >
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
                    width: "200px",
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
                      alignContent: "center",
                    }}
                  >
                    {order.name}
                  </td>
                  {/* <td style={{ padding: "12px 8px" }}>{order.orderNumber}</td> */}
                  <td
                    style={{
                      padding: "12px 8px",
                      fontSize: "12px",
                      alignContent: "center",
                    }}
                  >
                    {formatDate(order.createdAt)}
                  </td>
                  <td style={{ padding: "12px 8px", alignContent: "center" }}>
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
                        {sanitizePhone(
                          order?.shipmentDetails?.addresses[0]?.phone
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                      alignContent: "center",
                      height: "100%",
                    }}
                  >
                    <button
                      onClick={() =>
                        handleWhatsAppRedirect(
                          order,
                          activeTab === "new" ? "pending" : "confirm"
                        )
                      }
                      disabled={updatingOrder === order?._id}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#25D366",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor:
                          updatingOrder === order?._id
                            ? "not-allowed"
                            : "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                        opacity: updatingOrder === order?._id ? 0.6 : 1,
                      }}
                    >
                      {updatingOrder === order?._id
                        ? "Updating..."
                        : activeTab === "new"
                        ? "Send"
                        : "Confirm"}
                    </button>
                    {activeTab === "pending" && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button
                          onClick={() =>
                            handleWhatsAppRedirect(order, "resend")
                          }
                          disabled={updatingOrder === order?._id}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#FFA500",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor:
                              updatingOrder === order?._id
                                ? "not-allowed"
                                : "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            opacity: updatingOrder === order?._id ? 0.6 : 1,
                          }}
                        >
                          {updatingOrder === order?._id
                            ? "Updating..."
                            : "Resend"}
                        </button>
                        <button
                          onClick={() =>
                            handleWhatsAppRedirect(order, "cancel")
                          }
                          disabled={updatingOrder === order?._id}
                          style={{
                            padding: "6px 12px",
                            backgroundColor: "#DC2626",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor:
                              updatingOrder === order?._id
                                ? "not-allowed"
                                : "pointer",
                            fontSize: "12px",
                            fontWeight: "500",
                            opacity: updatingOrder === order?._id ? 0.6 : 1,
                          }}
                        >
                          {updatingOrder === order?._id
                            ? "Updating..."
                            : "Cancel"}
                        </button>
                      </div>
                    )}
                    {/* <a
                      href={`https://shopilam.com/orders/${order?._id}`}
                      target="_blank"
                    >
                      <button
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#FFA500",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        Detail
                      </button>
                    </a> */}
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
