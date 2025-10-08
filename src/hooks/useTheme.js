import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState();

  useEffect(() => {
    const updateTheme = () => {
      // Check WhatsApp's theme from multiple sources
      const isDark =
        document.body.classList.contains("dark") ||
        document.querySelector('html[data-theme="dark"]') ||
        JSON.parse(localStorage.getItem("theme")) === "dark" ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      const current = isDark ? "dark" : "light";
      console.log("@@current theme:", current);
      setTheme(current);
    };

    updateTheme();

    // Observe body for class changes
    const bodyObserver = new MutationObserver(updateTheme);
    bodyObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Observe HTML for data-theme changes
    const htmlObserver = new MutationObserver(updateTheme);
    htmlObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });

    // Listen for localStorage changes
    window.addEventListener("storage", updateTheme);

    return () => {
      bodyObserver.disconnect();
      htmlObserver.disconnect();
      window.removeEventListener("storage", updateTheme);
    };
  }, []);

  return theme;
}

// Helper function to get theme colors
export function getThemeColors(theme) {
  const isDark = theme === "dark";

  return {
    isDark,
    // Background colors
    bg: isDark ? "#18191a" : "#f7f7f7",
    card: isDark ? "#23272a" : "#fff",
    sidebar: isDark ? "#18191a" : "#f7f7f7",
    text: isDark ? "#e4e6eb" : "#222",
    subText: isDark ? "#b0b3b8" : "#555",
    accent: "#00bfae",
    accentHover: isDark ? "#00d4ba" : "#009688",
    border: isDark ? "#333" : "#e2e8f0",
    shadow: isDark ? "0 2px 8px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.07)",
    sidebarShadow: isDark
      ? "-2px 0 5px rgba(0,0,0,0.5)"
      : "-2px 0 5px rgba(0,0,0,0.1)",
  };
}
