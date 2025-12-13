import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../hooks/useTheme";
import {
  downloadImageAsFile,
  getToken,
} from "../../core/utils/helperFunctions";

const AddProductSidebar = ({ onClose }) => {
  const [imageStates, setImageStates] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [subCategories, setSubCategories] = useState([]);
  const theme = useTheme();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    images: [],
    category: "",
    subCategory: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Separate state for variant images (bulk variant creation)
  const [variantImages, setVariantImages] = useState([]);
  const [variantImageStates, setVariantImageStates] = useState({});
  const variantFileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCategoryChange = (categoryId) => {
    console.log("categoryId", categoryId);
    setSelectedCategory(categoryId);
    setSelectedSubCategory("");
    setSubCategories([]);

    // Find the selected category and get its subcategories
    const selectedCategoryObj = categories.find(
      (cat) => cat._id === categoryId
    );
    if (selectedCategoryObj && selectedCategoryObj.subCategory) {
      setSubCategories(selectedCategoryObj.subCategory);
    }

    // Update form data with category name instead of ID
    setFormData((prev) => ({
      ...prev,
      category: selectedCategoryObj ? selectedCategoryObj.name : "",
      subCategory: "",
    }));
  };

  const handleSubCategoryChange = (subCategoryName) => {
    setSelectedSubCategory(subCategoryName);

    // Update form data with subcategory name
    setFormData((prev) => ({
      ...prev,
      subCategory: subCategoryName,
    }));
  };

  useEffect(() => {
    const getCategories = async () => {
      try {
        const response = await fetch(
          "https://api.shopilam.com/api/v1/category",
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
        const data = await response.json();
        console.log("Fetched categories:", data);
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      }
    };
    getCategories();
  }, []);

  const convertFileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const uploadImageBase64 = async (base64) => {
    const response = await fetch(
      "https://api.shopilam.com/api/v1/image/upload",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          image_base64: base64,
          module: "product",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to upload image");
    }

    return data;
  };

  const handleImageSelect = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) {
      return;
    }

    const baseId = Date.now();

    for (const [index, file] of files.entries()) {
      const imageId = baseId + index;

      setImageStates((prev) => ({
        ...prev,
        [imageId]: {
          loading: true,
          downloaded: false,
          error: null,
          preview: null,
        },
      }));

      try {
        const base64 = await convertFileToBase64(file);
        const uploadData = await uploadImageBase64(base64);
        const downloadableUrl =
          uploadData?.thumbnail_url ||
          uploadData?.url ||
          uploadData?.image_url ||
          "";

        let previewSource = null;
        if (downloadableUrl) {
          try {
            const downloadedFile = await downloadImageAsFile(
              downloadableUrl,
              `${imageId}.jpg`
            );
            previewSource = URL.createObjectURL(downloadedFile);
          } catch (downloadError) {
            console.error("Error downloading uploaded image:", downloadError);
            previewSource = downloadableUrl;
          }
        } else if (uploadData?.image_base64) {
          previewSource = uploadData.image_base64;
        }

        setImageStates((prev) => ({
          ...prev,
          [imageId]: {
            loading: false,
            downloaded: true,
            error: null,
            preview: previewSource,
          },
        }));

        setFormData((prev) => ({
          ...prev,
          images: [
            ...prev.images,
            {
              id: imageId,
              name: file.name,
              url:
                uploadData?.url ||
                uploadData?.image_url ||
                uploadData?.original_url ||
                previewSource ||
                "",
              thumbnailUrl:
                uploadData?.thumbnail_url ||
                uploadData?.url ||
                uploadData?.image_url ||
                previewSource ||
                "",
              loading: false,
            },
          ],
        }));
      } catch (error) {
        console.error("Error uploading selected image:", error);
        setImageStates((prev) => ({
          ...prev,
          [imageId]: {
            loading: false,
            downloaded: false,
            error: error.message || "Upload failed",
            preview: null,
          },
        }));
        showNotification(
          `❌ Failed to upload ${file.name}: ${
            error.message || "Upload failed"
          }`,
          "error"
        );
      }
    }

    if (event.target) {
      event.target.value = "";
    }
  };

  const removeImage = (imageId) => {
    const state = imageStates[imageId];
    if (state?.preview && state.preview.startsWith("blob:")) {
      URL.revokeObjectURL(state.preview);
    }

    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== imageId),
    }));

    // Clean up image state
    setImageStates((prev) => {
      const newStates = { ...prev };
      delete newStates[imageId];
      return newStates;
    });
  };

  // Handler for variant image selection (bulk variant creation)
  const handleVariantImageSelect = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) {
      return;
    }

    const baseId = Date.now();

    for (const [index, file] of files.entries()) {
      const imageId = Date.now();

      setVariantImageStates((prev) => ({
        ...prev,
        [imageId]: {
          loading: true,
          downloaded: false,
          error: null,
          preview: null,
        },
      }));

      try {
        const base64 = await convertFileToBase64(file);
        const uploadData = await uploadImageBase64(base64);
        const downloadableUrl =
          uploadData?.thumbnail_url ||
          uploadData?.url ||
          uploadData?.image_url ||
          "";

        let previewSource = null;
        if (downloadableUrl) {
          try {
            const downloadedFile = await downloadImageAsFile(
              downloadableUrl,
              `${imageId}.jpg`
            );
            previewSource = URL.createObjectURL(downloadedFile);
          } catch (downloadError) {
            console.error("Error downloading uploaded image:", downloadError);
            previewSource = downloadableUrl;
          }
        } else if (uploadData?.image_base64) {
          previewSource = uploadData.image_base64;
        }

        setVariantImageStates((prev) => ({
          ...prev,
          [imageId]: {
            loading: false,
            downloaded: true,
            error: null,
            preview: previewSource,
          },
        }));

        setVariantImages((prev) => [
          ...prev,
          {
            id: imageId,
            name: file.name,
            url:
              uploadData?.url ||
              uploadData?.image_url ||
              uploadData?.original_url ||
              previewSource ||
              "",
            thumbnailUrl:
              uploadData?.thumbnail_url ||
              uploadData?.url ||
              uploadData?.image_url ||
              previewSource ||
              "",
            loading: false,
          },
        ]);
      } catch (error) {
        console.error("Error uploading variant image:", error);
        setVariantImageStates((prev) => ({
          ...prev,
          [imageId]: {
            loading: false,
            downloaded: false,
            error: error.message || "Upload failed",
            preview: null,
          },
        }));
        showNotification(
          `❌ Failed to upload ${file.name}: ${
            error.message || "Upload failed"
          }`,
          "error"
        );
      }
    }

    if (event.target) {
      event.target.value = "";
    }
  };

  // Remove variant image
  const removeVariantImage = (imageId) => {
    const state = variantImageStates[imageId];
    if (state?.preview && state.preview.startsWith("blob:")) {
      URL.revokeObjectURL(state.preview);
    }

    setVariantImages((prev) => prev.filter((img) => img.id !== imageId));

    // Clean up image state
    setVariantImageStates((prev) => {
      const newStates = { ...prev };
      delete newStates[imageId];
      return newStates;
    });
  };

  const processImageFromChat = async (responseData) => {
    try {
      const imageId = Date.now();

      setImageStates((prev) => ({
        ...prev,
        [imageId]: {
          loading: true,
          downloaded: false,
          error: null,
          preview: null,
        },
      }));
      console.log("responseData", responseData);
      const imageFile = await downloadImageAsFile(
        responseData.thumbnail_url,
        `${Date.now()}.jpg`
      );
      const objectUrl = URL.createObjectURL(imageFile);

      setImageStates((prev) => ({
        ...prev,
        [imageId]: {
          loading: false,
          downloaded: true,
          error: null,
          preview: objectUrl,
        },
      }));

      setFormData((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          {
            id: imageId,
            name: responseData.original_filename || `image-${imageId}`,
            url:
              responseData?.url ||
              responseData?.image_url ||
              responseData?.original_url ||
              objectUrl ||
              "",
            thumbnailUrl:
              responseData?.thumbnail_url ||
              responseData?.url ||
              responseData?.image_url ||
              objectUrl ||
              "",
            loading: false,
          },
        ],
      }));

      console.log("✅ Image processed from chat:", imageId);
    } catch (error) {
      console.error("❌ Error processing image from chat:", error);
      setImageStates((prev) => ({
        ...prev,
        [imageId]: {
          loading: false,
          downloaded: false,
          error: error.message,
          preview: null,
        },
      }));
    }
  };

  const processVariantImageFromChat = async (responseData) => {
    try {
      const imageId = Date.now();

      setVariantImageStates((prev) => ({
        ...prev,
        [imageId]: {
          loading: true,
          downloaded: false,
          error: null,
          preview: null,
        },
      }));
      console.log("responseData (variant):", responseData);
      const imageFile = await downloadImageAsFile(
        responseData.thumbnail_url,
        `${Date.now()}.jpg`
      );
      const objectUrl = URL.createObjectURL(imageFile);

      setVariantImageStates((prev) => ({
        ...prev,
        [imageId]: {
          loading: false,
          downloaded: true,
          error: null,
          preview: objectUrl,
        },
      }));

      setVariantImages((prev) => [
        ...prev,
        {
          id: imageId,
          name: responseData.original_filename || `variant-image-${imageId}`,
          url:
            responseData?.url ||
            responseData?.image_url ||
            responseData?.original_url ||
            objectUrl ||
            "",
          thumbnailUrl:
            responseData?.thumbnail_url ||
            responseData?.url ||
            responseData?.image_url ||
            objectUrl ||
            "",
          loading: false,
        },
      ]);

      console.log("✅ Variant image processed from chat:", imageId);
    } catch (error) {
      console.error("❌ Error processing variant image from chat:", error);
      setVariantImageStates((prev) => ({
        ...prev,
        [imageId]: {
          loading: false,
          downloaded: false,
          error: error.message,
          preview: null,
        },
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert("Please enter a product title");
      return;
    }

    if (!formData.description.trim()) {
      alert("Please enter a product description");
      return;
    }

    if (formData.images.length === 0) {
      alert("Please select at least one image");
      return;
    }

    setIsSubmitting(true);

    try {
      const newProduct = {
        title: formData.title,
        category: formData.category,
        subCategory: formData.subCategory,
        description: formData.description,
        productType: "",
        trackStockNull: false,
        images: formData.images,
        tags: [],
        status: "active",
        seo: {
          title: "",
          metaKeywords: "",
          metaDescription: "",
          productUrl: "",
        },
        shipping: {
          isCost: false,
          price: 0,
          isLocationBased: false,
          ShippingLocation: [
            {
              name: "",
              price: 0,
            },
          ],
        },
        identifiers: {
          globalTradeItemNumber: 0,
          manufacturerNumber: 0,
          brandName: "",
          productUpc: 0,
          custom: [
            {
              name: "",
              value: "",
            },
          ],
        },
        options: [],
        // Create variants from variant images (bulk variant creation)
        // If variant images exist, use them; otherwise create one default variant
        variants:
          variantImages.length > 0
            ? variantImages.map((image, index) => ({
                price: formData.price || 0,
                compareAtPrice: 0,
                costPerItem: 0,
                stock: {
                  available: 0,
                  inHand: 0,
                },
                sku: "",
                weight: 1000,
                unit: "g",
                // Assign image to variant
                imageId: image.id,
                image: image.url || image.thumbnailUrl || "",
              }))
            : [
                {
                  price: formData.price || 0,
                  compareAtPrice: 0,
                  costPerItem: 0,
                  stock: {
                    available: 0,
                    inHand: 0,
                  },
                  sku: "",
                  weight: 1000,
                  unit: "g",
                },
              ],
      };

      console.log("📦 Product data being sent:", {
        category: newProduct.category,
        subCategory: newProduct.subCategory,
        title: newProduct.title,
        description: newProduct.description,
        productImagesCount: formData.images.length,
        variantImagesCount: variantImages.length,
        variantsCount: newProduct.variants.length,
      });
      if (variantImages.length > 0) {
        console.log(
          `✅ Creating ${newProduct.variants.length} variant${
            newProduct.variants.length !== 1 ? "s" : ""
          } automatically from ${variantImages.length} variant image${
            variantImages.length !== 1 ? "s" : ""
          }`
        );
      }

      try {
        const response = await fetch(
          "https://api.shopilam.com/api/v1/products",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify([newProduct]),
          }
        );
        const data = await response.json();
        console.log("Product added:", data);
        showNotification("✅ Product added successfully!", "success");
      } catch (error) {
        console.error("Error adding product:", error);
        showNotification("❌ Failed to add product", "error");
      }

      setFormData({
        title: "",
        description: "",
        price: "",
        images: [],
        category: "",
        subCategory: "",
      });

      // Reset variant images
      setVariantImages([]);
      setVariantImageStates({});

      // Reset category states
      setSelectedCategory("");
      setSelectedSubCategory("");
      setSubCategories([]);
    } catch (error) {
      console.error("Error adding product:", error);
      showNotification("❌ Failed to add product", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNotification = (message, type = "info") => {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${
        type === "success"
          ? "#25d366"
          : type === "error"
          ? "#ff4444"
          : "#2196f3"
      };
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  useEffect(() => {
    const targetClassGroups = [
      ["xyqdw3p", "x1im30kd", "xg8j3zb", "x1djpfga", "x1equxi"],
      ["x1c4vz4f", "x2lah0s", "xdl72j9", "xl1xv1r", "xh8yej3", "x5yr21d"],
      ["x1n2onr6", "xh8yej3", "x5yr21d"],
    ];

    console.log("targetClassGroups", targetClassGroups);
    let observer = null;

    // Helper: convert blob URL → base64
    const blobToBase64 = async (blobUrl) => {
      const response = await fetch(blobUrl);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result); // ✅ Keep full base64 string
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    const addButtonsToExistingElements = () => {
      targetClassGroups.forEach((classGroup) => {
        const selector = `.${classGroup[0]}`;
        const elements = document.querySelectorAll(selector);
        console.log("elements", elements);
        elements.forEach((el) => {
          const classList = Array.from(el.classList);

          if (
            classList.length === classGroup.length &&
            classGroup.every((cls) => classList.includes(cls))
          ) {
            if (el.querySelector(".my-extension-add-container")) return;

            // Create container for select and button
            // Position it at top-left to avoid covering the image
            const container = document.createElement("div");
            container.className = "my-extension-add-container";
            container.style.cssText = `
              display: flex;
              align-items: center;
              gap: 4px;
              position: absolute;
              top: 5px;
              left: 5px;
              z-index: 10000;
              pointer-events: auto;
              padding: 3px 5px;
              border-radius: 6px;
            `;

            // Create select dropdown
            const select = document.createElement("select");
            select.className = "my-extension-add-select";
            select.style.cssText = `
              background-color: white;
              color: #333;
              border: 1px solid #ddd;
              border-radius: 4px;
              padding: 3px 6px;
              font-size: 11px;
              cursor: pointer;
              outline: none;
              pointer-events: auto;
              position: relative;
              z-index: 10001;
              max-width: 120px;
              min-width: 100px;
            `;
            
            // Prevent select from interfering with image visibility
            select.addEventListener("mousedown", (e) => {
              e.stopPropagation();
            });
            
            select.addEventListener("click", (e) => {
              e.stopPropagation();
            });
            
            select.addEventListener("focus", (e) => {
              e.stopPropagation();
            });
            
            select.addEventListener("change", (e) => {
              e.stopPropagation();
            });
            select.innerHTML = `
              <option value="product">Add to Product</option>
              <option value="variant">Add to Variants</option>
            `;

            // Create button
            const button = document.createElement("button");
            button.textContent = "Add";
            button.className = "my-extension-add-btn";
            button.style.cssText = `
              background-color: #21c063;
              color: white;
              border: none;
              border-radius: 4px;
              padding: 3px 8px;
              font-size: 11px;
              cursor: pointer;
              white-space: nowrap;
            `;

            button.addEventListener("click", async (e) => {
              e.stopPropagation();
              const selectedOption = select.value;
              console.log("✅ Add button clicked for:", el, "Option:", selectedOption);

              // Set loading state
              const originalText = button.textContent;
              const originalCursor = button.style.cursor;
              const originalBgColor = button.style.backgroundColor;
              button.disabled = true;
              select.disabled = true;
              button.style.cursor = "not-allowed";
              button.style.backgroundColor = "#9ca3af";
              button.innerHTML = `
                <span style="display: inline-block; width: 12px; height: 12px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 6px; vertical-align: middle;"></span>
                Loading...
              `;

              // Add spinner animation if not already added
              if (!document.getElementById("button-spinner-style")) {
                const style = document.createElement("style");
                style.id = "button-spinner-style";
                style.textContent = `
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                  .my-extension-add-select {
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                  }
                  .my-extension-add-select option {
                    background: white;
                    padding: 8px;
                  }
                `;
                document.head.appendChild(style);
              }

              try {
                // Get all valid blob images inside this chat container
                const imgs = Array.from(el.querySelectorAll("img"))
                  .map((img) => img.src)
                  .filter((src) => src.startsWith("blob:"));

                if (imgs.length === 0) {
                  console.log("⚠️ No valid blob images found in this chat.");
                  // Restore button state
                  button.disabled = false;
                  select.disabled = false;
                  button.style.cursor = originalCursor;
                  button.style.backgroundColor = originalBgColor;
                  button.textContent = originalText;
                  return;
                }

                console.log("🖼️ Found blob images:", imgs);

                // Convert all blob URLs to base64
                const base64Images = await Promise.all(
                  imgs.map(async (src) => {
                    try {
                      const base64 = await blobToBase64(src);
                      return base64;
                    } catch (err) {
                      console.error("❌ Error converting to base64:", err);
                      return null;
                    }
                  })
                );

                // Build payloads
                const payloads = base64Images.filter(Boolean).map((base64) => ({
                  image_base64: base64,
                  module: "product",
                }));

                console.log("🚀 Payload ready to send:", payloads);

                // Example: Send to your backend (optional)
                try {
                  // Loop through all base64 payloads
                  for (const payload of payloads) {
                    try {
                      const response = await fetch(
                        "https://api.shopilam.com/api/v1/image/upload",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${getToken()}`,
                          },
                          body: JSON.stringify(payload),
                        }
                      );

                      const data = await response.json();

                      if (response.ok) {
                        console.log("✅ Uploaded:", data);
                        // Process the image based on selected option
                        if (selectedOption === "variant") {
                          await processVariantImageFromChat(data);
                        } else {
                          await processImageFromChat(data);
                        }
                      } else {
                        console.error("❌ Upload failed:", data);
                      }
                    } catch (err) {
                      console.error("❌ Error uploading image:", err);
                    }
                  }
                } catch (err) {
                  console.error("❌ Unexpected upload error:", err);
                }
              } finally {
                // Restore button state
                button.disabled = false;
                select.disabled = false;
                button.style.cursor = originalCursor;
                button.style.backgroundColor = originalBgColor;
                button.textContent = originalText;
              }
            });

            container.appendChild(select);
            container.appendChild(button);
            el.prepend(container);
          }
        });
      });
    };

    const removeAllAddButtons = () => {
      const existingButtons = document.querySelectorAll(
        ".my-extension-add-btn"
      );
      existingButtons.forEach((button) => button.remove());
    };

    observer = new MutationObserver(() => {
      addButtonsToExistingElements();
    });

    addButtonsToExistingElements();

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (observer) observer.disconnect();
      removeAllAddButtons();
    };
  }, []);

  useEffect(() => {
    return () => {
      const existingButtons = document.querySelectorAll(
        ".my-extension-add-btn"
      );
      existingButtons.forEach((button) => button.remove());
    };
  }, [onClose]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(imageStates).forEach((state) => {
        if (state.preview && state.preview.startsWith("blob:")) {
          URL.revokeObjectURL(state.preview);
        }
      });
      Object.values(variantImageStates).forEach((state) => {
        if (state.preview && state.preview.startsWith("blob:")) {
          URL.revokeObjectURL(state.preview);
        }
      });
    };
  }, [imageStates, variantImageStates]);

  console.log("formData", formData);
  console.log("imageStates", imageStates);

  return (
    <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
          color: theme === "dark" ? "#ffffff" : "#000000",
        }}
      >
      <div
        style={{
          padding: "20px",
          borderBottom: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: "600",
            color: theme === "dark" ? "#ffffff" : "#000000",
          }}
        >
          Add New Product
        </h2>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: theme === "dark" ? "#ffffff" : "#000000",
            padding: "4px",
          }}
        >
          ×
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        style={{ flex: 1, padding: "20px", overflowY: "auto" }}
      >
        {/* Title Input */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: theme === "dark" ? "#ffffff" : "#000000",
            }}
          >
            Product Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            placeholder="Enter product title"
            required
            style={{
              width: "100%",
              padding: "12px",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: theme === "dark" ? "#2a2a2a" : "#ffffff",
              color: theme === "dark" ? "#ffffff" : "#000000",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Description Textarea */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: theme === "dark" ? "#ffffff" : "#000000",
            }}
          >
            Product Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Enter product description"
            required
            rows={4}
            style={{
              width: "100%",
              padding: "12px",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: theme === "dark" ? "#2a2a2a" : "#ffffff",
              color: theme === "dark" ? "#ffffff" : "#000000",
              outline: "none",
              resize: "vertical",
              minHeight: "100px",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Price Input */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: theme === "dark" ? "#ffffff" : "#000000",
            }}
          >
            Price (Optional)
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => handleInputChange("price", Number(e.target.value))}
            placeholder="Enter price"
            min="0"
            step="0.01"
            style={{
              width: "100%",
              padding: "12px",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: theme === "dark" ? "#2a2a2a" : "#ffffff",
              color: theme === "dark" ? "#ffffff" : "#000000",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Category Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: theme === "dark" ? "#ffffff" : "#000000",
            }}
          >
            Category *
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "12px",
              border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: theme === "dark" ? "#2a2a2a" : "#ffffff",
              color: theme === "dark" ? "#ffffff" : "#000000",
              outline: "none",
              boxSizing: "border-box",
              cursor: "pointer",
            }}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory Selection */}
        {subCategories.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "500",
                color: theme === "dark" ? "#ffffff" : "#000000",
              }}
            >
              Subcategory
            </label>
            <select
              value={selectedSubCategory}
              onChange={(e) => handleSubCategoryChange(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                border: `1px solid ${theme === "dark" ? "#333" : "#e2e8f0"}`,
                borderRadius: "8px",
                fontSize: "14px",
                backgroundColor: theme === "dark" ? "#2a2a2a" : "#ffffff",
                color: theme === "dark" ? "#ffffff" : "#000000",
                outline: "none",
                boxSizing: "border-box",
                cursor: "pointer",
              }}
            >
              <option value="">Select a subcategory</option>
              {subCategories.map((subCategory, index) => (
                <option key={index} value={subCategory.name}>
                  {subCategory.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Image Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: theme === "dark" ? "#ffffff" : "#000000",
            }}
          >
            Product Images *
          </label>

          {/* File Input Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%",
              padding: "12px",
              border: `2px dashed ${theme === "dark" ? "#555" : "#ccc"}`,
              borderRadius: "8px",
              backgroundColor: theme === "dark" ? "#2a2a2a" : "#f8f9fa",
              color: theme === "dark" ? "#ffffff" : "#000000",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <span>📷</span>
            Select Images
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />

          {/* Selected Images Preview */}
          {formData.images.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                gap: "8px",
                marginTop: "12px",
              }}
            >
              {formData.images.map((image) => {
                const imageState = imageStates[image.id] || {
                  loading: false,
                  downloaded: false,
                  error: null,
                  preview: image.thumbnailUrl || image.url || null,
                };

                const previewSrc =
                  imageState.preview || image.thumbnailUrl || image.url || "";

                return (
                  <div
                    key={image.id}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: `1px solid ${
                        theme === "dark" ? "#333" : "#e2e8f0"
                      }`,
                      backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    {/* Loading State */}
                    {imageState.loading && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundColor: "rgba(0,0,0,0.45)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          color: "#fff",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            border: "3px solid rgba(255,255,255,0.4)",
                            borderTop: "3px solid #ffffff",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <span style={{ fontSize: "11px", fontWeight: 500 }}>
                          Uploading...
                        </span>
                      </div>
                    )}

                    {/* Image Preview */}
                    {imageState.preview && !imageState.loading && (
                      <img
                        src={previewSrc}
                        alt={image.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}

                    {/* Error State */}
                    {imageState.error && !imageState.loading && (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "24px",
                          color: "#ff4444",
                        }}
                        title={imageState.error}
                      >
                        ❌
                      </div>
                    )}

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(239, 68, 68, 0.9)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>

                    {/* Image Info for Chat Uploads */}
                    {image.source === "chat_upload" && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "0",
                          left: "0",
                          right: "0",
                          background:
                            "linear-gradient(transparent, rgba(0,0,0,0.7))",
                          color: "white",
                          padding: "8px 4px 4px",
                          fontSize: "10px",
                        }}
                      >
                        <div style={{ fontWeight: "600" }}>{image.name}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Variants in Bulk Section */}
        <div style={{ marginBottom: "20px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
              color: theme === "dark" ? "#ffffff" : "#000000",
            }}
          >
            Add Variants in Bulk
          </label>
          <p
            style={{
              fontSize: "12px",
              color: theme === "dark" ? "#aaa" : "#666",
              marginBottom: "12px",
            }}
          >
            Select multiple images to automatically create variants (one variant
            per image)
          </p>

          {/* Variant Count Info */}
          {variantImages.length > 0 && (
            <div
              style={{
                padding: "8px 12px",
                backgroundColor: theme === "dark" ? "#2a2a2a" : "#f0f9ff",
                border: `1px solid ${theme === "dark" ? "#333" : "#bae6fd"}`,
                borderRadius: "6px",
                marginBottom: "12px",
                fontSize: "13px",
                color: theme === "dark" ? "#a3d5ff" : "#0369a1",
              }}
            >
              📦 <strong>{variantImages.length}</strong> variant
              {variantImages.length !== 1 ? "s" : ""} will be created
            </div>
          )}

          {/* File Input Button for Variants */}
          <button
            type="button"
            onClick={() => variantFileInputRef.current?.click()}
            style={{
              width: "100%",
              padding: "12px",
              border: `2px dashed ${theme === "dark" ? "#555" : "#ccc"}`,
              borderRadius: "8px",
              backgroundColor: theme === "dark" ? "#2a2a2a" : "#f8f9fa",
              color: theme === "dark" ? "#ffffff" : "#000000",
              cursor: "pointer",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "12px",
            }}
          >
            <span>🖼️</span>
            Select Variant Images
          </button>

          <input
            ref={variantFileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleVariantImageSelect}
            style={{ display: "none" }}
          />

          {/* Variant Images Preview */}
          {variantImages.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                gap: "8px",
                marginTop: "12px",
              }}
            >
              {variantImages.map((image, imageIndex) => {
                const imageState = variantImageStates[image.id] || {
                  loading: false,
                  downloaded: false,
                  error: null,
                  preview: image.thumbnailUrl || image.url || null,
                };

                const previewSrc =
                  imageState.preview || image.thumbnailUrl || image.url || "";

                return (
                  <div
                    key={image.id}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: `1px solid ${
                        theme === "dark" ? "#333" : "#e2e8f0"
                      }`,
                      backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
                    }}
                  >
                    {/* Variant Number Badge */}
                    {!imageState.loading && (
                      <div
                        style={{
                          position: "absolute",
                          top: "4px",
                          left: "4px",
                          background: "rgba(16, 185, 129, 0.9)",
                          color: "white",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "10px",
                          fontWeight: "600",
                          zIndex: 10,
                        }}
                      >
                        Variant {imageIndex + 1}
                      </div>
                    )}

                    {/* Loading State */}
                    {imageState.loading && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundColor: "rgba(0,0,0,0.45)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          color: "#fff",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            border: "3px solid rgba(255,255,255,0.4)",
                            borderTop: "3px solid #ffffff",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                        <span style={{ fontSize: "11px", fontWeight: 500 }}>
                          Uploading...
                        </span>
                      </div>
                    )}

                    {/* Image Preview */}
                    {imageState.preview && !imageState.loading && (
                      <img
                        src={previewSrc}
                        alt={image.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}

                    {/* Error State */}
                    {imageState.error && !imageState.loading && (
                      <div
                        style={{
                          position: "absolute",
                          top: "50%",
                          left: "50%",
                          transform: "translate(-50%, -50%)",
                          fontSize: "24px",
                          color: "#ff4444",
                        }}
                        title={imageState.error}
                      >
                        ❌
                      </div>
                    )}

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => removeVariantImage(image.id)}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(239, 68, 68, 0.9)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: isSubmitting ? "#ccc" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {isSubmitting ? (
            <>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid white",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              Adding Product...
            </>
          ) : (
            <>Add Product</>
          )}
        </button>
      </form>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Hide number input spinners */
          input[type="number"]::-webkit-inner-spin-button,
          input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>
    </div>
  );
};

export default AddProductSidebar;
