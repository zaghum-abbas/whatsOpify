import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../../hooks/useTheme";
import { getToken } from "../../core/utils/helperFunctions";

const AddProductSidebar = ({ onClose, onProductAdd }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    images: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length > 0) {
      const newImages = imageFiles.map((file) => ({
        id: `${Date.now()}`,
        file: file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      }));

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    }
  };

  const removeImage = (imageId) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== imageId),
    }));
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
      // Create product object
      const newProduct = {
        id: `product_${Date.now()}`,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: formData.price ? parseFloat(formData.price) : 0,
        images: formData.images.map((img) => ({
          id: img.id,
          url: img.url,
          name: img.name,
          file: img.file,
        })),
        variants: [
          {
            id: `variant_${Date.now()}`,
            title: "Default",
            price: formData.price ? parseFloat(formData.price) : 0,
            imageId: formData.images[0]?.id || null,
          },
        ],
        status: "active",
        createdAt: new Date().toISOString(),
        source: "manual_add",
      };

      // Add to catalog
      if (onProductAdd) {
        await onProductAdd(newProduct);
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        price: "",
        images: [],
      });

      // Close sidebar
      if (onClose) {
        onClose();
      }

      // Show success message
      showNotification("✅ Product added successfully!", "success");
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
      ["x1n2onr6", "xh8yej3", "x5yr21d"],
    ];

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

        elements.forEach((el) => {
          const classList = Array.from(el.classList);

          if (
            classList.length === classGroup.length &&
            classGroup.every((cls) => classList.includes(cls))
          ) {
            if (el.querySelector(".my-extension-add-btn")) return;

            const button = document.createElement("button");
            button.textContent = "Add";
            button.className = "my-extension-add-btn";
            button.style.cssText = `
              background-color: #21c063;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 4px 8px;
              font-size: 12px;
              cursor: pointer;
              margin: 5px 0 5px 5px;
            `;

            button.addEventListener("click", async (e) => {
              e.stopPropagation();
              console.log("✅ Add button clicked for:", el);

              // Get all valid blob images inside this chat container
              const imgs = Array.from(el.querySelectorAll("img"))
                .map((img) => img.src)
                .filter((src) => src.startsWith("blob:"));

              if (imgs.length === 0) {
                console.log("⚠️ No valid blob images found in this chat.");
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

                      setFormData((prev) => ({
                        ...prev,
                        images: [...prev.images, { id: Date.now(), url: data }],
                      }));
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
            });

            el.prepend(button);
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

  console.log("formData", formData);

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
            onChange={(e) => handleInputChange("price", e.target.value)}
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
              {formData.images.map((image) => (
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
                  }}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      background: "rgba(0, 0, 0, 0.7)",
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
              ))}
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
        `}
      </style>
    </div>
  );
};

export default AddProductSidebar;
