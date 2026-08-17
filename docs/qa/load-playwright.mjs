import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";

const NESTED_CLI_SUFFIX = join("@playwright", "cli", "node_modules", "playwright");
const LAST_RESORT = "/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright";

function globalRoot() {
  try {
    return execFileSync("npm", ["root", "-g"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

export async function loadPlaywright() {
  const attempted = [];
  try {
    return await import("playwright");
  } catch (localError) {
    attempted.push(`local package: ${localError.message}`);
  }

  const require = createRequire(import.meta.url);
  const root = globalRoot();
  const candidates = root ? [join(root, "playwright"), join(root, NESTED_CLI_SUFFIX)] : [];
  candidates.push(LAST_RESORT);

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      attempted.push(`${candidate}: ${error.message}`);
    }
  }
  throw new Error(`Playwright is unavailable. Tried ${attempted.join(" | ")}`);
}
