import { execSync } from "node:child_process";
import * as path from "node:path";

export default async function globalSetup() {
  console.log("\n🚀 Starting E2E test environment setup...\n");

  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.DATABASE_HOST = "localhost";
  process.env.DATABASE_PORT = "5434";
  process.env.DATABASE_NAME = "willys_test";
  process.env.DATABASE_USERNAME = "willys_test";
  process.env.DATABASE_PASSWORD = "test_password";
  process.env.DATABASE_SYNCHRONIZE = "false";
  process.env.JWT_SECRET = "test_secret_key_for_e2e_tests";
  process.env.JWT_ACCESS_TOKEN_EXPIRES_IN = "1h";
  process.env.JWT_REFRESH_TOKEN_EXPIRES_IN = "7d";
  process.env.PORT = "8081";

  // Mock external service credentials
  process.env.POSTGRES_DB = "willys_test";
  process.env.POSTGRES_USER = "willys_test";
  process.env.POSTGRES_PASSWORD = "test_password";
  process.env.S3_ACCESS_KEY_ID = "test_access_key";
  process.env.S3_SECRET_KEY_ID = "test_secret_key";
  process.env.S3_BUCKET_NAME = "test-bucket";
  process.env.S3_REGION = "us-east-1";
  process.env.ROUND_CUBE_HOST = "localhost";
  process.env.ROUND_CUBE_PORT = "25";
  process.env.ROUND_CUBE_USER = "test@test.com";
  process.env.ROUND_CUBE_PASSWORD = "test_password";
  process.env.PAYMOB_API_KEY = "test_api_key";
  process.env.PAYMOB_SECRET_KEY = "test_secret_key";
  process.env.PAYMOB_PUBLIC_KEY = "test_public_key";
  process.env.PAYMOB_CREDIT_CARD_INTEGRATION_ID = "12345";
  process.env.PAYMOB_IFRAME_ID = "67890";

  try {
    // Start test database container
    console.log("📦 Starting test database container...");
    const projectRoot = path.resolve(__dirname, "../..");
    execSync("yarn test:db:up", {
      cwd: projectRoot,
      stdio: "inherit",
    });

    // Wait for database to be ready
    console.log("⏳ Waiting for database to be ready...");
    await waitForDatabase();

    // Build the project to ensure migrations are compiled
    console.log("🔨 Building project...");
    execSync("yarn build", {
      cwd: projectRoot,
      stdio: "inherit",
    });

    // Run migrations
    console.log("🗄️  Running migrations...");
    const _migrationsPath = path.resolve(
      projectRoot,
      "dist/database/migrations",
    );
    execSync(
      `npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d dist/database/typeorm.config.js`,
      {
        cwd: projectRoot,
        stdio: "inherit",
        env: { ...process.env },
      },
    );

    console.log("✅ E2E test environment setup complete!\n");
  } catch (error) {
    console.error("❌ Failed to set up test environment:", error);
    // Clean up on failure
    try {
      execSync("yarn test:db:down", {
        cwd: path.resolve(__dirname, "../.."),
        stdio: "inherit",
      });
    } catch (cleanupError) {
      console.error("Failed to clean up after error:", cleanupError);
    }
    throw error;
  }
}

async function waitForDatabase(
  maxAttempts = 30,
  delayMs = 1000,
): Promise<void> {
  const { Client } = require("pg");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = new Client({
        host: "localhost",
        port: 5434,
        database: "willys_test",
        user: "willys_test",
        password: "test_password",
      });

      await client.connect();
      await client.query("SELECT 1");
      await client.end();

      console.log("✅ Database is ready!");
      return;
    } catch (_error) {
      if (attempt === maxAttempts) {
        throw new Error(`Database not ready after ${maxAttempts} attempts`);
      }
      console.log(
        `   Attempt ${attempt}/${maxAttempts} - Database not ready yet...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
