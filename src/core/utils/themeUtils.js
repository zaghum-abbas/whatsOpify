// Theme utility functions for the WhatsApp Web Extension
import { THEME } from "../constants/index.js";

/**
 * Get current theme based on WhatsApp Web appearance
 * @returns {Object} Theme object
 */
export function getCurrentTheme() {
  try {
    const body = document.body;
    const isDark =
      (body.classList.contains("web") && body.classList.contains("dark")) ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    return isDark ? THEME.DARK : THEME.LIGHT;
  } catch (error) {
    console.warn(
      "[THEME_UTILS] Error detecting theme, using light theme:",
      error
    );
    return THEME.LIGHT;
  }
}

/**
 * Get theme CSS variables
 * @param {Object} theme - Theme object
 * @returns {Object} CSS variables object
 */
export function getThemeVariables(theme = getCurrentTheme()) {
  return {
    "--theme-bg": theme.bg,
    "--theme-card": theme.card,
    "--theme-text": theme.text,
    "--theme-sub-text": theme.subText,
    "--theme-accent": theme.accent,
    "--theme-border": theme.border,
  };
}

/**
 * Apply theme to an element
 * @param {Element} element - Target element
 * @param {Object} theme - Theme object
 */
export function applyTheme(element, theme = getCurrentTheme()) {
  if (!element) return;

  const variables = getThemeVariables(theme);
  Object.entries(variables).forEach(([property, value]) => {
    element.style.setProperty(property, value);
  });
}

/**
 * Create theme-aware styles
 * @param {Object} styles - Style object with theme properties
 * @param {Object} theme - Theme object
 * @returns {Object} Processed styles
 */
export function createThemedStyles(styles, theme = getCurrentTheme()) {
  const processedStyles = { ...styles };

  // Replace theme placeholders with actual values
  Object.keys(processedStyles).forEach((key) => {
    const value = processedStyles[key];
    if (typeof value === "string" && value.startsWith("theme.")) {
      const themeKey = value.replace("theme.", "");
      processedStyles[key] = theme[themeKey] || value;
    }
  });

  return processedStyles;
}

/**
 * Watch for theme changes
 * @param {Function} callback - Callback function when theme changes
 * @returns {Function} Unsubscribe function
 */
export function watchThemeChanges(callback) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = (e) => {
    const newTheme = e.matches ? THEME.DARK : THEME.LIGHT;
    callback(newTheme);
  };

  mediaQuery.addEventListener("change", handleChange);

  // Also watch for WhatsApp's theme changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "class"
      ) {
        const newTheme = getCurrentTheme();
        callback(newTheme);
      }
    });
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // Return unsubscribe function
  return () => {
    mediaQuery.removeEventListener("change", handleChange);
    observer.disconnect();
  };
}

/**
 * Get theme-aware color
 * @param {string} colorKey - Color key (bg, card, text, etc.)
 * @param {Object} theme - Theme object
 * @returns {string} Color value
 */
export function getThemeColor(colorKey, theme = getCurrentTheme()) {
  return theme[colorKey] || colorKey;
}

/**
 * Create CSS string with theme variables
 * @param {Object} theme - Theme object
 * @returns {string} CSS string
 */
export function createThemeCSS(theme = getCurrentTheme()) {
  const variables = getThemeVariables(theme);
  const cssVars = Object.entries(variables)
    .map(([property, value]) => `${property}: ${value};`)
    .join("\n  ");

  return `:root {\n  ${cssVars}\n}`;
}

/**
 * Inject theme CSS into document
 * @param {Object} theme - Theme object
 * @param {string} id - Style element ID
 */
export function injectThemeCSS(
  theme = getCurrentTheme(),
  id = "whatsapp-extension-theme"
) {
  // Remove existing theme CSS
  const existingStyle = document.getElementById(id);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element
  const style = document.createElement("style");
  style.id = id;
  style.textContent = createThemeCSS(theme);

  document.head.appendChild(style);
}

/**
 * Get contrast color for text on background
 * @param {string} backgroundColor - Background color
 * @returns {string} Contrasting text color
 */
export function getContrastColor(backgroundColor) {
  // Convert hex to RGB
  const hex = backgroundColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Create theme-aware component styles
 * @param {Object} baseStyles - Base styles
 * @param {Object} theme - Theme object
 * @returns {Object} Theme-aware styles
 */
export function createComponentStyles(baseStyles, theme = getCurrentTheme()) {
  const themedStyles = {};

  Object.entries(baseStyles).forEach(([key, value]) => {
    if (typeof value === "object" && value !== null) {
      themedStyles[key] = createComponentStyles(value, theme);
    } else if (typeof value === "string" && value.startsWith("theme.")) {
      const themeKey = value.replace("theme.", "");
      themedStyles[key] = theme[themeKey] || value;
    } else {
      themedStyles[key] = value;
    }
  });

  return themedStyles;
}

export default {
  getCurrentTheme,
  getThemeVariables,
  applyTheme,
  createThemedStyles,
  watchThemeChanges,
  getThemeColor,
  createThemeCSS,
  injectThemeCSS,
  getContrastColor,
  createComponentStyles,
};

