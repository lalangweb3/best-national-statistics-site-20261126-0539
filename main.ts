import * as fs from "node:fs";
import * as path from "node:path";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const APP_DIR = path.join(import.meta.dirname, "app");
const SCREENSHOTS_DIR = path.join(import.meta.dirname, "screenshots");

function copyDirRecursive(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function main(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  copyDirRecursive(APP_DIR, path.join(OUTPUT_DIR, "app"));
  copyDirRecursive(SCREENSHOTS_DIR, path.join(OUTPUT_DIR, "screenshots"));
  console.log(`Copied app/ and screenshots/ to ${OUTPUT_DIR}`);

  const dossier = buildDossier({ app: APP_DIR, screenshots: SCREENSHOTS_DIR });
  const dossierText =
    typeof dossier === "string" ? dossier : JSON.stringify(dossier, null, 2);
  fs.writeFileSync(path.join(OUTPUT_DIR, "dossier.json"), dossierText);
  console.log(`Wrote dossier.json to ${path.join(OUTPUT_DIR, "dossier.json")}`);
  console.log("Submission ready.");
}

main();
