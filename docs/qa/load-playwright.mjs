import { createRequire } from "node:module";

const NESTED_GLOBAL_PLAYWRIGHT = "/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright";

export async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (localError) {
    try {
      const require = createRequire(import.meta.url);
      return require(NESTED_GLOBAL_PLAYWRIGHT);
    } catch (globalError) {
      throw new Error(
        "Playwright is unavailable. Tried the local package and " + NESTED_GLOBAL_PLAYWRIGHT +
        `. Local error: ${localError.message}. Global error: ${globalError.message}`,
      );
    }
  }
}
