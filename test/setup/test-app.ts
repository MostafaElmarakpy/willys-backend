import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { useContainer } from "class-validator";
import { DataSource } from "typeorm";
import { AppModule } from "../../src/app.module";
import { ConfigService } from "../../src/config/config.service";

let testApp: INestApplication;
let testDataSource: DataSource;

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue({
      get: (key: string) => {
        const testConfig: Record<string, any> = {
          port: 8081,
          databaseHost: "localhost",
          databasePort: 5434,
          databaseUsername: "willys_test",
          databasePassword: "test_password",
          databaseName: "willys_test",
          databaseSync: false,
          jwtSecret: "test_secret_key_for_e2e_tests",
          jwtAccessExpiration: "1h",
          jwtRefreshExpiration: "7d",
          postgresUser: "willys_test",
          postgresPassword: "test_password",
          postgresDB: "willys_test",
          s3AccessKey: "test_access_key",
          s3SecretKey: "test_secret_key",
          s3BucketName: "test-bucket",
          s3Region: "us-east-1",
          roundCubeHost: "localhost",
          roundCubePort: 25,
          roundCubeUser: "test@test.com",
          roundCubePassword: "test_password",
          paymobApiKey: "test_api_key",
          paymobSecretKey: "test_secret_key",
          paymobPublicKey: "test_public_key",
          paymobCreditCardIntegrationId: "12345",
          paymobIframeId: "67890",
        };
        return testConfig[key];
      },
    })
    .compile();

  testApp = moduleFixture.createNestApplication();

  // Apply global pipes
  testApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Disable throttling for tests
  // Note: The app will still have throttle guards, but we can bypass them in tests

  // Enable DI for custom validators
  useContainer(testApp.select(AppModule), { fallbackOnErrors: true });

  await testApp.init();

  // Get database connection
  testDataSource = moduleFixture.get(DataSource);

  return testApp;
}

export async function closeTestApp(app: INestApplication): Promise<void> {
  if (app) {
    // Wait longer for pending async operations (event emitters, promises, etc.)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Close all database connections
    try {
      const dataSource = app.get(DataSource);
      if (dataSource?.isInitialized) {
        // Check for active connections before destroying
        try {
          const driver = dataSource.driver as any;
          if (driver.master) {
            // Log connection pool stats for debugging
            const poolSize = driver.master._clients?.length || 0;
            const idleCount = driver.master._idle?.length || 0;
            console.log(
              `Closing connection pool: ${poolSize} total, ${idleCount} idle`,
            );
          }
        } catch (_error) {
          // Ignore errors when checking pool stats
        }

        // Destroy the data source (drains pool)
        await dataSource.destroy();

        // Wait for connections to fully close
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.warn("Warning: Failed to destroy DataSource:", error);
    }

    // Close the NestJS application
    await app.close();

    // Additional wait to ensure all resources are released
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

export function getTestDataSource(): DataSource {
  if (!testDataSource) {
    throw new Error("Test app not initialized. Call createTestApp() first.");
  }
  return testDataSource;
}

/**
 * Clean all database tables while respecting foreign key constraints
 * Order matters: delete children before parents
 */
export async function cleanDatabase(): Promise<void> {
  const dataSource = getTestDataSource();

  // Verify DataSource is healthy before cleanup
  if (!dataSource.isInitialized) {
    throw new Error("DataSource is not initialized. Cannot clean database.");
  }

  // Wait for any pending operations to complete
  await new Promise((resolve) => setTimeout(resolve, 500));

  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();

  try {
    // Terminate only long-running idle transactions (10s instead of 5s)
    await queryRunner.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database() 
      AND pid <> pg_backend_pid()
      AND state = 'idle in transaction'
      AND state_change < current_timestamp - INTERVAL '10 seconds';
    `);

    // Wait a bit after terminating connections
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Temporarily disable foreign key checks for faster cleanup
    await queryRunner.query("SET session_replication_role = replica;");

    // Order matters: delete tables with foreign keys first, then their parents
    const tables = [
      // Log and transaction tables (no dependencies on others)
      "payment_transaction_logs",
      "order_status_logs",
      "discount_usage_logs",
      "notifications",

      // Junction/join tables
      "item_ingredients",
      "user_discounts",
      "item_discounts",

      // Order-related tables (depend on orders)
      "order_items",
      "refunds",

      // Orders (depend on many tables)
      "orders",

      // Cart-related tables
      "cart_items",
      "carts",

      // Payment tables
      "payment_methods",
      "payments",

      // Branch overrides (depend on branch and menu items)
      "branch_category_overrides",
      "branch_item_overrides",
      "branch_bundle_overrides",

      // Bundle-related tables
      "bundle_component_items",
      "bundle_components",
      "bundles",

      // Menu items (depend on categories and ingredients)
      "items",

      // Ingredients (depend on ingredient categories)
      "ingredients",
      "ingredient_categories",

      // Categories
      "categories",

      // Address and zone tables
      "user_addresses",
      "zones",

      // Branch tables
      "branches",

      // Discount tables
      "discounts",

      // Auth tokens (depend on users)
      "access_tokens",
      "reset_password_tokens",

      // User tables
      "users",

      // Role tables (no dependencies)
      "roles",
    ];

    for (const table of tables) {
      try {
        await queryRunner.query(`TRUNCATE TABLE "${table}" CASCADE;`);
      } catch (error: any) {
        // If table doesn't exist, continue (some tables might be optional)
        if (error.code !== "42P01") {
          console.warn(
            `Warning: Failed to truncate table ${table}:`,
            error.message,
          );
        }
      }
    }

    // Re-enable foreign key checks
    await queryRunner.query("SET session_replication_role = DEFAULT;");
  } catch (error) {
    console.error("Database cleanup failed:", error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Execute raw SQL query (useful for advanced test setup)
 */
export async function executeQuery(
  query: string,
  parameters?: any[],
): Promise<any> {
  const dataSource = getTestDataSource();
  return dataSource.query(query, parameters);
}

/**
 * Get a repository for a specific entity (useful for direct DB operations in tests)
 */
export function getRepository<T extends object>(entity: any) {
  const dataSource = getTestDataSource();
  return dataSource.getRepository<T>(entity);
}
