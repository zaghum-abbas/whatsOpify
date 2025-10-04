import React, { useState, useEffect } from "react";
import { createOrder } from "../../utils/createOrder.js";
import { useDebounce } from "../../hooks/useDebounce";
import { formatPrice, getToken } from "../../core/utils/helperFunctions";
import { IoMdTrash } from "react-icons/io";

const ModalForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    productName: "",
    variantId: "",
    address: "",
    city: "",
    email: "",
    quantity: 1,
    paymentMethod: "COD",
  });

  const [errors, setErrors] = useState({});
  // State for loading indicators
  const [isLoading, setIsLoading] = useState(true); // True initially as data is loading
  const [isSending, setIsSending] = useState(false); // True when submitting the form

  // State to store product data fetched from the global cache
  const [productsData, setProductsData] = useState([]);
  // State to store user information from the global cache
  const [userInfo, setUserInfo] = useState(null);

  // State to store the full selected product object (from productsData)
  const [selectedProduct, setSelectedProduct] = useState(null);
  // State to store the full selected variant object (from selectedProduct.variants)
  const [selectedVariant, setSelectedVariant] = useState(null);

  // State for displaying submission-related errors
  const [submissionError, setSubmissionError] = useState("");

  // State for product selection modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const [modalProducts, setModalProducts] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalTotalPages, setModalTotalPages] = useState(1);
  const [modalTotalProducts, setModalTotalProducts] = useState(0);
  const [selectedItems, setSelectedItems] = useState([]);

  // Effect to extract contact info from WhatsApp UI and load global data (products, user info)
  useEffect(() => {
    const loadInitialData = async () => {
      // No longer set isLoading to true here, as it's true by default.
      // It will be set to false once all data is loaded or an error occurs.
      try {
        const contactInfoHeader = Array.from(
          document.querySelectorAll("div")
        ).find((el) => el.textContent.trim() === "Contact info");

        if (contactInfoHeader) {
          const contactInfoPanel =
            contactInfoHeader.closest("header")?.parentElement?.parentElement;
          if (contactInfoPanel) {
            const nameElement =
              contactInfoPanel.querySelector('span[dir="auto"]');
            const name = nameElement?.textContent.trim() || "";

            const phoneElement = Array.from(
              contactInfoPanel.querySelectorAll('span[dir="auto"]')
            ).find((el) => el.textContent.match(/\+[\d\s]+/));
            const phone = phoneElement?.textContent.trim() || "";

            setFormData((prev) => ({
              ...prev,
              name: name || prev.name,
              phone: phone || prev.phone,
            }));
          }
        }

        // --- MODIFIED PRODUCT FETCH LOGIC ---
        // Use window.getProducts with a callback to ensure data is loaded asynchronously.
        // This is crucial because products might not be immediately available when the modal opens.
        if (window.getProducts) {
          console.log("📦 Calling getProducts from ModalForm...");
          window.getProducts((products) => {
            if (products && products.length > 0) {
              setProductsData(products);
              console.log("📦 Products data loaded:", products, "items");
            } else {
              console.warn("⚠️ No products found or fetch failed.");
              setSubmissionError(
                "No products found. Please refresh and try again."
              );
            }
            // Set loading to false once the product data (or lack thereof) is received
            setIsLoading(false);
          });
        } else {
          console.warn(
            "⚠️ window.getProducts not available. Ensure index.jsx is loaded correctly."
          );
          setSubmissionError(
            "Initialization failed: Product data source not found."
          );
          setIsLoading(false); // Turn off loading even if getProducts is missing
        }
        // --- END MODIFIED PRODUCT FETCH LOGIC ---

        // --- Access global user info cache ---
        // This part attempts to pre-fill user's email and other info.
        if (window.whatsapofyUserInfo && window.whatsapofyUserInfo.userInfo) {
          setUserInfo(window.whatsapofyUserInfo.userInfo);
          console.log(
            "👤 User info loaded from cache:",
            window.whatsapofyUserInfo.userInfo
          );
          // Pre-fill email if available from user info
          setFormData((prev) => ({
            ...prev,
            email: window.whatsapofyUserInfo.userInfo.email || prev.email,
          }));
        } else {
          console.warn(
            "⚠️ window.whatsapofyUserInfo.userInfo not available. Ensure user info is fetched."
          );
        }
      } catch (error) {
        console.error("Error loading initial data:11", error);
        setSubmissionError("Failed to load initial data. Please try again.");
        setIsLoading(false); // Ensure loading is turned off on error
      }
    };

    loadInitialData();
  }, []); // Empty dependency array means this effect runs once on mount

  // Effect to automatically update selectedVariant when selectedProduct changes
  useEffect(() => {
    if (
      selectedProduct &&
      selectedProduct.variants &&
      selectedProduct.variants.length > 0
    ) {
      // Automatically select the first variant if a product is chosen and has variants
      setSelectedVariant(selectedProduct.variants[0]);
      setFormData((prev) => ({
        ...prev,
        // Ensure we use the correct variantId property from the variant object
        variantId:
          selectedProduct.variants[0].variantId ||
          selectedProduct.variants[0].id ||
          "",
      }));
    } else {
      // Clear selected variant and variantId if no product or no variants
      setSelectedVariant(null);
      setFormData((prev) => ({
        ...prev,
        variantId: "",
      }));
    }
  }, [selectedProduct]); // This effect runs whenever selectedProduct changes

  /**
   * Validates the form data before submission.
   * @returns {boolean} True if the form is valid, false otherwise.
   */
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.productName.trim())
      newErrors.productName = "Product is required";
    if (!formData.variantId.trim()) newErrors.variantId = "Variant is required";
    if (!formData.address1.trim())
      newErrors.address1 = "Address Line 1 is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.province.trim()) newErrors.province = "Province is required";
    if (!formData.zip.trim()) newErrors.zip = "Zip Code is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (formData.quantity < 1)
      newErrors.quantity = "Quantity must be at least 1";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles changes to form input fields.
   * @param {Object} e - The event object.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for the changed field if it exists
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Clear general submission error on any input change
    if (submissionError) setSubmissionError("");
  };

  /**
   * Handles product selection from the dropdown.
   * Finds the full product object and sets it to selectedProduct state.
   * @param {Object} e - The event object.
   */
  const handleProductSelect = (e) => {
    const productName = e.target.value;
    setFormData((prev) => ({ ...prev, productName: productName }));
    // Find the product object by its name from the loaded productsData
    const product = productsData.find((p) => p.name === productName);
    setSelectedProduct(product || null); // Set the full product object
    // Clear product-related errors
    if (errors.productName) {
      setErrors((prev) => ({ ...prev, productName: "" }));
    }
    if (submissionError) setSubmissionError("");
  };

  const handleModalProductSelect = (product, variant) => {
    // Add to selected items list
    const itemToAdd = {
      id: variant
        ? `${product._id}-${variant.id || variant.variantId}`
        : product._id,
      product: product,
      variant: variant,
      quantity: 1,
      price: variant ? variant.price : product.price,
      name: variant
        ? `${product.title} - ${variant.sku || variant.name}`
        : product.title,
      sku: variant ? variant.sku : product.sku,
    };

    setSelectedItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === itemToAdd.id);
      if (existingIndex >= 0) {
        // Update quantity if already exists
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        // Add new item
        return [...prev, itemToAdd];
      }
    });

    setShowProductModal(false);
    setSelectedProducts([]);

    if (errors.productName) {
      setErrors((prev) => ({ ...prev, productName: "" }));
    }
    if (submissionError) setSubmissionError("");
  };
  // Server-side search function for modal
  const searchModalProducts = async (searchTerm, page = 1) => {
    try {
      setModalLoading(true);
      console.log(
        `[MODAL] Searching products with term: "${searchTerm}", page: ${page}`
      );

      const token = getToken();
      if (!token) {
        console.warn("[MODAL] No token found for search");
        return;
      }

      // Call background script to search products
      const response = await chrome.runtime.sendMessage({
        action: "SEARCH_PRODUCTS",
        token: token,
        searchTerm: searchTerm,
        page: page,
        limit: productsPerPage,
      });

      if (response.success) {
        let products = [];
        let totalPages = 1;
        let totalProducts = 0;

        if (Array.isArray(response.products)) {
          products = response.products;
          totalProducts = products.length;
        } else if (
          response.products?.data &&
          Array.isArray(response.products.data)
        ) {
          products = response.products.data;
          totalPages =
            response.products.totalPages ||
            Math.ceil(
              (response.products.total ||
                response.products.len ||
                products.length) / productsPerPage
            );
          totalProducts =
            response.products.total || response.products.len || products.length;
        } else if (
          response.products?.products &&
          Array.isArray(response.products.products)
        ) {
          products = response.products.products;
          totalPages =
            response.products.totalPages ||
            Math.ceil(
              (response.products.total ||
                response.products.len ||
                products.length) / productsPerPage
            );
          totalProducts =
            response.products.total || response.products.len || products.length;
        } else {
          console.warn(
            "[MODAL] Unexpected search response structure:",
            response.products
          );
          products = [];
          totalProducts = 0;
        }

        setModalProducts(products);
        setModalTotalPages(totalPages);
        setModalTotalProducts(totalProducts);

        console.log(
          `[MODAL] ✅ Found ${products.length} products for search: "${searchTerm}"`
        );
      } else {
        console.error("[MODAL] Search API failed:", response.error);
        setModalProducts([]);
        setModalTotalPages(1);
        setModalTotalProducts(0);
      }
    } catch (error) {
      console.error("[MODAL] Error searching products:", error);
      setModalProducts([]);
      setModalTotalPages(1);
      setModalTotalProducts(0);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCheck = (e, val) => {
    const { checked } = e.target;
    const updatedModalProducts = modalProducts.map((item) => {
      // Check if it's a product selection (no variant)
      if (item?._id === val?._id && !val?.id) {
        return {
          ...item,
          checked,
        };
      } else {
        // Check if it's a variant selection
        const updatedVariants = item.variants?.map((variant) => {
          if (variant?.id === val?.id || variant?.variantId === val?.id) {
            // Update form data with variant info
            setFormData((prev) => ({
              ...prev,
              variantId: variant.id || variant.variantId,
            }));
            return {
              ...variant,
              checked,
            };
          }
          return variant;
        });
        return {
          ...item,
          variants: updatedVariants ?? item.variants,
        };
      }
    });

    setModalProducts(updatedModalProducts);

    // Update selectedProducts array for modal footer count
    if (checked) {
      setSelectedProducts((prev) => [...prev, val]);
    } else {
      setSelectedProducts((prev) =>
        prev.filter((p) => {
          if (val?.id) {
            // Remove variant
            return !(p.id === val.id);
          } else {
            // Remove product
            return !(p._id === val._id);
          }
        })
      );
    }
  };

  const handleVariantSelect = (product, variant) => {
    handleModalProductSelect(product, variant);
  };

  // Handle quantity change
  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setSelectedItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Handle item removal
  const handleRemoveItem = (itemId) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowProductModal(false);
    setModalSearchTerm("");
    setSelectedProducts([]);
    setCurrentPage(1);
    setModalProducts([]);
    setModalTotalPages(1);
    setModalTotalProducts(0);
  };

  // Debounced search effect for modal
  const debouncedModalSearch = useDebounce(modalSearchTerm, 500);

  // Effect to handle modal search
  useEffect(() => {
    if (showProductModal) {
      searchModalProducts(debouncedModalSearch, currentPage);
    }
  }, [debouncedModalSearch, currentPage, showProductModal]);

  // Effect to handle page changes
  useEffect(() => {
    if (showProductModal) {
      searchModalProducts(modalSearchTerm, currentPage);
    }
  }, [currentPage, showProductModal]);

  /**
   * Handles the form submission, creates an order, and sends a WhatsApp message.
   * @param {Object} e - The event object.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionError(""); // Clear previous submission errors
    if (!validateForm()) return; // Validate form before proceeding

    setIsSending(true); // Set sending state to true

    try {
      // Get the current store ID from the global whatsapofyProducts object
      const currentStoreId = window.whatsapofyProducts?.storeId;
      if (!currentStoreId) {
        throw new Error(
          "Store ID not available. Please ensure you are logged in and a store is selected/active."
        );
      }

      // Extract relevant details from selectedVariant and selectedProduct, providing fallbacks
      const itemSku = selectedVariant?.sku || "";
      const itemPrice = parseFloat(selectedVariant?.price) || 0;
      const itemImage =
        selectedVariant?.image ||
        "https://placehold.co/50x50/cccccc/000000?text=Product";
      const itemVendor = selectedProduct?.vendor || "";
      const itemWeight = selectedVariant?.weight || 0;
      const itemProductId = selectedProduct?._id || selectedProduct?.id || "";
      // Prioritize variant name, then product name, then form product name
      const itemVariantName =
        selectedVariant?.name || selectedProduct?.name || formData.productName;

      const quantity = Number(formData.quantity);
      const subTotal = itemPrice * quantity;
      const shippingCost = 500; // Fixed shipping cost from API response example
      const totalCOD = subTotal + shippingCost; // Assuming no tax/discount for simplicity for COD

      // Determine shipperInfo from userInfo or defaults, ensuring empty strings for optional fields
      const shipperInfoPayload = {
        labelStoreName: userInfo?.name || "",
        phoneNumber: formData.phone || "",
        locationName: userInfo?.location || "",
        city: userInfo?.city || "",
        returnAddress: userInfo?.address || "",
        address: userInfo?.address || "",
        country: userInfo?.country || "Pakistan",
      };

      const orderPayload = {
        storeId: currentStoreId,
        shopify_id: 0, // Changed from null to 0 as per API schema example
        channelId: "67db243cd0d009db10be8378", // Fixed channel ID from API response example
        customerId: "67db243cd0d009db10be8378", // Consider making this dynamic based on actual customer ID
        productId: itemProductId,
        shipperInfo: shipperInfoPayload,
        name: `Order for ${formData.name} - ${formData.productName}`, // This will be our identifier
        lineItems: [
          {
            variantId: formData.variantId,
            sku: itemSku,
            quantity: quantity,
            name: itemVariantName,
            price: itemPrice,
            image: itemImage,
            vendor: itemVendor,
            weight: itemWeight,
          },
        ],
        financialStatus: "pending",
        deliveryStatus: "", // Changed from null to empty string as per API schema
        fulfillmentStatus: "confirm",
        tags: [],
        pricing: {
          subTotal: subTotal,
          currentTotalPrice: totalCOD,
          paid: 0,
          balance: 0,
          shipping: 500,
          taxPercentage: 0,
          taxValue: 0,
          extra: [],
          discount: null, // Keep as null if discount is optional, or provide default object if mandatory
          paymentProof: "", // Changed from null to empty string as per API schema
          totalCOD: totalCOD,
        },
        resellerOrder: {
          // Changed from null to object with required ID and default values
          accountId:
            userInfo?.shopilamSurvey?.accountId || "688a4ecae75a76af0b439d13", // Use actual accountId from userInfo or a dummy
          profit: 0,
          paidAlready: 0,
          paymentProof: "",
          totalCOD: 0,
          payoutStatus: "pending",
          status: "processing",
        },
        shipmentDetails: {
          shipmentType: "Normal",
          email: formData.email,
          addresses: [
            {
              company: formData.company || "",
              address1: formData.address1,
              address2: formData.address2 || "",
              city: {
                city: formData.city,
                typo: formData.city.toLowerCase().replace(/\s/g, ""), // Simple typo generation
              },
              province: formData.province,
              country: "Pakistan", // Fixed country for now
              zip: formData.zip,
              phone: formData.phone,
              name: formData.name,
            },
          ],
        },
        tracking: {
          tracking_no: "", // Required by API, even if empty initially
          events: [],
          courier: "5eb7cf5a86d9755df3a6c593", // Changed from null to a dummy PydanticObjectId as per API schema
        },
        currency: "PKR",
        status: "open", // Changed from "reselling" to "open" as per API schema example
      };

      console.log("📤 Sending order:", orderPayload);
      const { success, data, error } = await createOrder(orderPayload);

      // Modified success check:
      // Check for response.success (from background.js) or if the API's message indicates success.
      const isActuallySuccessful =
        success || (data && data.message === "Order created successfully");

      if (isActuallySuccessful) {
        // Use the 'name' from the orderPayload as the identifier for the message
        const orderIdentifier = orderPayload.name;

        console.log("📦 Order created:", data);
        // Call the global function to send the message and potentially the product image
        if (window.sendMessageToCurrentChat) {
          await window.sendMessageToCurrentChat(
            `✅ Order "${orderIdentifier}" confirmed!`,
            selectedProduct
          );
        } else {
          console.warn(
            "⚠️ window.sendMessageToCurrentChat not available. Message not sent to chat."
          );
        }
        onClose(); // Close the modal on successful order creation
      } else {
        // Handle order creation failure
        const errorMessage =
          error ||
          (data && data.detail) ||
          "Order creation failed with an unknown error.";
        console.error("Order creation failed:", errorMessage, data);
        setSubmissionError(`Failed to create order: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Order error:", error);
      setSubmissionError(`Failed: ${error.message}`);
    } finally {
      setIsSending(false); // Turn off sending state regardless of success or failure
    }
  };

  // Filter selectedProduct.variants to ensure they are valid and have an ID for the second dropdown (Variant)
  const currentProductVariants =
    selectedProduct && selectedProduct.variants
      ? selectedProduct.variants.filter((v) => v.id || v.variantId)
      : [];

  console.log("modalProducts", modalProducts);
  return (
    <form onSubmit={handleSubmit} style={inlineFormStyle}>
      <div style={scrollableContentStyle}>
        {isLoading ? (
          <div style={loadingStyle}>
            <div style={spinnerStyle}></div>
            <p>Loading contact and product information...</p>
          </div>
        ) : (
          <div style={sectionContainerStyle}>
            <div style={sectionStyle}>
              <div style={fieldGroupStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Product*</label>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="text"
                      value={
                        selectedProduct
                          ? selectedProduct.name || selectedProduct.title
                          : ""
                      }
                      placeholder="Select Product"
                      readOnly
                      style={{
                        ...inputStyle,
                        backgroundColor: "#f9f9f9",
                        cursor: "pointer",
                        flex: 1,
                      }}
                      onClick={() => setShowProductModal(true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowProductModal(true)}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#8B5CF6",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "500",
                        fontSize: "0.95rem",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Browse
                    </button>
                  </div>
                  {errors.productName && (
                    <span style={errorStyle}>{errors.productName}</span>
                  )}
                </div>
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div style={sectionStyle}>
                <h3 style={sectionHeaderStyle}>Selected Items</h3>
                <div style={fieldGroupStyle}>
                  {selectedItems.map((item) => (
                    <div key={item.id} style={selectedItemStyle}>
                      {/* Avatar on the left */}
                      <div style={selectedItemAvatarStyle}>
                        {item.product.title
                          ? item.product.title.charAt(0).toUpperCase()
                          : "P"}
                      </div>

                      {/* Content on the right */}
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {/* Product name */}
                        <div style={selectedItemNameStyle}>{item.name}</div>

                        {/* Price and total row */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={selectedItemPriceStyle}>
                            Rs. {formatPrice(item.price)} x {item.quantity}
                          </div>
                          <div style={selectedItemTotalStyle}>
                            Rs. {formatPrice(item.price * item.quantity)}
                          </div>
                        </div>

                        {/* Quantity controls and remove button row */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={quantityControlsStyle}>
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity - 1)
                              }
                              style={quantityButtonStyle}
                            >
                              -
                            </button>
                            <span style={quantityDisplayStyle}>
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(item.id, item.quantity + 1)
                              }
                              style={quantityButtonStyle}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            style={removeButtonStyle}
                          >
                            <IoMdTrash width={20} height={20} color="red" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Method Section */}
            <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Payment Method*</h3>
              <div style={radioGroupStyle}>
                {paymentMethods.map((method) => (
                  <label key={method.value} style={radioLabelStyle}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={formData.paymentMethod === method.value}
                      onChange={handleChange}
                      required
                      style={radioInputStyle}
                    />
                    <span>{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Shipping Information Section */}
            <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Shipping Information</h3>
              <div style={fieldGroupStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Name*</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={{ ...inputStyle }}
                  />
                  {errors.name && <span style={errorStyle}>{errors.name}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Phone Number*</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                  {errors.phone && (
                    <span style={errorStyle}>{errors.phone}</span>
                  )}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                  {errors.email && (
                    <span style={errorStyle}>{errors.email}</span>
                  )}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>City*</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                  {errors.city && <span style={errorStyle}>{errors.city}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Address*</label>
                  <textarea
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                  {errors.address && (
                    <span style={errorStyle}>{errors.address}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {submissionError && (
          <div
            style={{
              ...errorStyle,
              padding: "10px",
              backgroundColor: "#ffebee",
              borderRadius: "4px",
              marginTop: "15px",
            }}
          >
            ❌ {submissionError}
          </div>
        )}
      </div>

      {showProductModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalStyle, maxWidth: "500px", maxHeight: "80vh" }}>
            <div style={modalHeaderStyle}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  color: "#333",
                  fontWeight: "600",
                }}
              >
                All Products
              </h2>
              <button onClick={handleModalClose} style={closeButtonStyle}>
                ×
              </button>
            </div>

            <div style={searchContainerStyle}>
              <div style={searchInputWrapperStyle}>
                <span style={searchIconStyle}>🔍</span>
                <input
                  type="text"
                  placeholder="Search by any field..."
                  value={modalSearchTerm}
                  onChange={(e) => {
                    setModalSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  style={searchInputStyle}
                />
              </div>
            </div>

            <div style={productListStyle}>
              {modalLoading ? (
                <div style={loadingStyle}>
                  <div style={spinnerStyle}></div>
                  <p>Loading products...</p>
                </div>
              ) : (
                modalProducts.map((item, index) => {
                  const isSingleVariant = item?.variants?.length === 1;
                  const totalStock = item?.variants?.reduce(
                    (sum, variant) => sum + (variant?.stock?.available || 0),
                    0
                  );

                  return (
                    <div key={item._id || index}>
                      {/* Main Product Row */}
                      <div style={productListItemStyle}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "20px",
                            // marginLeft: isSingleVariant ? "0" : "40px",
                          }}
                        >
                          {isSingleVariant && (
                            <div style={checkboxStyle}>
                              <input
                                type="checkbox"
                                checked={item?.variants?.[0]?.checked || false}
                                disabled={
                                  item?.variants?.[0]?.stock?.available === 0
                                }
                                onChange={(e) =>
                                  handleCheck(e, item?.variants?.[0])
                                }
                                style={checkboxInputStyle}
                              />
                            </div>
                          )}

                          <div style={avatarStyle}>
                            {item.title
                              ? item.title.charAt(0).toUpperCase()
                              : "P"}
                          </div>

                          <div style={productInfoStyle}>
                            <div style={productNameStyle}>
                              {item.title || ""}
                            </div>
                            <div style={productDescriptionStyle}>
                              {item.category || ""}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "16px",
                          }}
                        >
                          <div style={availabilityStyle}>
                            {item?.variants?.[0]?.stock?.available === 0 ? (
                              <span>
                                {item?.variants?.[0]?.stock?.available} out of
                                stock
                              </span>
                            ) : (
                              <span>
                                {formatPrice(
                                  item?.variants?.[0]?.stock?.available
                                ) || ""}{" "}
                                Available
                              </span>
                            )}
                          </div>

                          <div style={priceStyle}>
                            Rs. {formatPrice(item?.variants?.[0]?.price) || 0}
                          </div>
                        </div>
                      </div>

                      {/* Variants Section */}
                      {!isSingleVariant && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            marginLeft: "48px",
                            marginTop: "16px",
                            paddingBottom: "16px",
                            borderBottom: "2px solid #e0e0e0",
                          }}
                        >
                          {item?.variants?.map((variant) => (
                            <div
                              key={variant?.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                margin: "8px 0",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  width: "400px",
                                }}
                              >
                                <div style={checkboxStyle}>
                                  <input
                                    type="checkbox"
                                    checked={variant?.checked || false}
                                    disabled={variant?.stock?.available === 0}
                                    onChange={(e) => handleCheck(e, variant)}
                                    style={checkboxInputStyle}
                                  />
                                </div>

                                <div style={avatarStyle}>
                                  {variant?.sku
                                    ? variant.sku.charAt(0).toUpperCase()
                                    : "V"}
                                </div>

                                <div style={productNameStyle}>
                                  {variant?.sku || ""}
                                </div>
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "flex-end",
                                  gap: "24px",
                                  width: "100%",
                                }}
                              >
                                <div style={availabilityStyle}>
                                  {variant?.stock?.available === 0 ? (
                                    <span>
                                      {variant?.stock?.available} out of stock
                                    </span>
                                  ) : (
                                    <span>
                                      {formatPrice(variant?.stock?.available) ||
                                        ""}{" "}
                                      Available
                                    </span>
                                  )}
                                </div>

                                <div style={priceStyle}>
                                  Rs. {formatPrice(variant?.price) || ""}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {!modalLoading && modalProducts.length === 0 && (
                <div style={noProductsStyle}>
                  <p>No products found</p>
                </div>
              )}
            </div>

            <div style={modalFooterStyle}>
              <div style={paginationStyle}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={paginationButtonStyle}
                >
                  &lt;&lt;
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  style={paginationButtonStyle}
                >
                  &lt;
                </button>
                <span style={paginationInfoStyle}>
                  {currentPage} / {modalTotalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(modalTotalPages, prev + 1)
                    )
                  }
                  disabled={currentPage === modalTotalPages}
                  style={paginationButtonStyle}
                >
                  &gt;
                </button>
                <button
                  onClick={() => setCurrentPage(modalTotalPages)}
                  disabled={currentPage === modalTotalPages}
                  style={paginationButtonStyle}
                >
                  &gt;&gt;
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItemstems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <div style={selectionSummaryStyle}>
                  {selectedProducts.length} /{" "}
                  {modalProducts.reduce((acc, item) => {
                    const variantsLength = item?.variants?.length || 0;
                    return acc + (variantsLength > 1 ? variantsLength : 1);
                  }, 0)}{" "}
                  products selected
                </div>

                <div style={actionButtonsStyle}>
                  <button onClick={handleModalClose} style={cancelButtonStyle}>
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      // Handle add checked items
                      const checkedItems = [];

                      modalProducts.forEach((item) => {
                        if (
                          item?.variants?.length === 1 &&
                          item?.variants?.[0]?.checked
                        ) {
                          // Single variant checked
                          checkedItems.push({
                            product: item,
                            variant: item.variants[0],
                          });
                        } else if (item?.variants?.length > 1) {
                          // Multiple variants - check each one
                          item.variants.forEach((variant) => {
                            if (variant?.checked) {
                              checkedItems.push({
                                product: item,
                                variant: variant,
                              });
                            }
                          });
                        } else if (item?.checked) {
                          // Product without variants checked
                          checkedItems.push({
                            product: item,
                            variant: null,
                          });
                        }
                      });

                      // Add all checked items to selected items
                      checkedItems.forEach(({ product, variant }) => {
                        handleModalProductSelect(product, variant);
                      });

                      // Clear checked states
                      const clearedProducts = modalProducts.map((item) => ({
                        ...item,
                        checked: false,
                        variants: item.variants?.map((variant) => ({
                          ...variant,
                          checked: false,
                        })),
                      }));
                      setModalProducts(clearedProducts);
                      setSelectedProducts([]);
                    }}
                    style={addButtonStyle}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={actionsStyle}>
        <button
          type="button"
          onClick={onClose}
          style={secondaryButtonStyle}
          disabled={isLoading || isSending}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={primaryButtonStyle}
          disabled={isLoading || isSending}
        >
          {isSending
            ? "Sending..."
            : isLoading
            ? "Processing..."
            : "Place Order"}
        </button>
      </div>
    </form>
  );
};

const paymentMethods = [
  { value: "COD", label: "Cash on Delivery" },
  { value: "prepaid", label: "Prepaid" },
  // { value: "credit_card", label: "Credit Card" },
  // { value: "mobile_payment", label: "Mobile Payment" },
];

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10000,
  padding: "20px",
};

const modalStyle = {
  background: "#fff",
  padding: "25px",
  borderRadius: "12px",
  width: "100%",
  maxWidth: "500px",
  maxHeight: "90vh",
  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const inlineFormStyle = {
  background: "transparent",
  padding: "0",
  borderRadius: "0",
  width: "100%",
  maxWidth: "100%",
  maxHeight: "none",
  boxShadow: "none",
  display: "flex",
  flexDirection: "column",
  overflow: "visible",
};

const scrollableContentStyle = {
  overflowY: "visible",
  paddingRight: "0",
  marginRight: "0",
  flex: "1",
};

const headerStyle = {
  margin: "0 0 20px 0",
  fontSize: "1.2rem",
  color: "#333",
  position: "static",
  background: "transparent",
  paddingBottom: "10px",
};

const sectionContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "25px",
};

const sectionStyle = {};

const sectionHeaderStyle = {
  margin: "0 0 12px 0",
  fontSize: "1.1rem",
  color: "#555",
};

const fieldGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "15px",
};

const fieldStyle = {};

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontWeight: "500",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #ddd",
  fontSize: "0.95rem",
  boxSizing: "border-box",
};

const errorStyle = {
  color: "#e74c3c",
  fontSize: "0.85rem",
  marginTop: "5px",
  display: "block",
};

const radioGroupStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const radioLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const radioInputStyle = {
  margin: 0,
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
  marginTop: "20px",
  paddingTop: "15px",
  borderTop: "1px solid #eee",
};

const primaryButtonStyle = {
  background: "#00bfae",
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "0.95rem",
  transition: "background 0.2s",
  ":hover": {
    background: "#009688",
  },
};

const secondaryButtonStyle = {
  background: "#f0f0f0",
  color: "#333",
  border: "none",
  padding: "10px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "0.95rem",
  transition: "background 0.2s",
  ":hover": {
    background: "#e0e0e0",
  },
};

const loadingStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 0",
  gap: "20px",
};

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "4px solid rgba(0, 191, 174, 0.2)",
  borderTop: "4px solid #00bfae",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  "@keyframes spin": {
    "0%": { transform: "rotate(0deg)" },
    "100%": { transform: "rotate(360deg)" },
  },
};

// Product modal styles
const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px",
  paddingBottom: "15px",
  borderBottom: "1px solid #e0e0e0",
};

const closeButtonStyle = {
  background: "transparent",
  border: "none",
  fontSize: "1.5rem",
  cursor: "pointer",
  color: "#666",
  padding: "5px",
  width: "30px",
  height: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "4px",
};

const searchContainerStyle = {
  marginBottom: "20px",
};

const searchInputWrapperStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const searchIconStyle = {
  position: "absolute",
  left: "12px",
  fontSize: "16px",
  color: "#666",
  zIndex: 1,
};

const searchInputStyle = {
  width: "100%",
  padding: "12px 12px 12px 40px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "1rem",
  boxSizing: "border-box",
  backgroundColor: "#fff",
};

const productListStyle = {
  maxHeight: "400px",
  overflowY: "auto",
  marginBottom: "20px",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
};

const productListItemStyle = {
  display: "flex",
  alignItems: "center",
  padding: "15px",
  borderBottom: "1px solid #f0f0f0",
  backgroundColor: "#fff",
  position: "relative",
};

const checkboxStyle = {
  marginRight: "15px",
};

const checkboxInputStyle = {
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const avatarStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  backgroundColor: "#20B2AA",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: "600",
  marginRight: "15px",
  flexShrink: 0,
};

const productInfoStyle = {
  flex: 1,
  marginRight: "15px",
};

const productNameStyle = {
  fontSize: "1rem",
  fontWeight: "600",
  color: "#333",
  marginBottom: "4px",
};

const productDescriptionStyle = {
  fontSize: "0.9rem",
  color: "#666",
};

const availabilityStyle = {
  fontSize: "0.9rem",
  color: "#666",
  marginRight: "15px",
  minWidth: "100px",
  textAlign: "center",
};

const priceStyle = {
  fontSize: "1rem",
  fontWeight: "600",
  color: "#333",
  marginRight: "15px",
  minWidth: "80px",
  textAlign: "right",
};

const variantsDropdownStyle = {
  position: "absolute",
  top: "100%",
  left: "0",
  right: "0",
  backgroundColor: "#f9f9f9",
  border: "1px solid #ddd",
  borderTop: "none",
  padding: "10px",
  zIndex: 10,
};

const variantSelectStyle = {
  width: "100%",
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "0.9rem",
};

const modalFooterStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  justifyContent: "space-between",
  alignItems: "center",
  paddingTop: "15px",
  borderTop: "1px solid #e0e0e0",
};

const selectionSummaryStyle = {
  fontSize: "0.9rem",
  color: "#666",
};

const footerActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
};

const paginationStyle = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  justifyContent: "end",
  width: "100%",
};

const paginationButtonStyle = {
  padding: "6px 10px",
  border: "1px solid #ddd",
  backgroundColor: "#fff",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "0.9rem",
  color: "#333",
};

const paginationInfoStyle = {
  fontSize: "0.9rem",
  color: "#666",
  margin: "0 10px",
};

const actionButtonsStyle = {
  display: "flex",
  gap: "10px",
};

const cancelButtonStyle = {
  padding: "10px 20px",
  backgroundColor: "#fff",
  color: "#666",
  border: "1px solid #ddd",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.95rem",
  fontWeight: "500",
};

const addButtonStyle = {
  padding: "10px 20px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.95rem",
  fontWeight: "500",
};

const noProductsStyle = {
  padding: "40px",
  textAlign: "center",
  color: "#666",
};

// Selected items styles
const selectedItemStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "12px",
  border: "1px solid #e0e0e0",
  borderRadius: "8px",
  marginBottom: "12px",
  backgroundColor: "#fff",
};

const selectedItemAvatarStyle = {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  backgroundColor: "#20B2AA",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: "600",
  flexShrink: 0,
};

const selectedItemInfoStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const selectedItemNameStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#333",
};

const selectedItemPriceStyle = {
  fontSize: "12px",
  color: "#666",
};

const quantityControlsStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  border: "1px solid #ddd",
  borderRadius: "4px",
  padding: "4px",
};

const quantityButtonStyle = {
  width: "24px",
  height: "24px",
  border: "none",
  backgroundColor: "#f0f0f0",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "600",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const quantityDisplayStyle = {
  fontSize: "14px",
  fontWeight: "600",
  minWidth: "20px",
  textAlign: "center",
};

const selectedItemTotalStyle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#333",
  minWidth: "80px",
  textAlign: "right",
};

const removeButtonStyle = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "16px",
  padding: "4px",
  color: "#dc3545",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default ModalForm;
