// Reusable Loading Spinner component
import React, { memo } from "react";
import { createThemedStyles } from "../../core/utils/themeUtils.js";

const LoadingSpinner = memo(
  ({
    size = "medium",
    color = "theme.accent",
    text = "",
    className = "",
    style = {},
    ...props
  }) => {
    const sizeStyles = {
      small: {
        width: "16px",
        height: "16px",
        borderWidth: "2px",
      },
      medium: {
        width: "24px",
        height: "24px",
        borderWidth: "3px",
      },
      large: {
        width: "32px",
        height: "32px",
        borderWidth: "4px",
      },
    };

    const spinnerStyles = {
      display: "inline-block",
      borderRadius: "50%",
      border: `${sizeStyles[size].borderWidth} solid transparent`,
      borderTop: `${sizeStyles[size].borderWidth} solid ${color}`,
      animation: "spin 1s linear infinite",
      ...sizeStyles[size],
    };

    const containerStyles = {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    };

    const textStyles = {
      fontSize: "14px",
      color: "theme.text",
    };

    const combinedSpinnerStyles = createThemedStyles(spinnerStyles);
    const combinedTextStyles = createThemedStyles(textStyles);

    return (
      <div
        className={`whatsapp-extension-loading ${className}`}
        style={{ ...containerStyles, ...style }}
        {...props}
      >
        <div style={combinedSpinnerStyles} />
        {text && <span style={combinedTextStyles}>{text}</span>}
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export default LoadingSpinner;

