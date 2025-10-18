import React, { useState, useEffect } from "react";
import { ensureArray } from "../../core/utils/helperFunctions";

const StoreSelectionModal = ({ isOpen, onStoreSelect, onClose }) => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadStores();
    }
  }, [isOpen]);

  const loadStores = () => {
    setLoading(true);
    setError(null);

    if (typeof window.getStoresForUser === "function") {
      window.getStoresForUser((storesData) => {
        const stores = ensureArray(storesData);

        if (stores.length > 0) {
          setStores(stores);

          // ✅ Check for store saved in localStorage
          const savedStore = JSON.parse(
            localStorage.getItem("whatsopify_selected_store")
          );

          console.log("savedStore", savedStore);

          // ✅ If localStorage store exists and is valid, select it
          const savedStoreData =
            savedStore && stores.find((s) => s._id === savedStore?._id);

          let selectedStore = savedStoreData || stores[0];
          const storeId = selectedStore._id;
          setSelectedStoreId(storeId);

          // ✅ Auto-confirm if only one store
          if (stores.length === 1) {
            setTimeout(() => {
              handleConfirmSelection(selectedStore, storeId);
            }, 100);
          }
        } else {
          setError("No stores available. Please add a store first.");
        }

        setLoading(false);
      });
    } else {
      setError(
        "Store loading function not available. Please refresh the page."
      );
      setLoading(false);
    }
  };

  const handleStoreSelect = (store) => {
    const storeId = store._id;
    setSelectedStoreId(storeId);
  };

  const handleConfirmSelection = (store, storeId) => {
    if (store && storeId) {
      // Save selected store to localStorage
      localStorage.setItem("whatsopify_selected_store", JSON.stringify(store));

      // Update global store ID
      window.whatsapofyProducts.storeId = storeId;

      // Trigger API calls with the selected store ID
      triggerApiCallsWithStoreId(storeId);

      // Dispatch store change event to notify other components
      window.dispatchEvent(
        new CustomEvent("storeChanged", {
          detail: { storeId, store },
        })
      );

      // Open sidebar after store selection
      if (typeof window.toggleWhatsappSidebar === "function") {
        window.toggleWhatsappSidebar(true);
        console.log("[STORE_SELECTION] Sidebar opened after store selection");
      }

      // Notify parent component
      onStoreSelect(store);

      // Close modal
      onClose();
    }
  };

  const handleConfirm = () => {
    if (selectedStoreId) {
      const selectedStore = stores.find((store) => {
        return store._id === selectedStoreId;
      });

      if (selectedStore) {
        handleConfirmSelection(selectedStore, selectedStoreId);
      }
    }
  };

  const triggerApiCallsWithStoreId = (storeId) => {
    console.log(
      "[STORE_SELECTION] Triggering ALL API calls with store ID:",
      storeId
    );

    // Clear existing caches to force fresh data with new store ID
    if (typeof window.clearProductsCache === "function") {
      window.clearProductsCache();
    }
    if (typeof window.clearStoresCache === "function") {
      window.clearStoresCache();
    }
    if (typeof window.clearUserInfoCache === "function") {
      window.clearUserInfoCache();
    }

    // Trigger fresh data fetch with the new store ID
    setTimeout(() => {
      console.log("[STORE_SELECTION] Starting API calls for store:", storeId);

      // Fetch products with the new store ID
      if (typeof window.getProducts === "function") {
        window.getProducts((products) => {
          console.log(
            "[STORE_SELECTION] ✅ Products loaded for store:",
            storeId,
            products?.length || 0
          );
        });
      }

      // Fetch user info
      if (typeof window.getUserInfo === "function") {
        window.getUserInfo((userInfo) => {
          console.log(
            "[STORE_SELECTION] ✅ User info loaded for store:",
            storeId,
            userInfo
          );
        });
      }

      // Fetch stores (this will use the new store ID in future calls)
      if (typeof window.getStoresForUser === "function") {
        window.getStoresForUser((stores) => {
          console.log(
            "[STORE_SELECTION] ✅ Stores loaded for store:",
            storeId,
            stores?.length || 0
          );
        });
      }

      // Fetch orders with the new store ID
      if (typeof window.refreshOrders === "function") {
        window.refreshOrders((orders) => {
          console.log(
            "[STORE_SELECTION] ✅ Orders loaded for store:",
            storeId,
            orders
          );
        });
      }

      console.log(
        "[STORE_SELECTION] ✅ All API calls initiated for store:",
        storeId
      );
    }, 500); // Small delay to ensure store ID is properly set
  };

  const handleClose = () => {
    setSelectedStoreId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="store-selection-modal-overlay">
      <div className="store-selection-modal">
        <div className="store-selection-modal-header">
          <h2>Select Your Store</h2>
          <button
            className="store-selection-modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="store-selection-modal-content">
          {loading ? (
            <div className="store-selection-loading">
              <div className="spinner"></div>
              <p>Loading stores...</p>
            </div>
          ) : error ? (
            <div className="store-selection-error">
              <p>{error}</p>
              <button onClick={loadStores} className="retry-button">
                Retry
              </button>
            </div>
          ) : (
            <div className="store-selection-list">
              {ensureArray(stores)?.map((store, index) => {
                const storeId = store._id;
                const isSelected = selectedStoreId === storeId;

                return (
                  <div
                    key={storeId || index}
                    className={`store-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleStoreSelect(store)}
                  >
                    <div className="store-item-content">
                      <div className="store-item-header">
                        {/* <img src={store.logo} alt={store.platform} /> */}
                        <h3>{store.name}</h3>
                      </div>
                    </div>

                    <div className="store-item-radio">
                      <input
                        type="radio"
                        name="selectedStore"
                        checked={isSelected}
                        onChange={() => handleStoreSelect(store)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="store-selection-modal-footer">
          <button className="cancel-button" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="confirm-button"
            onClick={handleConfirm}
            disabled={!selectedStoreId}
          >
            Select Store
          </button>
        </div>
      </div>

      <style jsx>{`
        .store-selection-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        }

        .store-selection-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .store-selection-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .store-selection-modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1a202c;
        }

        .store-selection-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #718096;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .store-selection-modal-close:hover {
          background-color: #f7fafc;
        }

        .store-selection-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .store-selection-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: #718096;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3182ce;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .store-selection-error {
          text-align: center;
          padding: 40px 20px;
          color: #e53e3e;
        }

        .retry-button {
          background: #3182ce;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          margin-top: 16px;
          transition: background-color 0.2s;
        }

        .retry-button:hover {
          background: #2c5aa0;
        }

        .store-selection-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .store-item {
          display: flex;
          align-items: center;
          padding: 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .store-item:hover {
          border-color: #3182ce;
          box-shadow: 0 2px 8px rgba(49, 130, 206, 0.1);
        }

        .store-item.selected {
          border-color: #3182ce;
          background: #ebf8ff;
          box-shadow: 0 2px 8px rgba(49, 130, 206, 0.2);
        }

        .store-item-content {
          flex: 1;
        }

        .store-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .store-item-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status-badge.active {
          background: #c6f6d5;
          color: #22543d;
        }

        .status-badge.inactive {
          background: #fed7d7;
          color: #742a2a;
        }

        .store-item-description {
          margin: 0 0 8px 0;
          color: #718096;
          font-size: 14px;
          line-height: 1.4;
        }

        .store-item-details {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          color: #4a5568;
        }

        .store-detail {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .store-item-radio {
          margin-left: 12px;
        }

        .store-item-radio input[type="radio"] {
          width: 18px;
          height: 18px;
          accent-color: #3182ce;
        }

        .store-selection-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e2e8f0;
          background: #f7fafc;
        }

        .cancel-button,
        .confirm-button {
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .cancel-button {
          background: white;
          color: #4a5568;
          border: 1px solid #e2e8f0;
        }

        .cancel-button:hover {
          background: #f7fafc;
        }

        .confirm-button {
          background: #3182ce;
          color: white;
        }

        .confirm-button:hover:not(:disabled) {
          background: #2c5aa0;
        }

        .confirm-button:disabled {
          background: #a0aec0;
          cursor: not-allowed;
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .store-selection-modal {
            background: #2d3748;
            color: #e2e8f0;
          }

          .store-selection-modal-header {
            border-bottom-color: #4a5568;
          }

          .store-selection-modal-header h2 {
            color: #e2e8f0;
          }

          .store-selection-modal-close {
            color: #a0aec0;
          }

          .store-selection-modal-close:hover {
            background-color: #4a5568;
          }

          .store-item {
            background: #2d3748;
            border-color: #4a5568;
          }

          .store-item:hover {
            border-color: #3182ce;
          }

          .store-item.selected {
            background: #2a4365;
            border-color: #3182ce;
          }

          .store-item-header h3 {
            color: #e2e8f0;
          }

          .store-item-description {
            color: #a0aec0;
          }

          .store-item-details {
            color: #cbd5e0;
          }

          .store-selection-modal-footer {
            background: #1a202c;
            border-top-color: #4a5568;
          }

          .cancel-button {
            background: #4a5568;
            color: #e2e8f0;
            border-color: #718096;
          }

          .cancel-button:hover {
            background: #718096;
          }
        }
      `}</style>
    </div>
  );
};

export default StoreSelectionModal;
