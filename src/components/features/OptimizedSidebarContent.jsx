// Optimized Sidebar Content component with performance improvements
import React, { memo, useMemo, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth.js";
import { useProducts, useStores, useUserInfo } from "../../hooks/useData.js";
import Card from "../ui/Card.jsx";
import Button from "../ui/Button.jsx";
import LoadingSpinner from "../ui/LoadingSpinner.jsx";
import { createThemedStyles } from "../../core/utils/themeUtils.js";

// Memoized components for better performance
const StoreItem = memo(({ store, isSelected, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(store);
  }, [store, onSelect]);

  const storeStyles = createThemedStyles({
    padding: "12px",
    border: "1px solid theme.border",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backgroundColor: isSelected ? "theme.accent" : "theme.card",
    color: isSelected ? "#ffffff" : "theme.text",
    "&:hover": {
      backgroundColor: isSelected ? "theme.accent" : "theme.border",
    },
  });

  return (
    <div style={storeStyles} onClick={handleClick}>
      <div style={{ fontWeight: "500", marginBottom: "4px" }}>{store.name}</div>
      <div style={{ fontSize: "12px", opacity: 0.8 }}>
        {store.isActive ? "Active" : "Inactive"}
      </div>
    </div>
  );
});

const ProductItem = memo(({ product, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(product);
  }, [product, onSelect]);

  const productStyles = createThemedStyles({
    display: "flex",
    alignItems: "center",
    padding: "12px",
    border: "1px solid theme.border",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backgroundColor: "theme.card",
    "&:hover": {
      backgroundColor: "theme.border",
    },
  });

  return (
    <div style={productStyles} onClick={handleClick}>
      {product.image && (
        <img
          src={product.image}
          alt={product.name}
          style={{
            width: "40px",
            height: "40px",
            objectFit: "cover",
            borderRadius: "4px",
            marginRight: "12px",
          }}
        />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: "500", marginBottom: "4px" }}>
          {product.name}
        </div>
        <div style={{ fontSize: "12px", color: "theme.subText" }}>
          {product.price} • {product.category}
        </div>
      </div>
    </div>
  );
});

const OptimizedSidebarContent = memo(
  ({
    contact = {},
    notes = "",
    onNotesChange,
    showOrderForm = false,
    onOrderFormToggle,
  }) => {
    const { isAuthenticated, userInfo } = useAuth();
    const {
      data: products,
      loading: productsLoading,
      error: productsError,
    } = useProducts();
    const {
      data: stores,
      loading: storesLoading,
      error: storesError,
    } = useStores();
    const { data: userInfoData, loading: userInfoLoading } = useUserInfo();

    // Memoized computed values
    const currentUserInfo = useMemo(
      () => userInfo || userInfoData,
      [userInfo, userInfoData]
    );

    const activeStores = useMemo(
      () => stores?.filter((store) => store.isActive) || [],
      [stores]
    );

    const catalog = useMemo(
      () =>
        products?.filter(
          (product) => !contact.storeId || product.storeId === contact.storeId
        ) || [],
      [products, contact.storeId]
    );

    // Memoized callbacks
    const handleStoreSelect = useCallback((store) => {
      console.log("Store selected:", store);
      // Handle store selection logic
    }, []);

    const handleProductSelect = useCallback((product) => {
      console.log("Product selected:", product);
      // Handle product selection logic
    }, []);

    const handleNotesChange = useCallback(
      (e) => {
        if (onNotesChange) {
          onNotesChange(e.target.value);
        }
      },
      [onNotesChange]
    );

    const handleOrderFormToggle = useCallback(() => {
      if (onOrderFormToggle) {
        onOrderFormToggle(!showOrderForm);
      }
    }, [onOrderFormToggle, showOrderForm]);

    // Styles
    const containerStyles = createThemedStyles({
      height: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "theme.bg",
      color: "theme.text",
    });

    const headerStyles = createThemedStyles({
      padding: "16px",
      borderBottom: "1px solid theme.border",
      backgroundColor: "theme.card",
    });

    const contentStyles = createThemedStyles({
      flex: 1,
      padding: "16px",
      overflowY: "auto",
    });

    const sectionStyles = createThemedStyles({
      marginBottom: "24px",
    });

    const sectionTitleStyles = createThemedStyles({
      fontSize: "16px",
      fontWeight: "600",
      marginBottom: "12px",
      color: "theme.text",
    });

    if (!isAuthenticated) {
      return (
        <div style={containerStyles}>
          <div style={headerStyles}>
            <h2 style={{ margin: 0, fontSize: "18px" }}>WhatsApp Extension</h2>
          </div>
          <div style={contentStyles}>
            <Card>
              <p>Please login to access the extension features.</p>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div style={containerStyles}>
        {/* Header */}
        <div style={headerStyles}>
          <h2 style={{ margin: 0, fontSize: "18px" }}>WhatsApp Extension</h2>
          {currentUserInfo && (
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "theme.subText",
              }}
            >
              Welcome, {currentUserInfo.name}
            </p>
          )}
        </div>

        {/* Content */}
        <div style={contentStyles}>
          {/* Contact Info */}
          {contact.name && (
            <div style={sectionStyles}>
              <h3 style={sectionTitleStyles}>Active Contact</h3>
              <Card>
                <div>
                  <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                    {contact.name}
                  </div>
                  {contact.phoneNumber && (
                    <div style={{ fontSize: "14px", color: "theme.subText" }}>
                      {contact.phoneNumber}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Stores */}
          <div style={sectionStyles}>
            <h3 style={sectionTitleStyles}>Stores</h3>
            {storesLoading ? (
              <LoadingSpinner text="Loading stores..." />
            ) : storesError ? (
              <Card>
                <p style={{ color: "#ef4444", margin: 0 }}>
                  Error: {storesError}
                </p>
              </Card>
            ) : activeStores.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {activeStores.map((store) => (
                  <StoreItem
                    key={store.id}
                    store={store}
                    onSelect={handleStoreSelect}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <p style={{ margin: 0 }}>No stores available.</p>
              </Card>
            )}
          </div>

          {/* Products Catalog */}
          <div style={sectionStyles}>
            <h3 style={sectionTitleStyles}>Products</h3>
            {productsLoading ? (
              <LoadingSpinner text="Loading products..." />
            ) : productsError ? (
              <Card>
                <p style={{ color: "#ef4444", margin: 0 }}>
                  Error: {productsError}
                </p>
              </Card>
            ) : catalog.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {catalog.slice(0, 10).map((product) => (
                  <ProductItem
                    key={product.id}
                    product={product}
                    onSelect={handleProductSelect}
                  />
                ))}
                {catalog.length > 10 && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "theme.subText",
                      textAlign: "center",
                    }}
                  >
                    And {catalog.length - 10} more products...
                  </p>
                )}
              </div>
            ) : (
              <Card>
                <p style={{ margin: 0 }}>No products available.</p>
              </Card>
            )}
          </div>

          {/* Notes */}
          <div style={sectionStyles}>
            <h3 style={sectionTitleStyles}>Notes</h3>
            <Card>
              <textarea
                value={notes}
                onChange={handleNotesChange}
                placeholder="Add notes for this contact..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  border: "1px solid theme.border",
                  borderRadius: "4px",
                  padding: "8px",
                  fontSize: "14px",
                  backgroundColor: "theme.bg",
                  color: "theme.text",
                  resize: "vertical",
                }}
              />
            </Card>
          </div>

          {/* Actions */}
          <div style={sectionStyles}>
            <Button
              variant="primary"
              onClick={handleOrderFormToggle}
              style={{ width: "100%" }}
            >
              {showOrderForm ? "Hide Order Form" : "Show Order Form"}
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

OptimizedSidebarContent.displayName = "OptimizedSidebarContent";

export default OptimizedSidebarContent;

