import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const publicDir = join(rootDir, "dist", "public");

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(join(publicDir, "frontend"), { recursive: true });
mkdirSync(join(publicDir, "src"), { recursive: true });

const indexHtml = readFileSync(join(rootDir, "frontend", "index.html"), "utf8")
  .replace("../dist/frontend/app.js", "./frontend/app.js");

writeFileSync(join(publicDir, "index.html"), indexHtml);
cpSync(join(rootDir, "frontend", "styles.css"), join(publicDir, "styles.css"));
cpSync(join(rootDir, "dist", "frontend", "app.js"), join(publicDir, "frontend", "app.js"));
cpSync(
  join(rootDir, "dist", "src", "orderController.js"),
  join(publicDir, "src", "orderController.js")
);
