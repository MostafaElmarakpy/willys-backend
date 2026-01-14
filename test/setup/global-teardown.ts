import { execSync } from "node:child_process";
import * as path from "node:path";

export default async function globalTeardown() {
  console.log("\n🧹 Cleaning up E2E test environment...\n");

  try {
    // Stop and remove test database container
    console.log("🛑 Stopping test database container...");
    const projectRoot = path.resolve(__dirname, "../..");
    execSync("yarn test:db:down", {
      cwd: projectRoot,
      stdio: "inherit",
    });

    console.log("✅ E2E test environment cleaned up!\n");
  } catch (error) {
    console.error("❌ Failed to clean up test environment:", error);
    // Don't throw - we want tests to complete even if cleanup fails
  }
}
