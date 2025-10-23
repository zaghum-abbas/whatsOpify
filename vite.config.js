import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content/index.jsx"),
      },
      output: {
        entryFileNames: "content.js",
        assetFileNames: (assetInfo) => {
          // Keep icons in their original structure
          if (assetInfo.name && assetInfo.name.includes("icon")) {
            return "icons/[name][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
    // Ensure all assets are copied properly
    copyPublicDir: true,
  },
  closeBundle() {
    console.log("✅ Copying public assets to dist/");
    fs.copySync("public", "dist");

    // Ensure icons directory exists and is properly copied
    const iconsDir = resolve(__dirname, "dist/icons");
    if (!fs.existsSync(iconsDir)) {
      fs.ensureDirSync(iconsDir);
      fs.copySync(resolve(__dirname, "public/icons"), iconsDir);
    }

    console.log("✅ Extension build complete with proper icon handling");
  },
});
