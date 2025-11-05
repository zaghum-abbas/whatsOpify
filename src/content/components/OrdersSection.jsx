import React, { useState, useEffect, useRef } from "react";
import {
  formatDate,
  formatPrice,
  getToken,
  sanitizePhone,
} from "../../core/utils/helperFunctions";
import { FaSync, FaSpinner } from "react-icons/fa";

const OrdersSection = ({ whatsappTheme }) => {
  const [activeTab, setActiveTab] = useState("new");
  const [orders, setOrders] = useState({
    new: [],
    pending: [],
    returned: [],
    length: {
      new: 0,
      pending: 0,
      returned: 0,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [sendProgress, setSendProgress] = useState({
    current: 0,
    total: 0,
    currentOrder: null,
  });
  const shouldStopRef = useRef(false);
  const sidebarWatcherRef = useRef(null);

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

      const selectedStore = JSON.parse(
        localStorage.getItem("whatshopify_selected_store")
      );
      const response = await chrome.runtime.sendMessage({
        action: "FETCH_ORDERS",
        token: getToken(),
        status: status,
        page: page,
        limit: limit,
        storeId: selectedStore?._id,
      });

      if (response.success) {
        console.log("response.orders", response.orders);

        return response.orders;
      } else {
        console.log("response", response);
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
        if (getToken()) {
          const [newOrders, pendingOrders, returnedOrders] = await Promise.all([
            fetchOrders("open"),
            fetchOrders("pending"),
            fetchOrders("returned"),
          ]);

          setOrders({
            new: newOrders.data,
            pending: pendingOrders.data,
            returned: returnedOrders.data,
            length: {
              new: newOrders.len,
              pending: pendingOrders.len,
              returned: returnedOrders.len,
            },
          });

          console.log(
            `[ORDERS] ✅ Loaded ${newOrders.len} new, ${pendingOrders.len} pending, and ${returnedOrders.len} returned orders`
          );
        }
      } catch (err) {
        console.error("[ORDERS] Error loading orders:", err);
        setOrders({
          new: [],
          pending: [],
          returned: [],
          length: {
            new: 0,
            pending: 0,
            returned: 0,
          },
        });

        setError(err.message);
      }
    };

    // Check if we need to continue "Send All" process after reload - DO THIS IMMEDIATELY
    const sendAllState = localStorage.getItem("whatshopify_send_all_state");
    if (sendAllState) {
      try {
        const state = JSON.parse(sendAllState);
        if (state.isActive && !state.shouldStop) {
          console.log("[ORDERS] Resuming Send All process after reload...");

          // Set flag to keep sidebar open
          localStorage.setItem("whatshopify_keep_sidebar_open", "true");

          // Restore progress state
          setSendProgress({
            current: state.totalSent || 0,
            total: state.initialCount || 0,
            currentOrder: null,
          });
          setIsSendingAll(true);

          // Function to open sidebar with retries - MORE AGGRESSIVE
          const openSidebarWithRetry = (attempt = 0, maxAttempts = 10) => {
            console.log(
              `[ORDERS] Attempting to open sidebar (attempt ${
                attempt + 1
              }/${maxAttempts})...`
            );

            // Check if functions are available
            const hasToggle =
              typeof window.toggleWhatsappSidebar === "function";
            const hasSwitch =
              typeof window.switchToDefaultSidebar === "function";
            const hasShow = typeof window.showOrdersSection === "function";

            if (hasToggle && hasSwitch && hasShow) {
              console.log(
                "[ORDERS] All sidebar functions available, opening sidebar..."
              );

              // Open sidebar
              window.toggleWhatsappSidebar(true);

              // Switch to default sidebar mode (which contains orders)
              window.switchToDefaultSidebar();

              // Open orders section in sidebar
              window.showOrdersSection();

              // Verify sidebar is open by checking DOM
              setTimeout(() => {
                const sidebarRoot = document.getElementById(
                  "whatsapp-sidebar-root"
                );
                const sidebarVisible =
                  sidebarRoot &&
                  sidebarRoot.offsetParent !== null &&
                  window.getComputedStyle(sidebarRoot).display !== "none";

                if (sidebarVisible) {
                  console.log("[ORDERS] ✅ Sidebar opened successfully");

                  // Set up watcher to keep sidebar open
                  if (sidebarWatcherRef.current) {
                    clearInterval(sidebarWatcherRef.current);
                  }
                  sidebarWatcherRef.current = setInterval(() => {
                    const sidebarRoot = document.getElementById(
                      "whatsapp-sidebar-root"
                    );
                    const sidebarVisible =
                      sidebarRoot &&
                      sidebarRoot.offsetParent !== null &&
                      window.getComputedStyle(sidebarRoot).display !== "none";

                    if (
                      !sidebarVisible &&
                      typeof window.toggleWhatsappSidebar === "function"
                    ) {
                      console.log("[ORDERS] Sidebar was closed, reopening...");
                      window.toggleWhatsappSidebar(true);
                      window.switchToDefaultSidebar();
                      window.showOrdersSection();
                    }

                    // Check if we should stop watching
                    const currentState = localStorage.getItem(
                      "whatshopify_send_all_state"
                    );
                    if (!currentState) {
                      if (sidebarWatcherRef.current) {
                        clearInterval(sidebarWatcherRef.current);
                        sidebarWatcherRef.current = null;
                      }
                      localStorage.removeItem("whatshopify_keep_sidebar_open");
                    }
                  }, 500);

                  // Wait for orders to load before continuing
                  loadOrders().then(() => {
                    // Continue sending after a delay to ensure everything is loaded
                    setTimeout(() => {
                      continueSendAll(state);
                    }, 1500);
                  });
                } else {
                  console.warn(
                    "[ORDERS] ⚠️ Sidebar root not found or not visible, retrying..."
                  );
                  if (attempt < maxAttempts - 1) {
                    setTimeout(
                      () => openSidebarWithRetry(attempt + 1, maxAttempts),
                      300
                    );
                  } else {
                    console.error(
                      "[ORDERS] ❌ Failed to open sidebar after all attempts"
                    );
                    // Still try to continue
                    loadOrders().then(() => {
                      setTimeout(() => continueSendAll(state), 2000);
                    });
                  }
                }
              }, 300);
            } else {
              console.warn(
                `[ORDERS] ⚠️ Sidebar functions not ready yet. Toggle: ${hasToggle}, Switch: ${hasSwitch}, Show: ${hasShow}`
              );
              if (attempt < maxAttempts - 1) {
                setTimeout(
                  () => openSidebarWithRetry(attempt + 1, maxAttempts),
                  300
                );
              } else {
                console.error(
                  "[ORDERS] ❌ Sidebar functions not available after all attempts"
                );
                // Try anyway with what we have
                if (hasToggle) window.toggleWhatsappSidebar(true);
                if (hasSwitch) window.switchToDefaultSidebar();
                if (hasShow) window.showOrdersSection();
                loadOrders().then(() => {
                  setTimeout(() => continueSendAll(state), 2000);
                });
              }
            }
          };

          // Start opening sidebar IMMEDIATELY - don't wait for loadOrders
          setTimeout(() => {
            openSidebarWithRetry();
          }, 100);
        } else {
          // Clear stale state
          localStorage.removeItem("whatshopify_send_all_state");
          localStorage.removeItem("whatshopify_keep_sidebar_open");
        }
      } catch (err) {
        console.error("[ORDERS] Error parsing send all state:", err);
        localStorage.removeItem("whatshopify_send_all_state");
        localStorage.removeItem("whatshopify_keep_sidebar_open");
      }
    } else {
      // Normal load - no send all in progress
      loadOrders();
    }

    // handle store change
    const handleStoreChange = () => {
      console.log("[ORDERS] Store changed — reloading orders...");
      loadOrders();
    };

    window.addEventListener("storeChanged", handleStoreChange);

    // cleanup on unmount
    return () => {
      window.removeEventListener("storeChanged", handleStoreChange);
      // Clean up sidebar watcher
      if (sidebarWatcherRef.current) {
        clearInterval(sidebarWatcherRef.current);
        sidebarWatcherRef.current = null;
      }
    };
  }, []); // 👈 single effect for both mount + store change

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      console.log(`[ORDERS] Updating order ${orderId} status to ${newStatus}`);

      const tokenData = localStorage.getItem("whatshopify_token");
      if (!tokenData) {
        throw new Error("No authentication token found");
      }

      const parsedToken = JSON.parse(tokenData);
      const token = parsedToken?.data?.token || parsedToken?.token;

      if (!token) {
        throw new Error("Invalid authentication token");
      }

      // Get selected store ID
      const selectedStore = localStorage.getItem("whatshopify_selected_store");
      let storeId = "";
      if (selectedStore) {
        try {
          const store = JSON.parse(selectedStore);
          storeId = store._id;
        } catch (err) {
          console.warn("[ORDERS] Error parsing selected store:", err);
        }
      }

      const response = await chrome.runtime.sendMessage({
        action: "UPDATE_ORDER_STATUS",
        token: token,
        orderId: orderId,
        newStatus: newStatus,
        storeId: storeId,
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

  const continueSendAll = async (state) => {
    console.log("[ORDERS] Continuing Send All process...", state);

    // Check if we should stop FIRST - before doing anything
    const currentState = localStorage.getItem("whatshopify_send_all_state");
    if (currentState) {
      try {
        const parsedState = JSON.parse(currentState);
        if (parsedState.shouldStop) {
          console.log("[ORDERS] Send All was stopped - aborting immediately");
          localStorage.removeItem("whatshopify_send_all_state");
          localStorage.removeItem("whatshopify_keep_sidebar_open");
          setIsSendingAll(false);
          setSendProgress({ current: 0, total: 0, currentOrder: null });
          return;
        }
      } catch (err) {
        console.error("[ORDERS] Error parsing state:", err);
      }
    }

    // Also check the ref
    if (shouldStopRef.current) {
      console.log("[ORDERS] Stop ref is set - aborting immediately");
      localStorage.removeItem("whatshopify_send_all_state");
      localStorage.removeItem("whatshopify_keep_sidebar_open");
      setIsSendingAll(false);
      setSendProgress({ current: 0, total: 0, currentOrder: null });
      return;
    }

    // Only set these if we're not stopping
    setIsSendingAll(true);
    // DON'T reset shouldStopRef here - it might already be set to true!

    let totalSent = state.totalSent || 0;
    let initialCount = state.initialCount || 0;

    // Fetch fresh orders to ensure we have latest data
    let currentNewOrders = [];
    try {
      const newOrdersResult = await fetchOrders("open");
      currentNewOrders = newOrdersResult.data || [];

      // Update state with fresh orders
      setOrders((prev) => ({
        ...prev,
        new: currentNewOrders,
        length: {
          ...prev.length,
          new: newOrdersResult.len || 0,
        },
      }));
    } catch (err) {
      console.error("[ORDERS] Error fetching fresh orders:", err);
      // Fallback to current state
      currentNewOrders = orders.new;
    }

    if (currentNewOrders.length === 0) {
      console.log("[ORDERS] ✅ All new orders have been sent!");
      localStorage.removeItem("whatshopify_send_all_state");
      localStorage.removeItem("whatshopify_keep_sidebar_open");
      setIsSendingAll(false);
      setSendProgress({ current: 0, total: 0, currentOrder: null });
      return;
    }

    // Get the first order
    const order = currentNewOrders[0];

    if (!order) {
      localStorage.removeItem("whatshopify_send_all_state");
      localStorage.removeItem("whatshopify_keep_sidebar_open");
      setIsSendingAll(false);
      setSendProgress({ current: 0, total: 0, currentOrder: null });
      return;
    }

    // Check if user clicked Stop BEFORE sending message
    if (shouldStopRef.current) {
      console.log("[ORDERS] Stop requested before sending message, aborting");
      localStorage.removeItem("whatshopify_send_all_state");
      localStorage.removeItem("whatshopify_keep_sidebar_open");
      setIsSendingAll(false);
      setSendProgress({ current: 0, total: 0, currentOrder: null });
      return;
    }

    // Double check localStorage stop flag before sending
    const checkState = localStorage.getItem("whatshopify_send_all_state");
    if (checkState) {
      try {
        const parsedCheckState = JSON.parse(checkState);
        if (parsedCheckState.shouldStop) {
          console.log(
            "[ORDERS] Stop flag detected before sending message, aborting"
          );
          localStorage.removeItem("whatshopify_send_all_state");
          localStorage.removeItem("whatshopify_keep_sidebar_open");
          setIsSendingAll(false);
          setSendProgress({ current: 0, total: 0, currentOrder: null });
          return;
        }
      } catch (err) {
        console.error("[ORDERS] Error parsing state before send:", err);
      }
    }

    const progressState = {
      current: totalSent + 1,
      total: initialCount,
      currentOrder: order.name,
    };
    setSendProgress(progressState);

    try {
      // Check one more time right before sending
      if (shouldStopRef.current) {
        console.log("[ORDERS] Stop requested right before sending, aborting");
        localStorage.removeItem("whatshopify_send_all_state");
        localStorage.removeItem("whatshopify_keep_sidebar_open");
        setIsSendingAll(false);
        setSendProgress({ current: 0, total: 0, currentOrder: null });
        return;
      }

      // Send message for this order
      await handleWhatsAppRedirect(order, "pending");

      // Check again after sending (in case stop was clicked during send)
      if (shouldStopRef.current) {
        console.log("[ORDERS] Stop requested after sending message, aborting");
        localStorage.removeItem("whatshopify_send_all_state");
        localStorage.removeItem("whatshopify_keep_sidebar_open");
        setIsSendingAll(false);
        setSendProgress({ current: 0, total: 0, currentOrder: null });
        return;
      }

      totalSent++;

      // Save state to localStorage before reload
      const nextState = {
        isActive: true,
        shouldStop: false,
        totalSent: totalSent,
        initialCount: initialCount,
      };
      localStorage.setItem(
        "whatshopify_send_all_state",
        JSON.stringify(nextState)
      );

      // Wait a bit for message to be sent - but check for stop periodically
      let waitTime = 0;
      const checkInterval = 200; // Check every 200ms
      const totalWait = 2000;

      while (waitTime < totalWait) {
        // Check if stop was clicked
        if (shouldStopRef.current) {
          console.log("[ORDERS] Stop requested during wait period, aborting");
          localStorage.removeItem("whatshopify_send_all_state");
          localStorage.removeItem("whatshopify_keep_sidebar_open");
          setIsSendingAll(false);
          setSendProgress({ current: 0, total: 0, currentOrder: null });
          return;
        }

        // Check localStorage stop flag
        const waitState = localStorage.getItem("whatshopify_send_all_state");
        if (waitState) {
          try {
            const parsedWaitState = JSON.parse(waitState);
            if (parsedWaitState.shouldStop) {
              console.log("[ORDERS] Stop flag detected during wait, aborting");
              localStorage.removeItem("whatshopify_send_all_state");
              localStorage.removeItem("whatshopify_keep_sidebar_open");
              setIsSendingAll(false);
              setSendProgress({ current: 0, total: 0, currentOrder: null });
              return;
            }
          } catch (err) {
            // Continue if parsing fails
          }
        }

        await new Promise((resolve) => setTimeout(resolve, checkInterval));
        waitTime += checkInterval;
      }

      // Check if user clicked Stop before reloading
      if (shouldStopRef.current) {
        console.log("[ORDERS] Stop requested, aborting reload");
        localStorage.removeItem("whatshopify_send_all_state");
        localStorage.removeItem("whatshopify_keep_sidebar_open");
        setIsSendingAll(false);
        setSendProgress({ current: 0, total: 0, currentOrder: null });
        return;
      }

      // Double check localStorage stop flag
      const currentState = localStorage.getItem("whatshopify_send_all_state");
      if (currentState) {
        try {
          const parsedState = JSON.parse(currentState);
          if (parsedState.shouldStop) {
            console.log(
              "[ORDERS] Stop flag detected in localStorage, aborting reload"
            );
            localStorage.removeItem("whatshopify_send_all_state");
            localStorage.removeItem("whatshopify_keep_sidebar_open");
            setIsSendingAll(false);
            setSendProgress({ current: 0, total: 0, currentOrder: null });
            return;
          }
        } catch (err) {
          console.error("[ORDERS] Error parsing state before reload:", err);
        }
      }

      // Reload the page
      console.log("[ORDERS] Reloading page to continue with next order...");
      window.location.reload();
    } catch (error) {
      console.error(
        `[ORDERS] Error sending message for order ${order.name}:`,
        error
      );

      // Remove failed order and continue with next
      try {
        const [newOrdersResult] = await Promise.all([fetchOrders("open")]);

        if (newOrdersResult.data && newOrdersResult.data.length > 0) {
          // Check if user clicked Stop before reloading
          if (shouldStopRef.current) {
            console.log("[ORDERS] Stop requested after error, aborting reload");
            localStorage.removeItem("whatshopify_send_all_state");
            localStorage.removeItem("whatshopify_keep_sidebar_open");
            setIsSendingAll(false);
            setSendProgress({ current: 0, total: 0, currentOrder: null });
            return;
          }

          // Save state and reload to continue with next order
          const nextState = {
            isActive: true,
            shouldStop: false,
            totalSent: totalSent,
            initialCount: initialCount,
          };
          localStorage.setItem(
            "whatshopify_send_all_state",
            JSON.stringify(nextState)
          );

          // Wait but check for stop periodically
          let errorWaitTime = 0;
          const errorCheckInterval = 200;
          const errorTotalWait = 1000;

          while (errorWaitTime < errorTotalWait) {
            if (shouldStopRef.current) {
              console.log(
                "[ORDERS] Stop requested during error wait, aborting"
              );
              localStorage.removeItem("whatshopify_send_all_state");
              localStorage.removeItem("whatshopify_keep_sidebar_open");
              setIsSendingAll(false);
              setSendProgress({ current: 0, total: 0, currentOrder: null });
              return;
            }

            const errorWaitState = localStorage.getItem(
              "whatshopify_send_all_state"
            );
            if (errorWaitState) {
              try {
                const parsedErrorWaitState = JSON.parse(errorWaitState);
                if (parsedErrorWaitState.shouldStop) {
                  console.log(
                    "[ORDERS] Stop flag detected during error wait, aborting"
                  );
                  localStorage.removeItem("whatshopify_send_all_state");
                  localStorage.removeItem("whatshopify_keep_sidebar_open");
                  setIsSendingAll(false);
                  setSendProgress({ current: 0, total: 0, currentOrder: null });
                  return;
                }
              } catch (err) {
                // Continue if parsing fails
              }
            }

            await new Promise((resolve) =>
              setTimeout(resolve, errorCheckInterval)
            );
            errorWaitTime += errorCheckInterval;
          }

          // Final check before reload
          if (shouldStopRef.current) {
            console.log(
              "[ORDERS] Stop requested before error reload, aborting"
            );
            localStorage.removeItem("whatshopify_send_all_state");
            localStorage.removeItem("whatshopify_keep_sidebar_open");
            setIsSendingAll(false);
            setSendProgress({ current: 0, total: 0, currentOrder: null });
            return;
          }

          window.location.reload();
        } else {
          // No more orders
          localStorage.removeItem("whatshopify_send_all_state");
          localStorage.removeItem("whatshopify_keep_sidebar_open");
          setIsSendingAll(false);
          setSendProgress({ current: 0, total: 0, currentOrder: null });
        }
      } catch (err) {
        console.error("[ORDERS] Error refreshing orders after error:", err);
        localStorage.removeItem("whatshopify_send_all_state");
        localStorage.removeItem("whatshopify_keep_sidebar_open");
        setIsSendingAll(false);
        setSendProgress({ current: 0, total: 0, currentOrder: null });
      }
    }
  };

  const handleSendAll = async () => {
    if (orders.new.length === 0) {
      alert("No new orders to send!");
      return;
    }

    setIsSendingAll(true);
    shouldStopRef.current = false;

    const initialCount = orders.new.length;

    // Save initial state to localStorage
    const initialState = {
      isActive: true,
      shouldStop: false,
      totalSent: 0,
      initialCount: initialCount,
    };
    localStorage.setItem(
      "whatshopify_send_all_state",
      JSON.stringify(initialState)
    );

    setSendProgress({
      current: 0,
      total: initialCount,
      currentOrder: null,
    });

    // Start the process - send first message and reload
    await continueSendAll(initialState);
  };

  const handleStopSending = () => {
    console.log("[ORDERS] Stop button clicked - stopping send all process");

    // Set stop flag immediately
    shouldStopRef.current = true;

    // Update UI immediately
    setIsSendingAll(false);
    setSendProgress({ current: 0, total: 0, currentOrder: null });

    // Save stop state to localStorage IMMEDIATELY
    const stopState = {
      isActive: false,
      shouldStop: true,
      totalSent: 0,
      initialCount: 0,
    };
    localStorage.setItem(
      "whatshopify_send_all_state",
      JSON.stringify(stopState)
    );
    localStorage.removeItem("whatshopify_keep_sidebar_open");

    // Clear watcher interval if it exists
    if (sidebarWatcherRef.current) {
      clearInterval(sidebarWatcherRef.current);
      sidebarWatcherRef.current = null;
    }

    // Clear localStorage after a short delay to ensure it's saved first
    setTimeout(() => {
      localStorage.removeItem("whatshopify_send_all_state");
      localStorage.removeItem("whatshopify_keep_sidebar_open");
      console.log("[ORDERS] ✅ Send all process stopped and cleaned up");
    }, 500);
  };

  const handleWhatsAppRedirect = async (order, status) => {
    console.log("status", status);
    const data = localStorage.getItem("whatshopify_token");
    const store = JSON.parse(data)?.data?.stores;
    const phoneNumber = order?.shipmentDetails?.addresses[0]?.phone;
    const customerName = order?.shipmentDetails?.addresses[0]?.name;
    const city = order?.shipmentDetails?.addresses?.[0]?.city?.city;
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
we’ve just received your order #${orderId} at ${storeName} placed at ${orderDateTime}, for ${city}

𝐎𝐫𝐝𝐞𝐫 𝐃𝐞𝐭𝐚𝐢𝐥𝐬
 ${order?.lineItems
   ?.map((item) => `‣ ${item.name} - ${item.quantity}`)
   .join("\n")}


𝙊𝙧𝙙𝙚𝙧 𝙏𝙤𝙩𝙖𝙡 : Rs. ${formatPrice(orderTotal)}

Please reply:
✅ YES to confirm your order.

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
    <div
      className="orders-section"
      style={{ padding: "16px", position: "relative" }}
    >
      {/* Send All Overlay */}
      {isSendingAll && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            pointerEvents: "auto",
          }}
          onClick={(e) => {
            // Prevent closing when clicking backdrop - only close on Stop button
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            // Prevent any default behavior
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div
            style={{
              background: whatsappTheme === "dark" ? "#23272a" : "#fff",
              borderRadius: "12px",
              padding: "24px",
              minWidth: "400px",
              maxWidth: "500px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              border: `1px solid ${
                whatsappTheme === "dark" ? "#333" : "#e2e8f0"
              }`,
              pointerEvents: "auto",
              position: "relative",
              zIndex: 100000,
            }}
            onClick={(e) => {
              // Stop propagation to prevent backdrop click
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              // Prevent any default behavior
              e.stopPropagation();
            }}
          >
            <h3
              style={{
                margin: "0 0 16px 0",
                fontSize: "18px",
                fontWeight: "600",
                color: whatsappTheme === "dark" ? "white" : "#222",
              }}
            >
              Sending Messages
            </h3>

            <div
              style={{
                marginBottom: "16px",
                color: whatsappTheme === "dark" ? "#ccc" : "#666",
                fontSize: "14px",
              }}
            >
              {sendProgress.currentOrder && (
                <div style={{ marginBottom: "8px" }}>
                  Sending to: <strong>{sendProgress.currentOrder}</strong>
                </div>
              )}
              <div>
                Progress: {sendProgress.current} of {sendProgress.total}
              </div>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: whatsappTheme === "dark" ? "#333" : "#e2e8f0",
                borderRadius: "4px",
                overflow: "hidden",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  width: `${
                    (sendProgress.current / sendProgress.total) * 100
                  }%`,
                  height: "100%",
                  backgroundColor: "#25D366",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("[ORDERS] Stop button clicked");
                handleStopSending();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#DC2626",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                transition: "background-color 0.2s",
                pointerEvents: "auto",
                position: "relative",
                zIndex: 100001,
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#B91C1C";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#DC2626";
              }}
            >
              Stop
            </button>
          </div>
        </div>
      )}
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
        <div>
          <button
            onClick={handleSendAll}
            disabled={loading || isSendingAll || orders.new.length === 0}
            style={{
              padding: "6px 12px",
              backgroundColor:
                loading || isSendingAll || orders.new.length === 0
                  ? "#ccc"
                  : "#25D366",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                loading || isSendingAll || orders.new.length === 0
                  ? "not-allowed"
                  : "pointer",
              fontSize: "12px",
              fontWeight: "500",
              marginRight: "10px",
            }}
          >
            {isSendingAll ? (
              <>
                <FaSpinner
                  className="animate-spin"
                  style={{ marginRight: "4px" }}
                />
                Sending...
              </>
            ) : (
              `Send All (${orders.new.length})`
            )}
          </button>
          <button
            onClick={async () => {
              console.log("[ORDERS] Manual refresh triggered for both tabs");
              setError(null);
              try {
                if (getToken()) {
                  const [newOrders, pendingOrders, returnedOrders] =
                    await Promise.all([
                      fetchOrders("open"), // Map "new" tab to "open" status
                      fetchOrders("pending"), // Map "pending" tab to "pending" status
                      fetchOrders("returned"), // Map "returned" tab to "returned" status
                    ]);

                  setOrders({
                    new: newOrders.data,
                    pending: pendingOrders.data,
                    returned: returnedOrders.data,
                    length: {
                      new: newOrders.len,
                      pending: pendingOrders.len,
                      returned: returnedOrders.len,
                    },
                  });
                } else {
                  console.log(
                    "[ORDERS] Manual refresh: not authenticated, clearing all tabs"
                  );
                  setOrders({
                    new: [],
                    pending: [],
                    returned: [],
                    length: {
                      new: 0,
                      pending: 0,
                      returned: 0,
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
            {loading ? <FaSpinner className="animate-spin" /> : <FaSync />}
          </button>
        </div>
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
          {error}
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
          New ({orders.length.new})
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
          Pending ({orders.length.pending})
        </button>
        <button
          onClick={() => setActiveTab("returned")}
          style={{
            padding: "8px 16px",
            border: "none",
            background: activeTab === "returned" ? "#DC2626" : "transparent",
            color: activeTab === "returned" ? "white" : "#666",
            cursor: "pointer",
            borderBottom:
              activeTab === "returned"
                ? "2px solid #DC2626"
                : "2px solid transparent",
            transition: "all 0.3s ease",
          }}
        >
          Returned ({orders.length.returned})
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
