import React, { useMemo, useState, useEffect } from "react";
import CustomerSupportMessages from "./CustomerSupportMessages";
import {
  downloadImageAsFile,
  ensureArray,
  formatDate,
  formatPhoneNumber,
  formatPrice,
  getAllProductImages,
  showProductImages,
  showVariantImages,
} from "../../core/utils/helperFunctions";
import { useDebounce } from "../../hooks/useDebounce";
import { useTheme, getThemeColors } from "../../hooks/useTheme";

const CatalogItem = ({ item, handleProductClick, theme }) => {
  const [imageState, setImageState] = useState({
    loading: false,
    downloaded: false,
    error: null,
    preview: null,
  });
  // Store images for each variant individually
  const [variantImages, setVariantImages] = useState({});
  const colors = getThemeColors(theme);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasVariants = item?.variants && item.variants.length > 1;

  const handleToggleExpand = (e) => {
    e.stopPropagation(); // Prevent triggering product click
    setIsExpanded(!isExpanded);
  };

  const handleVariantClick = (e, variant) => {
    e.stopPropagation();

    const variantItem = { ...item, variants: [variant] };

    // Get matched images for that single variant
    const variantImages = showVariantImages(item.images, variant);
    console.log("Variant images:", variantImages);

    // Pass it along with variant data
    handleProductClick({
      ...variantItem,
      images: [{ url: variantImages }],
    });
  };

  useEffect(() => {
    const processImage = async () => {
      const imageUrl = showProductImages(item);
      console.log("imageUrl", imageUrl);
      const filename = `${item.title.replace(/[^a-zA-Z0-9]/g, "_")}.jpg`;
      if (imageUrl) {
        setImageState((prev) => ({ ...prev, loading: true }));

        try {
          const imageFile = await downloadImageAsFile(imageUrl, filename);
          console.log("imageFile", imageFile);
          const objectUrl = URL.createObjectURL(imageFile);
          setImageState({
            loading: false,
            downloaded: true,
            error: null,
            preview: objectUrl,
          });
        } catch (error) {
          console.error("Error downloading image:", error);
          // Error handling
        }
      }
    };
    processImage();
  }, [item.title, item.images]);

  // Process variant images for each variant individually
  useEffect(() => {
    const processAllVariantImages = async () => {
      if (!item.variants || item.variants.length === 0) return;

      // Process each variant's image individually
      for (const variant of item.variants) {
        if (!variant?.imageId) continue;

        const variantKey =
          variant.id ||
          variant.title ||
          `variant_${item.variants.indexOf(variant)}`;

        setVariantImages((prev) => ({
          ...prev,
          [variantKey]: {
            loading: true,
            downloaded: false,
            error: null,
            preview: null,
          },
        }));

        const imageUrl = showVariantImages(item.images, variant);
        console.log(
          `[VARIANT] Processing image for variant: ${variant.title}`,
          imageUrl
        );

        if (imageUrl) {
          try {
            const filename = `${
              variant.title?.replace(/[^a-zA-Z0-9]/g, "_") || "variant"
            }.jpg`;
            const imageFile = await downloadImageAsFile(imageUrl, filename);
            console.log(
              `[VARIANT] Image downloaded for ${variant.title}:`,
              imageFile
            );

            if (imageFile) {
              const objectUrl = URL.createObjectURL(imageFile);

              // Store the processed image for this specific variant
              setVariantImages((prev) => ({
                ...prev,
                [variantKey]: {
                  loading: false,
                  downloaded: true,
                  error: null,
                  preview: objectUrl,
                },
              }));
            }
          } catch (error) {
            console.error(
              `[VARIANT] Error processing image for ${variant.title}:`,
              error
            );
            setVariantImages((prev) => ({
              ...prev,
              [variantKey]: {
                loading: false,
                downloaded: false,
                error: error.message,
                preview: null,
              },
            }));
          }
        } else {
          // No image URL found
          setVariantImages((prev) => ({
            ...prev,
            [variantKey]: {
              loading: false,
              downloaded: false,
              error: null,
              preview: null,
            },
          }));
        }
      }
    };

    processAllVariantImages();
  }, [item.variants, item.images]);

  return (
    <>
      <div
        style={{
          background: colors.card,
          // borderRadius: "8px",
          // paddingBottom: "12px",
          // marginBottom: "12px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-1px)";
          e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "0 1px 4px rgba(0,0,0,0.07)";
        }}
        onClick={() => handleProductClick(item)}
      >
        {/* Main Product Row */}
        <div
          // onClick={() => handleProductClick(item)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
          }}
        >
          {console.log("showimages", imageState.preview)}

          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "6px",
              overflow: "hidden",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {item.images && item.images.length > 0 ? (
              <>
                {imageState.loading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      background: theme === "dark" ? "#23272a" : "#f8f9fa",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        border: `2px solid ${
                          theme === "dark" ? "#333" : "#e2e8f0"
                        }`,
                        borderTop: `2px solid ${
                          theme === "dark" ? "#25d366" : "#25d366"
                        }`,
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  </div>
                ) : imageState.preview ? (
                  <img
                    src={imageState.preview}
                    alt={item.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                      fontSize: "1.2em",
                      color: theme === "dark" ? "white" : "#222",
                    }}
                  >
                    🛒
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  display: item.image ? "none" : "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  height: "100%",
                  fontSize: "1.2em",
                  color: theme === "dark" ? "white" : "#222",
                }}
              >
                🛒
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: theme === "dark" ? "white" : "#222",
                fontWeight: 600,
                fontSize: "0.95rem",
                marginBottom: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item?.title}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.8em",
              }}
            >
              {item.vendor && (
                <span style={{ color: theme === "dark" ? "white" : "#222" }}>
                  {item.vendor}
                </span>
              )}
              {item.category && (
                <span style={{ color: theme === "dark" ? "white" : "#222" }}>
                  🏷️ {item.category}
                </span>
              )}
            </div>
          </div>
          {/* Price and Toggle/Click Indicator */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              flexShrink: 0,
              gap: "8px",
            }}
          >
            <div
              style={{
                color: theme === "dark" ? "white" : "#222",
                fontWeight: 500,
                fontSize: "0.95rem",
              }}
            >
              {hasVariants ? (
                <span
                  style={{
                    fontSize: "0.8em",
                    color: theme === "dark" ? "#25d366" : "#25d366",
                  }}
                >
                  From Rs.{" "}
                  {formatPrice(Math.min(...item.variants.map((v) => v.price)))}
                </span>
              ) : (
                `Rs. ${formatPrice(item?.variants?.[0]?.price)}`
              )}
            </div>

            {hasVariants ? (
              <button
                onClick={handleToggleExpand}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "0.7em",
                  color: theme === "dark" ? "#25d366" : "#25d366",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background =
                    theme === "dark" ? "#333" : "#f0f0f0";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "transparent";
                }}
              >
                {isExpanded ? "▼ Hide" : "▶ Show"} variants
              </button>
            ) : (
              <div
                style={{
                  fontSize: "0.7em",
                  color: theme === "dark" ? "white" : "#222",
                  fontStyle: "italic",
                }}
              >
                Click to add
              </div>
            )}
          </div>
        </div>

        {/* Variants Section */}
        {hasVariants && isExpanded && (
          <div
            style={{
              marginTop: "12px",
              paddingTop: "12px",
              borderTop: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            }}
          >
            <div
              style={{
                fontSize: "0.8em",
                fontWeight: 600,
                color: theme === "dark" ? "white" : "#222",
                marginBottom: "8px",
              }}
            >
              Available Variants:
            </div>
            <div style={{ paddingInline: `10px` }}>
              {item.variants.map((variant, index) => (
                <div
                  key={index}
                  onClick={(e) => handleVariantClick(e, variant)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px",
                    marginBottom: "6px",
                    background: theme === "dark" ? "#1a1a1a" : "#f8f9fa",
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: `1px solid ${
                      theme === "dark" ? "#333" : "#e2e8f0"
                    }`,
                  }}
                >
                  {/* Variant Image */}
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "4px",
                      overflow: "hidden",
                      border: `1px solid ${
                        theme === "dark" ? "#333" : "#e2e8f0"
                      }`,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {(() => {
                      const variantKey =
                        variant.id || variant.title || `variant_${index}`;
                      const variantImageState = variantImages[variantKey] || {
                        loading: false,
                        downloaded: false,
                        error: null,
                        preview: null,
                      };

                      if (variantImageState.loading) {
                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              background:
                                theme === "dark" ? "#23272a" : "#f8f9fa",
                            }}
                          >
                            <div
                              style={{
                                width: "16px",
                                height: "16px",
                                border: `2px solid ${
                                  theme === "dark" ? "#333" : "#e2e8f0"
                                }`,
                                borderTop: `2px solid ${
                                  theme === "dark" ? "#25d366" : "#25d366"
                                }`,
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                              }}
                            />
                          </div>
                        );
                      } else if (variantImageState.preview) {
                        return (
                          <>
                            <img
                              src={variantImageState.preview}
                              alt={variant.title}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                            {variantImageState.downloaded && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "1px",
                                  right: "1px",
                                  width: "6px",
                                  height: "6px",
                                  backgroundColor: "#10B981",
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "4px",
                                  color: "white",
                                }}
                                title="Variant image downloaded and cached"
                              >
                                ✓
                              </div>
                            )}
                          </>
                        );
                      } else if (variantImageState.error) {
                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              fontSize: "0.6em",
                              color: "#ef4444",
                              textAlign: "center",
                              padding: "2px",
                            }}
                            title={`Image failed to load: ${variantImageState.error}`}
                          >
                            ❌
                          </div>
                        );
                      } else if (variant?.imageId) {
                        return (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              fontSize: "0.8em",
                              color: theme === "dark" ? "white" : "#222",
                            }}
                          >
                            🛒
                          </div>
                        );
                      } else {
                        return (
                          <div
                            style={{
                              display: item.image ? "none" : "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "100%",
                              height: "100%",
                              fontSize: "0.8em",
                              color: theme === "dark" ? "white" : "#222",
                            }}
                          >
                            🛒
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* Variant Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        color: theme === "dark" ? "white" : "#222",
                        fontWeight: 500,
                        fontSize: "0.85rem",
                        marginBottom: "2px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {variant.title || `Variant ${index + 1}`}
                    </div>
                    {variant.option1 && (
                      <div
                        style={{
                          fontSize: "0.7em",
                          color: theme === "dark" ? "#aaa" : "#666",
                        }}
                      >
                        {variant.option1}
                        {variant.option2 && ` • ${variant.option2}`}
                        {variant.option3 && ` • ${variant.option3}`}
                      </div>
                    )}
                  </div>

                  {/* Variant Price */}
                  <div
                    style={{
                      color: theme === "dark" ? "white" : "#222",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    Rs. {formatPrice(variant.price)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <hr
        style={{
          margin: "4px 0",
          border: "none",
          height: "1px",
          backgroundColor: "#333333",
        }}
      />
    </>
  );
};

const ChatSidebar = ({
  contact = { name: "", phone: "", about: "" },
  catalog = [],
  notes = "",
  onNotesChange,
  onTagsChange,
}) => {
  const theme = useTheme();

  console.log("catalog", catalog);
  const [search, setSearch] = useState("");
  const [filteredCatalog, setFilteredCatalog] = useState(catalog);
  const [isSearching, setIsSearching] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);

  // User orders state
  const [userOrders, setUserOrders] = useState({
    orders: [],
    userInfo: {},
    userStatus: {},
  });
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  // Debounce search input
  const debouncedSearch = useDebounce(search, 500);

  // API function to fetch user orders by phone number
  const fetchUserOrders = async (phoneNumber) => {
    if (!phoneNumber) {
      console.log("[ORDERS] No phone number provided");
      return;
    }

    setIsLoadingOrders(true);
    setOrdersError(null);

    try {
      console.log(`[ORDERS] Fetching orders for phone: ${phoneNumber}`);

      const response = await chrome.runtime.sendMessage({
        action: "FETCH_USER_ORDERS",
        token: localStorage.getItem("whatshopify_token")
          ? JSON.parse(localStorage.getItem("whatshopify_token"))?.data
              ?.token ||
            JSON.parse(localStorage.getItem("whatshopify_token"))?.token
          : null,
        phone: formatPhoneNumber(phoneNumber),
        storeId: localStorage.getItem("whatshopify_selected_store")
          ? JSON.parse(localStorage.getItem("whatshopify_selected_store"))?._id
          : null,
      });

      console.log("[ORDERS] API Response:", response);

      if (response.success) {
        // Handle different response structures
        let orders = [];
        if (response.success) {
          orders = response.orders;

          console.log(
            `[ORDERS] ✅ Found ${orders} orders for phone: ${phoneNumber}`
          );
          setUserOrders(orders);
        }
      } else {
        console.error("[ORDERS] API failed:", response.error);
        setOrdersError(response.detail);
        setUserOrders([]);
      }
    } catch (error) {
      console.error("[ORDERS] Error fetching user orders:", error);
      setOrdersError(error.detail);
      setUserOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleSearchChange = (e) => {
    const searchTerm = e.target.value;
    setSearch(searchTerm);
    setIsSearching(true);
  };
  console.log("userOrders", userOrders);
  const searchProducts = async (searchTerm) => {
    try {
      console.log(`[CATALOG] Searching products with term: "${searchTerm}"`);

      const response = await chrome.runtime.sendMessage({
        action: "SEARCH_PRODUCTS",
        token: localStorage.getItem("whatshopify_token")
          ? JSON.parse(localStorage.getItem("whatshopify_token"))?.data
              ?.token ||
            JSON.parse(localStorage.getItem("whatshopify_token"))?.token
          : null,
        searchTerm: searchTerm,
        storeId: localStorage.getItem("whatshopify_selected_store")
          ? JSON.parse(localStorage.getItem("whatshopify_selected_store"))?._id
          : null,
        isSeller: JSON.parse(localStorage.getItem("whatshopify_token"))?.data?.shopilamSurvey?.currentlySelling,
      });

      console.log("[CATALOG] Search API Response:", response);

      if (response.success) {
        let products = [];

        // Handle different response structures
        if (Array.isArray(response.products)) {
          products = response.products;
        } else if (
          response.products?.data &&
          Array.isArray(response.products.data)
        ) {
          products = response.products.data;
        } else if (
          response.products?.products &&
          Array.isArray(response.products.products)
        ) {
          products = response.products.products;
        } else {
          console.warn(
            "[CATALOG] Unexpected search response structure:",
            response.products
          );
          products = [];
        }

        console.log(
          `[CATALOG] ✅ Found ${products.length} products for search: "${searchTerm}"`
        );
        return products;
      } else {
        console.error("[CATALOG] Search API failed:", response.error);
        return [];
      }
    } catch (error) {
      console.error("[CATALOG] Error searching products:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  // Effect to handle debounced search
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedSearch.trim() === "") {
        setFilteredCatalog(catalog);
        setIsSearching(false);
        return;
      }

      const searchResults = await searchProducts(debouncedSearch);
      setFilteredCatalog(searchResults);
    };

    performSearch();
  }, [debouncedSearch, catalog]);

  // Update filtered catalog when catalog prop changes
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredCatalog(catalog);
    }
  }, [catalog]);

  // Fetch user orders when contact phone number is available
  useEffect(() => {
    console.log(
      "[ORDERS] Contact phone detected, fetching orders:",
      contact.phone
    );
    if (contact?.phone) {
      fetchUserOrders(contact.phone);
    } else {
      console.log("[ORDERS] No contact phone available");
      setUserOrders([]);
      setOrdersError(null);
    }
  }, [contact?.phone]);

  // Listen for store changes and refetch products
  useEffect(() => {
    const handleStoreChange = (event) => {
      console.log(
        "[CATALOG] Store changed, refetching products:",
        event.detail
      );
      const { storeId, store } = event.detail;

      // Clear current catalog and search
      setFilteredCatalog([]);
      setSearch("");

      // Trigger product refetch for the new store
      if (typeof window.refreshProductsForStore === "function") {
        window.refreshProductsForStore(storeId, (newProducts) => {
          console.log(
            "[CATALOG] New products received for store:",
            newProducts
          );
          setFilteredCatalog(newProducts || []);
        });
      } else {
        // Fallback: manually fetch products for the new store
        fetchProductsForStore(storeId);
      }
    };

    // Listen for store change events
    window.addEventListener("storeChanged", handleStoreChange);

    return () => {
      window.removeEventListener("storeChanged", handleStoreChange);
    };
  }, []);

  // Function to fetch products for a specific store
  const fetchProductsForStore = async (storeId) => {
    try {
      console.log(`[CATALOG] Fetching products for store: ${storeId}`);

      const response = await chrome.runtime.sendMessage({
        action: "FETCH_PRODUCTS",
        token: localStorage.getItem("whatshopify_token")
          ? JSON.parse(localStorage.getItem("whatshopify_token"))?.data
              ?.token ||
            JSON.parse(localStorage.getItem("whatshopify_token"))?.token
          : null,
        storeId: storeId,
      });

      console.log("[CATALOG] Store products API Response:", response);

      if (response.success) {
        let products = [];

        // Handle different response structures
        if (Array.isArray(response.products)) {
          products = response.products;
        } else if (
          response.products?.data &&
          Array.isArray(response.products.data)
        ) {
          products = response.products.data;
        } else if (
          response.products?.products &&
          Array.isArray(response.products.products)
        ) {
          products = response.products.products;
        } else {
          console.warn(
            "[CATALOG] Unexpected store products response structure:",
            response.products
          );
          products = [];
        }

        console.log(
          `[CATALOG] ✅ Found ${products.length} products for store: ${storeId}`
        );
        setFilteredCatalog(products);
      } else {
        console.error("[CATALOG] Store products API failed:", response.error);
        setFilteredCatalog([]);
      }
    } catch (error) {
      console.error("[CATALOG] Error fetching products for store:", error);
      setFilteredCatalog([]);
    }
  };

  const formattedDescription = (description) => {
    if (!description) return "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(description, "text/html");
    return doc.body.textContent || "";
  };

  const handleProductClick = async (item) => {
    console.log("[PRODUCT] Product clicked:", item);

    const productMessage =
      `🛒 *${item.title}*\n\n` +
      `**Product Description**\n` +
      `${formattedDescription(item.description)}\n` +
      `**Price**\n` +
      `Rs ${item?.variants?.[0]?.price}\n`;

    let productImages = [];

    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      console.log(
        `[PRODUCT] Processing ${item.images.length} images for product: ${item.title}`
      );

      try {
        const productName =
          item.title?.replace(/[^a-zA-Z0-9]/g, "_") || "product";

        for (let i = 0; i < getAllProductImages(item).length; i++) {
          const image = item.images[i];
          if (!image?.url) continue;

          console.log(
            `[PRODUCT] Processing image ${i + 1}/${item.images.length}:`,
            image.url
          );

          const filename = `${productName}_${i + 1}.jpg`;
          const imageFile = await downloadImageAsFile(image.url, filename);

          if (imageFile) {
            // Convert File to the format expected by sendMessageToCurrentChat
            productImages.push({
              downloaded: true,
              blob: imageFile,
              url: URL.createObjectURL(imageFile),
              originalUrl: image.url,
            });
            console.log(`[PRODUCT] Image ${i + 1} prepared for sharing`);
          } else {
            console.warn(`[PRODUCT] Failed to download image ${i + 1}`);
          }
        }
      } catch (error) {
        console.error("[PRODUCT] Error processing product images:", error);
      }
    }

    if (window.sendMessageToCurrentChat) {
      window.sendMessageToCurrentChat(productMessage, item, productImages);
    } else {
      console.warn("[PRODUCT] sendMessageToCurrentChat not available");
      navigator.clipboard.writeText(productMessage).then(() => {
        alert("Product details copied to clipboard! Paste in the chat.");
      });
    }
  };
  const [updatingOrder, setUpdatingOrder] = useState(null);

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

  const handleWhatsAppRedirect = async (order, status) => {
    console.log("Order Status", status, order);
    const data = localStorage.getItem("whatshopify_token");
    const store = JSON.parse(data)?.data?.stores;
    const phoneNumber = userOrders?.userInfo?.phone;
    const customerName = userOrders?.userInfo?.name;
    const city = userOrders?.userInfo?.address?.city;
    const orderDateTime = formatDate(order?.createdAt);
    const orderId = order?.name;
    const storeName = store?.find((s) => s._id === order?.storeId)?.name ?? "";
    const orderTotal = formatPrice(order?.pricing?.currentTotalPrice);
    console.log("store", storeName, store);

    try {
      setUpdatingOrder(order?._id);
      if (status !== "resend" || status !== "tracking") {
        await updateOrderStatus(order?._id, status);
      }
      if (contact?.phone) {
        fetchUserOrders(contact.phone);
      }
    } catch (updateError) {
      setOrdersError(`Failed to update order status: ${updateError.message}`);
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
we've just received your order #${orderId} at ${storeName} 🛍️ placed at ${orderDateTime}, for ${city}

🛒 𝐎𝐫𝐝𝐞𝐫 𝐃𝐞𝐭𝐚𝐢𝐥𝐬
 ${order?.lineItems
   ?.map((item) => `${item.name} - ${item.quantity}`)
   .join("\n")}


💰 ${orderTotal}

Please reply: ✅ YES to confirm your order, or
❌ NO if you'd like to cancel or make any changes.

Thanks for shopping with ${storeName} 💚
— 𝐓𝐞𝐚𝐦 ${storeName}`
            : status === "resend"
            ? `⏰ Reminder for your order #${orderId}
👋 Hello ${customerName},

We're still waiting for your confirmation for your order placed at ${storeName} 🛍️ on ${orderDateTime}, for ${city}.

🧾 𝐎𝐫𝐝𝐞𝐫 𝐃𝐞𝐭𝐚𝐢𝐥𝐬
 ${order?.lineItems
   ?.map((item) => `${item.name} - ${item.quantity}`)
   .join("\n")}
💰 ${orderTotal}

Please reply:
✅ YES to confirm your order, or
❌ NO if you'd like to cancel or make any changes.

If we don't hear back soon, the order may be auto-cancelled to free up stock.

💚 Thank you for shopping with ${storeName}!
— 𝐓𝐞𝐚𝐦 ${storeName}`
            : status === "confirm"
            ? `🎉 Thank you for confirmation,  ${customerName},

Our team will start processing it soon 🚚
You'll receive updates once it's packed and dispatched. 😊

💚 Thank you for confirming your order with ${storeName}!
— 𝐓𝐞𝐚𝐦 ${storeName}`
            : status === "cancel"
            ? `❌ Order Cancelled

Your order #${orderId} at ${storeName} 🛍️ has been cancelled as per your request on ${orderDateTime}.

We're sorry to see you cancel 😔 — if there's anything we can improve or if you'd like to place a new order, just reply here.

💚 Thank you for considering ${storeName}!
— 𝐓𝐞𝐚𝐦 ${storeName}`
            : `🎉 *Great News!* 🎉

Your order *#${orderId}* is out today to your city ${city} 🚚✨

Please keep ${orderTotal} handy as your parcel  will be at your door step in 3-4 days.

🧾 Tracking: ${`https://shopilam.com/tracking/${order?.tracking?.tracking_no}`}

You can follow your parcel using the link above — it'll be with you soon! 😄

💚 *Thanks for choosing us!*`;

        // Use the existing sendMessageToCurrentChat function
        if (window.sendMessageToCurrentChat) {
          window.sendMessageToCurrentChat(message, order);
          console.log("[ORDERS] Message added to current chat input");
        } else {
          console.warn(
            "[ORDERS] sendMessageToCurrentChat function not available"
          );
          // Fallback: copy to clipboard
          navigator.clipboard.writeText(message).then(() => {
            alert(
              "Order status message copied to clipboard! Paste in the chat."
            );
          });
        }
      }
    } else {
      console.warn("[ORDERS] No phone number found for order:", order);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      const newTags = [...(tags || []), tagInput.trim()];
      setTags(newTags);
      setTagInput("");
    }
  };

  const handleRemoveTag = (index) => {
    const newTags = tags.filter((_, i) => i !== index);
    setTags(newTags);
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "inherit",
        // background: theme.bg,
        background: theme === "dark" ? "#18191a" : "#fff",
        // minHeight: "100vh",
      }}
    >
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      {console.log("contact", contact)}
      {/* Contact Info Section */}
      {contact && userOrders?.userInfo && (
        <section style={{ marginBottom: "10px" }}>
          {/* <h2
            style={{
              marginBottom: "12px",
              fontSize: "1.1rem",
              color: theme === "dark" ? "white" : "#222",
            }}
          >
            Contact Info
          </h2> */}
          <div
            style={{
              background: theme === "dark" ? "#23272a" : "#fff",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              padding: "8px",
              fontSize: "0.98rem",
              color: theme === "dark" ? "white" : "#222",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <strong>Name:</strong>
              <p
                style={{
                  color: theme === "dark" ? "white" : "#222",
                }}
              >
                {userOrders?.userInfo?.name || "Not available"}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                // marginBottom: "8px",
              }}
            >
              <strong>Phone:</strong>
              <p
                style={{
                  color: theme === "dark" ? "white" : "#222",
                }}
              >
                {contact?.phone ? `${userOrders?.userInfo?.phone}` : ""}
              </p>
            </div>
          </div>
        </section>
      )}
      {userOrders?.userStatus && (
        <section style={{ marginBottom: "10px" }}>
          {/* <h2
            style={{
              marginBottom: "12px",
              fontSize: "1.1rem",
              color: theme === "dark" ? "white" : "#222",
            }}
          >
            User States
          </h2> */}
          <div
            style={{
              background: theme === "dark" ? "#23272a" : "#fff",
              borderRadius: "10px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
              padding: "8px",
              fontSize: "0.98rem",
              color: theme === "dark" ? "white" : "#222",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <strong>Total Orders:</strong>
              <p
                style={{
                  color: theme === "dark" ? "white" : "#222",
                }}
              >
                {userOrders?.userStatus?.totalOrders || 0}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <strong>Total Spent:</strong>
              <p
                style={{
                  color: theme === "dark" ? "white" : "#222",
                }}
              >
                Rs. {formatPrice(userOrders?.userStatus?.totalSpent) || 0}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <strong>First Order Date:</strong>
              <p
                style={{
                  color: theme === "dark" ? "white" : "#222",
                }}
              >
                {formatDate(userOrders?.userStatus?.firstOrderDate) || ""}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <strong>Last Order Date:</strong>
              <p
                style={{
                  color: theme === "dark" ? "white" : "#222",
                }}
              >
                {formatDate(userOrders?.userStatus?.lastOrderDate) || ""}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <strong>Cancelled orders:</strong>
              <p
                style={{
                  color: theme === "dark" ? "white" : "#222",
                }}
              >
                {formatDate(userOrders?.userStatus?.cancelledOrders) || 0}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                // marginBottom: "8px",
              }}
            >
              <strong>Returned orders:</strong>
              <p
                style={{
                  color: theme === "dark" ? "white" : "#222",
                }}
              >
                {formatDate(userOrders?.userStatus?.returnedOrders) || 0}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* User Orders Section */}
      <section style={{ marginBottom: "10px" }}>
        {/* <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          Customer Orders
        </h2> */}
        <div
          style={{
            background: theme === "dark" ? "#23272a" : "#fff",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            padding: "8px",
            border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          {isLoadingOrders ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                gap: "8px",
                color: theme === "dark" ? "white" : "#222",
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: `2px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
                  borderTop: `2px solid ${
                    theme === "dark" ? "#25d366" : "#25d366"
                  }`,
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              Loading orders...
            </div>
          ) : ordersError ? (
            <div
              style={{
                color: "#e74c3c",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
              }}
            >
              {ordersError}
            </div>
          ) : userOrders && ensureArray(userOrders?.orders)?.length > 0 ? (
            <div
              style={{
                overflowX: "auto",
                border: "1px solid #333333",
                borderRadius: "8px",
              }}
            >
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
                      backgroundColor: theme === "dark" ? "#23272a" : "#f5f5f5",
                    }}
                  >
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "left",
                        borderBottom: "1px solid #333333",
                        fontWeight: "600",
                      }}
                    >
                      ID
                    </th>

                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "left",
                        borderBottom: "1px solid #333333",
                        fontWeight: "600",
                      }}
                    >
                      Rs.
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "left",
                        borderBottom: "1px solid #333333",
                        fontWeight: "600",
                        width: "120px",
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        borderBottom: "1px solid #333333",
                        fontWeight: "600",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        borderBottom: "1px solid #333333",
                        fontWeight: "600",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ensureArray(userOrders?.orders)?.map((order) => {
                    const orderStatus = order?.status?.toLowerCase();
                    const isOpen = orderStatus === "open";
                    const isPending = orderStatus === "pending";

                    return (
                      <tr
                        key={order.id}
                        style={{ borderBottom: "1px solid #333333" }}
                      >
                        <td
                          style={{
                            padding: "12px 8px",
                            fontFamily: "monospace",
                            fontSize: "12px",
                            alignContent: "center",
                            position: "relative",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            const tooltip =
                              e.currentTarget.querySelector(".order-tooltip");
                            if (tooltip) {
                              // Set fixed positioning first to escape table context
                              tooltip.style.position = "fixed";
                              tooltip.style.display = "block";

                              const rect =
                                e.currentTarget.getBoundingClientRect();

                              tooltip.style.left = `${rect.left}px`;
                              tooltip.style.top = `${rect.top}px`;

                              setTimeout(() => {
                                const tooltipRect =
                                  tooltip.getBoundingClientRect();
                                const gap = 10;

                                if (tooltipRect.left < gap) {
                                  tooltip.style.transform = "translateX(0)";
                                  tooltip.style.marginLeft = `${gap}px`;
                                  tooltip.style.left = `${rect.right + gap}px`;
                                  tooltip.style.top = `${rect.top}px`;
                                } else {
                                  tooltip.style.transform = "translateX(-100%)";
                                  tooltip.style.marginLeft = "-10px";
                                }

                                if (
                                  tooltipRect.bottom >
                                  window.innerHeight - gap
                                ) {
                                  tooltip.style.top = `${
                                    window.innerHeight -
                                    tooltipRect.height -
                                    gap
                                  }px`;
                                }
                              }, 0);
                            }
                          }}
                          onMouseLeave={(e) => {
                            const tooltip =
                              e.currentTarget.querySelector(".order-tooltip");
                            if (tooltip) {
                              tooltip.style.display = "none";
                            }
                          }}
                        >
                          {order.name}
                          <div
                            className="order-tooltip"
                            style={{
                              display: "none",
                              position: "fixed",
                              background: theme === "dark" ? "#23272a" : "#fff",
                              border: `1px solid ${
                                theme === "dark" ? "#333" : "#e2e8f0"
                              }`,
                              borderRadius: "8px",
                              padding: "12px",
                              minWidth: "250px",
                              maxWidth: "350px",
                              boxShadow:
                                "0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
                              zIndex: 99999,
                              pointerEvents: "none",
                              fontSize: "12px",
                              color: theme === "dark" ? "white" : "#222",
                              lineHeight: "1.6",
                              whiteSpace: "normal",
                              transform: "translateX(-100%)",
                              marginLeft: "-10px",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: "600",
                                marginBottom: "8px",
                                paddingBottom: "8px",
                                borderBottom: `1px solid ${
                                  theme === "dark" ? "#333" : "#e2e8f0"
                                }`,
                                fontSize: "13px",
                              }}
                            >
                              Order #{order.name}
                            </div>

                            {order?.lineItems &&
                              Array.isArray(order.lineItems) &&
                              order.lineItems.length > 0 && (
                                <div style={{ marginBottom: "8px" }}>
                                  <div
                                    style={{
                                      fontWeight: "600",
                                      marginBottom: "4px",
                                      fontSize: "11px",
                                      color: theme === "dark" ? "#aaa" : "#666",
                                    }}
                                  >
                                    Items:
                                  </div>
                                  {order.lineItems.map((item, idx) => (
                                    <div
                                      key={idx}
                                      style={{
                                        marginBottom: "4px",
                                        paddingLeft: "8px",
                                      }}
                                    >
                                      • {item.name || "Unknown"} x
                                      {item.quantity || 1}
                                    </div>
                                  ))}
                                </div>
                              )}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "4px",
                              }}
                            >
                              <span
                                style={{
                                  color: theme === "dark" ? "#aaa" : "#666",
                                }}
                              >
                                Total:
                              </span>
                              <span style={{ fontWeight: "400" }}>
                                Rs.{" "}
                                {formatPrice(order?.pricing?.currentTotalPrice)}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "4px",
                              }}
                            >
                              <span
                                style={{
                                  color: theme === "dark" ? "#aaa" : "#666",
                                }}
                              >
                                Status:
                              </span>
                              <span
                                style={{
                                  fontWeight: "600",
                                  color:
                                    order.status?.toLowerCase() === "pending"
                                      ? "#FFA500"
                                      : order.status?.toLowerCase() === "open"
                                      ? "#25D366"
                                      : order.status?.toLowerCase() ===
                                        "cancelled"
                                      ? "#DC2626"
                                      : theme === "dark"
                                      ? "white"
                                      : "#222",
                                }}
                              >
                                {order?.status}
                              </span>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "4px",
                              }}
                            >
                              <span
                                style={{
                                  color: theme === "dark" ? "#aaa" : "#666",
                                }}
                              >
                                Date:
                              </span>
                              <span>{formatDate(order?.createdAt)}</span>
                            </div>

                            {order?.tracking?.tracking_no && (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginTop: "8px",
                                  paddingTop: "8px",
                                  borderTop: `1px solid ${
                                    theme === "dark" ? "#333" : "#e2e8f0"
                                  }`,
                                }}
                              >
                                <span
                                  style={{
                                    color: theme === "dark" ? "#aaa" : "#666",
                                  }}
                                >
                                  Tracking:
                                </span>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: "11px",
                                  }}
                                >
                                  {order.tracking.tracking_no}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            fontSize: "12px",
                            alignContent: "center",
                          }}
                        >
                          {formatPrice(order?.pricing?.currentTotalPrice)}
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            alignContent: "center",
                          }}
                        >
                          <div style={{ fontWeight: "500" }}>
                            {formatDate(order?.createdAt)}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            fontSize: "12px",
                            alignContent: "center",
                          }}
                        >
                          {order?.status}
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
                            // flexWrap: "wrap",
                          }}
                        >
                          {/* If status is "open", show Send button */}
                          {isOpen && (
                            <button
                              onClick={() =>
                                handleWhatsAppRedirect(order, "pending")
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
                                : "Send"}
                            </button>
                          )}

                          {isPending && (
                            <>
                              <button
                                onClick={() =>
                                  handleWhatsAppRedirect(order, "confirm")
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
                                  opacity:
                                    updatingOrder === order?._id ? 0.6 : 1,
                                }}
                              >
                                {updatingOrder === order?._id
                                  ? "Updating..."
                                  : "Confirm"}
                              </button>
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
                                  opacity:
                                    updatingOrder === order?._id ? 0.6 : 1,
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
                                  opacity:
                                    updatingOrder === order?._id ? 0.6 : 1,
                                }}
                              >
                                {updatingOrder === order?._id
                                  ? "Updating..."
                                  : "Cancel"}
                              </button>
                            </>
                          )}

                          {/* If order has tracking and status is not open/pending, show Tracking button */}
                          {!isOpen &&
                            !isPending &&
                            order?.tracking?.tracking_no && (
                              <button
                                onClick={() =>
                                  handleWhatsAppRedirect(order, "tracking")
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
                                  opacity:
                                    updatingOrder === order?._id ? 0.6 : 1,
                                }}
                              >
                                {updatingOrder === order?._id
                                  ? "Updating..."
                                  : "Tracking"}
                              </button>
                            )}
                          <a
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
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                              }}
                            >
                              Detail
                            </button>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                color: theme === "dark" ? "#aaa" : "#666",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
              }}
            >
              No orders found for this customer
            </div>
          )}
        </div>
      </section>

      {/* Create Order Button */}
      {/* <section style={{ marginBottom: "10px" }}>
        <button
          onClick={() => {
            // Switch to order form sidebar
            if (typeof window.switchToOrderFormSidebar === "function") {
              window.switchToOrderFormSidebar(contact);
            }
          }}
          style={{
            width: "100%",
            padding: "8px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "10px",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
            // boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            // transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "1.3em" }}>📝</span>
          <span>Create New Order</span>
          <span style={{ fontSize: "1em", marginLeft: "auto" }}>→</span>
        </button>
      </section> */}

      <CustomerSupportMessages userOrders={userOrders} />
      {/* Notes Section */}
      <section style={{ marginBottom: "10px" }}>
        {/* <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          Notes
        </h2> */}
        <div
        // style={{
        //   background: theme === "dark" ? "#23272a" : "#fff",
        //   borderRadius: "10px",
        //   boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        //   padding: "8px",
        //   border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
        //   color: theme === "dark" ? "white" : "#222",
        // }}
        >
          <textarea
            style={{
              width: "100%",
              minHeight: "80px",
              borderRadius: "6px",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
              padding: "10px",
              resize: "vertical",
              fontSize: "1rem",
              color: theme === "dark" ? "white" : "#222",
              background: theme === "dark" ? "#23272a" : "#fff",
              boxSizing: "border-box",
            }}
            placeholder="Type your notes here..."
            value={notes || ""}
            onChange={(e) => onNotesChange && onNotesChange(e.target.value)}
          />
        </div>
      </section>
      {/* Tags Section */}
      <section style={{ marginBottom: "10px" }}>
        <div
        // style={{
        //   background: theme === "dark" ? "#23272a" : "#fff",
        //   borderRadius: "10px",
        //   boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        //   padding: "8px",
        //   border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
        //   color: theme === "dark" ? "white" : "#222",
        // }}
        >
          {/* <h2
            style={{
              margin: "0 0 12px 0",
              fontSize: "1.1rem",
              fontWeight: "600",
              color: theme === "dark" ? "white" : "#222",
            }}
          >
            Tags
          </h2> */}

          {/* Input and Add Button */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              // marginBottom: "12px",
            }}
          >
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  handleAddTag();
                }
              }}
              placeholder="Add a tag"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: "6px",
                border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
                fontSize: "0.95rem",
                backgroundColor: theme === "dark" ? "#23272a" : "#fff",
                color: theme === "dark" ? "white" : "#222",
                boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              style={{
                padding: "10px 20px",
                backgroundColor: tagInput.trim()
                  ? theme === "dark"
                    ? "#25d366"
                    : "#25d366"
                  : theme === "dark"
                  ? "#333"
                  : "#e2e8f0",
                color: tagInput.trim()
                  ? "white"
                  : theme === "dark"
                  ? "#666"
                  : "#999",
                border: "none",
                borderRadius: "6px",
                cursor: tagInput.trim() ? "pointer" : "not-allowed",
                fontSize: "0.95rem",
                fontWeight: "500",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              Add
            </button>
          </div>

          {/* Tags Display */}
          {tags && tags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "4px",
              }}
            >
              {tags.map((tag, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px",
                    backgroundColor: theme === "dark" ? "#1a1a1a" : "#f5f5f5",
                    borderRadius: "16px",
                    fontSize: "0.875rem",
                    border: `1px solid ${
                      theme === "dark" ? "#333" : "#e2e8f0"
                    }`,
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: theme === "dark" ? "#999" : "#666",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    🏷️
                  </span>
                  <span
                    style={{
                      color: theme === "dark" ? "white" : "#222",
                      fontWeight: "400",
                    }}
                  >
                    {tag}
                  </span>
                  <button
                    onClick={() => handleRemoveTag(index)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0",
                      margin: "0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: theme === "dark" ? "#999" : "#666",
                      fontSize: "14px",
                      lineHeight: "1",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = theme === "dark" ? "#fff" : "#000";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = theme === "dark" ? "#999" : "#666";
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {/* Catalog Section */}
      <section style={{ marginBottom: "10px" }}>
        {/* <h2
          style={{
            marginBottom: "12px",
            fontSize: "1.1rem",
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          Product Catalog
        </h2> */}
        <div
          style={{
            background: theme === "dark" ? "#23272a" : "#fff",
            borderRadius: "10px",
            padding: "8px",
            border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
            color: theme === "dark" ? "white" : "#222",
          }}
        >
          <div style={{ position: "relative", marginBottom: "16px" }}>
            <input
              type="text"
              name="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search for a product..."
              style={{
                width: "100%",
                padding: "10px 12px",
                paddingRight: search || isSearching ? "40px" : "12px",
                borderRadius: "6px",
                border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
                fontSize: "0.95rem",
                boxSizing: "border-box",
                backgroundColor: theme === "dark" ? "#23272a" : "#fff",
                color: theme === "dark" ? "white" : "#222",
              }}
            />
            {search && !isSearching && (
              <button
                onClick={() => {
                  setSearch("");
                  setIsSearching(false);
                  setFilteredCatalog(catalog);
                }}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: theme === "dark" ? "#ccc" : "#666",
                  fontSize: "18px",
                  lineHeight: "1",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = theme === "dark" ? "#fff" : "#000";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = theme === "dark" ? "#ccc" : "#666";
                }}
                title="Clear search"
              >
                ×
              </button>
            )}
            {isSearching && (
              <div
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: theme === "dark" ? "white" : "#222",
                  fontSize: "14px",
                }}
              >
                🔍
              </div>
            )}
          </div>
          {isSearching ? (
            <div
              style={{
                color: theme === "dark" ? "white" : "#222",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
              }}
            >
              Searching products...
            </div>
          ) : filteredCatalog && filteredCatalog.length > 0 ? (
            filteredCatalog?.map((item, idx) => (
              <CatalogItem
                item={item}
                key={idx}
                handleProductClick={handleProductClick}
                theme={theme}
              />
            ))
          ) : search.trim() ? (
            <div
              style={{
                color: theme === "dark" ? "white" : "#222",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
              }}
            >
              No products found for "{search}"
            </div>
          ) : (
            <div style={{ color: theme === "dark" ? "white" : "#222" }}>
              No products available.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ChatSidebar;
