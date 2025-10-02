// Reusable Button component
import React, { memo } from "react";
import { createThemedStyles } from "../../core/utils/themeUtils.js";

const Button = memo(
  ({
    children,
    onClick,
    variant = "primary",
    size = "medium",
    disabled = false,
    loading = false,
    className = "",
    style = {},
    ...props
  }) => {
    const baseStyles = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      borderRadius: "6px",
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: "500",
      transition: "all 0.2s ease",
      outline: "none",
      position: "relative",
      overflow: "hidden",
    };

    const variantStyles = {
      primary: {
        backgroundColor: "theme.accent",
        color: "#ffffff",
        "&:hover": {
          backgroundColor: "theme.accent",
          opacity: 0.9,
        },
      },
      secondary: {
        backgroundColor: "transparent",
        color: "theme.accent",
        border: "1px solid theme.accent",
        "&:hover": {
          backgroundColor: "theme.accent",
          color: "#ffffff",
        },
      },
      ghost: {
        backgroundColor: "transparent",
        color: "theme.text",
        "&:hover": {
          backgroundColor: "theme.border",
        },
      },
      danger: {
        backgroundColor: "#ef4444",
        color: "#ffffff",
        "&:hover": {
          backgroundColor: "#dc2626",
        },
      },
    };

    const sizeStyles = {
      small: {
        padding: "6px 12px",
        fontSize: "12px",
        height: "28px",
      },
      medium: {
        padding: "8px 16px",
        fontSize: "14px",
        height: "36px",
      },
      large: {
        padding: "12px 24px",
        fontSize: "16px",
        height: "44px",
      },
    };

    const disabledStyles = {
      opacity: 0.5,
      cursor: "not-allowed",
      "&:hover": {
        backgroundColor: "inherit",
        color: "inherit",
      },
    };

    const loadingStyles = {
      cursor: "wait",
      "&:hover": {
        backgroundColor: "inherit",
        color: "inherit",
      },
    };

    const combinedStyles = {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...(disabled ? disabledStyles : {}),
      ...(loading ? loadingStyles : {}),
      ...style,
    };

    const themedStyles = createThemedStyles(combinedStyles);

    return (
      <button
        className={`whatsapp-extension-button ${className}`}
        style={themedStyles}
        onClick={onClick}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "16px",
              height: "16px",
              border: "2px solid transparent",
              borderTop: "2px solid currentColor",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
        <span style={{ opacity: loading ? 0 : 1 }}>{children}</span>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            100% {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }
        `}</style>
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;

