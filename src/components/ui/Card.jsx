// Reusable Card component
import React, { memo } from "react";
import { createThemedStyles } from "../../core/utils/themeUtils.js";

const Card = memo(
  ({
    children,
    title,
    subtitle,
    actions,
    className = "",
    style = {},
    padding = "medium",
    shadow = true,
    hover = false,
    ...props
  }) => {
    const baseStyles = {
      backgroundColor: "theme.card",
      border: "1px solid theme.border",
      borderRadius: "8px",
      overflow: "hidden",
      transition: "all 0.2s ease",
    };

    const paddingStyles = {
      none: { padding: 0 },
      small: { padding: "8px" },
      medium: { padding: "16px" },
      large: { padding: "24px" },
    };

    const shadowStyles = shadow
      ? {
          boxShadow:
            "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
        }
      : {};

    const hoverStyles = hover
      ? {
          "&:hover": {
            boxShadow:
              "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
            transform: "translateY(-1px)",
          },
        }
      : {};

    const combinedStyles = {
      ...baseStyles,
      ...paddingStyles[padding],
      ...shadowStyles,
      ...hoverStyles,
      ...style,
    };

    const themedStyles = createThemedStyles(combinedStyles);

    return (
      <div
        className={`whatsapp-extension-card ${className}`}
        style={themedStyles}
        {...props}
      >
        {(title || subtitle || actions) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: title || subtitle ? "12px" : 0,
              paddingBottom: title || subtitle ? "12px" : 0,
              borderBottom:
                title || subtitle ? "1px solid theme.border" : "none",
            }}
          >
            <div>
              {title && (
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "theme.text",
                  }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  style={{
                    margin: title ? "4px 0 0 0" : 0,
                    fontSize: "14px",
                    color: "theme.subText",
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div style={{ display: "flex", gap: "8px" }}>{actions}</div>
            )}
          </div>
        )}
        <div>{children}</div>
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;

