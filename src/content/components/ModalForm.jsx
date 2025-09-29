import React, { useState, useEffect } from "react";
import { createOrder } from "../../utils/createOrder.js"; // Assuming this path is correct

const ModalForm = ({ onClose }) => {
  // State to manage form data
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    productName: "", // Stores the selected product's name
    variantId: "", // Stores the selected variant's ID
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    company: "",
    email: "",
    quantity: 1,
    paymentMethod: "COD",
  });

  // State for form validation errors
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

  // Effect to extract contact info from WhatsApp UI and load global data (products, user info)
  useEffect(() => {
    const loadInitialData = async () => {
      // No longer set isLoading to true here, as it's true by default.
      // It will be set to false once all data is loaded or an error occurs.
      try {
        // --- Extract contact info from WhatsApp UI ---
        // This part attempts to pre-fill name and phone from the active WhatsApp chat.
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
              console.log("📦 Products data loaded:", products.length, "items");
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

  /**
   * Handles variant selection from the dropdown.
   * Finds the full variant object and sets it to selectedVariant state.
   * @param {Object} e - The event object.
   */
  const handleVariantSelect = (e) => {
    const variantId = e.target.value;
    setFormData((prev) => ({ ...prev, variantId: variantId }));
    if (selectedProduct && selectedProduct.variants) {
      // Find the variant by its variantId or id
      const variant = selectedProduct.variants.find(
        (v) => (v.id || v.variantId) === variantId
      );
      setSelectedVariant(variant || null);
    }
    // Clear variant-related errors
    if (errors.variantId) {
      setErrors((prev) => ({ ...prev, variantId: "" }));
    }
    if (submissionError) setSubmissionError("");
  };

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

      // Construct the order payload based on the API response structure
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

  // For inline rendering, we don't need modal root
  // const modalRoot = document.getElementById('whatsapp-modal-root');

  // Get unique product names for the first dropdown (Product Name)
  const uniqueProductNames = [...new Set(productsData.map((p) => p.name))];
  // Filter selectedProduct.variants to ensure they are valid and have an ID for the second dropdown (Variant)
  const currentProductVariants =
    selectedProduct && selectedProduct.variants
      ? selectedProduct.variants.filter((v) => v.id || v.variantId)
      : [];

  // Render the form inline instead of in a modal
  return (
    <form onSubmit={handleSubmit} style={inlineFormStyle}>
      <div style={scrollableContentStyle}>
        {/* <h2 style={headerStyle}>Create New Order</h2> */}
        {/* Show loading spinner if data is still being fetched */}
        {isLoading ? (
          <div style={loadingStyle}>
            <div style={spinnerStyle}></div>
            <p>Loading contact and product information...</p>
          </div>
        ) : (
          // Render the form sections once data is loaded
          <div style={sectionContainerStyle}>
            {/* Customer Information Section */}
            <div style={sectionStyle}>
              {/* <h3 style={sectionHeaderStyle}>Customer Information</h3> */}
              <div style={fieldGroupStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Full Name*</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={inputStyle}
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
                    required
                    style={inputStyle}
                  />
                  {errors.phone && (
                    <span style={errorStyle}>{errors.phone}</span>
                  )}
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Email*</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                    placeholder="customer@example.com"
                  />
                  {errors.email && (
                    <span style={errorStyle}>{errors.email}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Order Details Section */}
            <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Order Details</h3>
              <div style={fieldGroupStyle}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Product Name*</label>
                  <select
                    name="productName"
                    value={formData.productName}
                    onChange={handleProductSelect}
                    // required
                    style={inputStyle}
                  >
                    <option value="">Select a product</option>
                    {/* Map through unique product names to populate the dropdown */}
                    {uniqueProductNames.map((name, index) => (
                      <option key={index} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  {errors.productName && (
                    <span style={errorStyle}>{errors.productName}</span>
                  )}
                </div>

                {/* Variant Dropdown - Only rendered if a product is selected */}
                {selectedProduct && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Variant*</label>
                    <select
                      name="variantId"
                      value={formData.variantId}
                      onChange={handleVariantSelect}
                      required
                      style={inputStyle}
                      // Disable if no product selected or no variants available for the product
                      disabled={
                        !selectedProduct || currentProductVariants.length === 0
                      }
                    >
                      <option value="">Select a variant</option>
                      {/* Map through current product's variants */}
                      {currentProductVariants.map((variant, index) => (
                        <option
                          key={variant.id || variant.variantId || index}
                          value={variant.id || variant.variantId}
                        >
                          {variant.name || variant.variantId} (SKU:{" "}
                          {variant.sku || "N/A"}) - PKR {variant.price || "N/A"}
                        </option>
                      ))}
                    </select>
                    {errors.variantId && (
                      <span style={errorStyle}>{errors.variantId}</span>
                    )}
                  </div>
                )}

                {/* Selected Variant Details - Only rendered if a variant is selected */}
                {selectedVariant && (
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Selected Variant Details:</label>
                    <p
                      style={{
                        ...inputStyle,
                        backgroundColor: "#f9f9f9",
                        border: "1px dashed #ddd",
                        padding: "8px 12px",
                      }}
                    >
                      Price: PKR {selectedVariant.price || "N/A"}
                      <br />
                      SKU: {selectedVariant.sku || "N/A"}
                      <br />
                      Vendor: {selectedProduct?.vendor || "N/A"}
                    </p>
                  </div>
                )}

                <div style={fieldStyle}>
                  <label style={labelStyle}>Quantity*</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="1"
                    required
                    style={inputStyle}
                  />
                  {errors.quantity && (
                    <span style={errorStyle}>{errors.quantity}</span>
                  )}
                </div>
              </div>
            </div>

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
                  <label style={labelStyle}>Address Line 1*</label>
                  <textarea
                    name="address1"
                    value={formData.address1}
                    onChange={handleChange}
                    rows="2"
                    required
                    style={{ ...inputStyle, minHeight: "60px" }}
                  />
                  {errors.address1 && (
                    <span style={errorStyle}>{errors.address1}</span>
                  )}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Address Line 2</label>
                  <input
                    type="text"
                    name="address2"
                    value={formData.address2}
                    onChange={handleChange}
                    style={inputStyle}
                  />
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
                  <label style={labelStyle}>Province*</label>
                  <input
                    type="text"
                    name="province"
                    value={formData.province}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                  {errors.province && (
                    <span style={errorStyle}>{errors.province}</span>
                  )}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Zip Code*</label>
                  <input
                    type="text"
                    name="zip"
                    value={formData.zip}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                  {errors.zip && <span style={errorStyle}>{errors.zip}</span>}
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Company (Optional)</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Display submission errors */}
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

      {/* Form Action Buttons */}
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

// Constants for payment methods
const paymentMethods = [
  { value: "COD", label: "Cash on Delivery" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "mobile_payment", label: "Mobile Payment" },
];

// Styles
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

export default ModalForm;
