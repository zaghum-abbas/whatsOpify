import fs from "fs-extra";
import path from "path";
import archiver from "archiver";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function packageExtension() {
  console.log("📦 Packaging extension for distribution...");

  const distDir = path.join(__dirname, "dist");
  const packageDir = path.join(__dirname, "package");
  const zipPath = path.join(__dirname, "Whatshopify-extension.zip");

  // Clean and create package directory
  await fs.remove(packageDir);
  await fs.ensureDir(packageDir);

  // Copy all files from dist to package
  await fs.copy(distDir, packageDir);

  // Verify critical files exist
  const criticalFiles = [
    "manifest.json",
    "background.js",
    "content.js",
    "icons/icon16.png",
    "icons/icon19.png",
    "icons/icon24.png",
    "icons/icon32.png",
    "icons/icon38.png",
    "icons/icon48.png",
    "icons/icon128.png",
  ];

  for (const file of criticalFiles) {
    const filePath = path.join(packageDir, file);
    if (!(await fs.pathExists(filePath))) {
      console.error(`❌ Missing critical file: ${file}`);
      process.exit(1);
    }
  }

  console.log("✅ All critical files verified");

  // Create zip file
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`✅ Extension packaged successfully: ${zipPath}`);
    console.log(`📊 Package size: ${archive.pointer()} bytes`);
  });

  archive.on("error", (err) => {
    console.error("❌ Error creating package:", err);
    process.exit(1);
  });

  archive.pipe(output);
  archive.directory(packageDir, false);
  await archive.finalize();
}

packageExtension().catch(console.error);
