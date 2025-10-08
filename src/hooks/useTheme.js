import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState();

  useEffect(() => {
    const updateTheme = () => {
      const current =
        JSON.parse(localStorage.getItem("theme")) === "dark" ? "dark" : "light";
      console.log("@@current", current);
      setTheme(current);
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, {
      attributes: true,
      childList: false,
      subtree: false,
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}
