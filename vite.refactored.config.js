// Vite configuration for refactored extension
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist-refactored",
    rollupOptions: {
      input: {
        // Content script
        "content.js": resolve(__dirname, "src/content/refactoredIndex.jsx"),

        // Background script
        "background.js": resolve(
          __dirname,
          "src/background/refactoredBackground.js"
        ),

        // Core utilities
        "core/constants.js": resolve(__dirname, "src/core/constants/index.js"),
        "core/types.js": resolve(__dirname, "src/core/types/index.js"),
        "core/utils/domUtils.js": resolve(
          __dirname,
          "src/core/utils/domUtils.js"
        ),
        "core/utils/themeUtils.js": resolve(
          __dirname,
          "src/core/utils/themeUtils.js"
        ),
        "core/utils/performanceUtils.js": resolve(
          __dirname,
          "src/core/utils/performanceUtils.js"
        ),
        "core/state/stateManager.js": resolve(
          __dirname,
          "src/core/state/stateManager.js"
        ),
        "core/api/apiService.js": resolve(
          __dirname,
          "src/core/api/apiService.js"
        ),

        // Services
        "services/authService.js": resolve(
          __dirname,
          "src/services/authService.js"
        ),
        "services/dataService.js": resolve(
          __dirname,
          "src/services/dataService.js"
        ),

        // Hooks
        "hooks/useAuth.js": resolve(__dirname, "src/hooks/useAuth.js"),
        "hooks/useData.js": resolve(__dirname, "src/hooks/useData.js"),

        // UI Components
        "components/ui/Button.jsx": resolve(
          __dirname,
          "src/components/ui/Button.jsx"
        ),
        "components/ui/Card.jsx": resolve(
          __dirname,
          "src/components/ui/Card.jsx"
        ),
        "components/ui/LoadingSpinner.jsx": resolve(
          __dirname,
          "src/components/ui/LoadingSpinner.jsx"
        ),

        // Feature Components
        "components/features/OptimizedSidebarContent.jsx": resolve(
          __dirname,
          "src/components/features/OptimizedSidebarContent.jsx"
        ),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        format: "es",
      },
      external: ["chrome"],
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    sourcemap: false,
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "production"
    ),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@core": resolve(__dirname, "src/core"),
      "@components": resolve(__dirname, "src/components"),
      "@services": resolve(__dirname, "src/services"),
      "@hooks": resolve(__dirname, "src/hooks"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
  plugins: [
    {
      name: "chrome-extension",
      generateBundle(options, bundle) {
        // Generate manifest for refactored extension
        const manifest = {
          manifest_version: 3,
          name: "Whatsapify v2.0 (Refactored)",
          version: "2.0",
          description:
            "Refactored WhatsApp Web Extension with optimized architecture.",
          background: {
            service_worker: "background.js",
            type: "module",
          },
          permissions: ["storage", "scripting", "tabs"],
          host_permissions: [
            "https://web.whatsapp.com/",
            "https://api1.shopilam.com/*",
          ],
          content_scripts: [
            {
              matches: ["https://web.whatsapp.com/"],
              js: ["content.js"],
            },
          ],
          action: {
            default_title: "WhatsApp Extension (Refactored)",
          },
          web_accessible_resources: [
            {
              resources: [
                "assets/*",
                "node_modules/react/umd/react.production.min.js",
                "node_modules/react-dom/umd/react-dom.production.min.js",
                "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css",
              ],
              matches: ["https://web.whatsapp.com/*"],
            },
          ],
        };

        this.emitFile({
          type: "asset",
          fileName: "manifest.json",
          source: JSON.stringify(manifest, null, 2),
        });
      },
    },
  ],
});
