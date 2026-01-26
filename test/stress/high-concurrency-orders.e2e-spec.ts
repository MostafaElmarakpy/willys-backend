import { INestApplication } from "@nestjs/common";
import { Order } from "../../src/database/entities/order.entity";
import { User } from "../../src/database/entities/user.entity";
import { createHomeAddress } from "../factories/address.factory";
import { createTestBranches } from "../fixtures/branches.fixture";
import { createTestMenu } from "../fixtures/menu.fixture";
import { createDefaultAdmin } from "../fixtures/users.fixture";
import {
  createMetricsCollector,
  formatStressResults,
  getConnectionPoolStats,
} from "../helpers/metrics.helper";
import { authenticatedPost } from "../helpers/request.helper";
import {
  calculateStressMetrics,
  createConcurrentUsers,
  generateIdempotencyKey,
  runSimultaneousOperations,
  runStaggeredOperations,
} from "../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../setup/test-app";

describe("High Concurrency Order Placement (E2E)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("Simultaneous Order Placement", () => {
    it("should handle 10 users placing orders simultaneously without data corruption", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 10 users
      const users = await createConcurrentUsers(app, 10, "concurrent@test.com");

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      // Create addresses for all users
      const addresses = await Promise.all(
        dbUsers.map((u) => createHomeAddress(u!)),
      );

      // All users add items and set addresses
      for (let i = 0; i < users.length; i++) {
        await authenticatedPost(
          app,
          "/cart/items",
          users[i].tokens.access_token,
          {
            itemId: menu.items.burger.id,
            quantity: i + 1, // Different quantities for verification
            branchId: mainBranch.id,
          },
        );

        await authenticatedPost(
          app,
          "/cart/delivery-address",
          users[i].tokens.access_token,
          {
            deliveryAddressId: addresses[i].id,
          },
        );
      }

      // Collect metrics during operation
      const metricsCollector = createMetricsCollector();
      await metricsCollector.capture();

      // All users checkout simultaneously
      const startTime = performance.now();
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`user-${u.user.id}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
            body: err.response?.body || { error: err.message },
          })),
      );

      const results = await runSimultaneousOperations(checkoutOperations);
      const totalDuration = performance.now() - startTime;

      await metricsCollector.capture();

      // Calculate and log metrics
      const stressResults = calculateStressMetrics(
        results.map((r: any) => ({
          result: r.result,
          latencyMs: r.latencyMs,
          error: r.error,
          success: r.result?.status === 201,
        })),
        totalDuration,
      );

      console.log(formatStressResults(stressResults));

      // Assertions
      const successfulCheckouts = results.filter(
        (r: any) => r.result?.status === 201,
      );
      expect(successfulCheckouts.length).toBe(10);

      // Verify all orders have unique order numbers
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find();
      expect(orders.length).toBe(10);

      const orderNumbers = orders.map((o) => o.orderNumber);
      const uniqueOrderNumbers = new Set(orderNumbers);
      expect(uniqueOrderNumbers.size).toBe(10);

      // Verify no orphaned records (all orders have order items)
      for (const order of orders) {
        const orderWithItems = await orderRepo.findOne({
          where: { id: order.id },
          relations: ["items"],
        });
        expect(orderWithItems?.items.length).toBeGreaterThan(0);
      }
    });

    it("should handle 20 users with staggered start (100ms intervals)", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 20 users
      const users = await createConcurrentUsers(app, 20, "staggered@test.com");

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      // Create addresses for all users
      const addresses = await Promise.all(
        dbUsers.map((u) => createHomeAddress(u!)),
      );

      // Prepare all carts
      for (let i = 0; i < users.length; i++) {
        await authenticatedPost(
          app,
          "/cart/items",
          users[i].tokens.access_token,
          {
            itemId: menu.items.burger.id,
            quantity: 1,
            branchId: mainBranch.id,
          },
        );

        await authenticatedPost(
          app,
          "/cart/delivery-address",
          users[i].tokens.access_token,
          {
            deliveryAddressId: addresses[i].id,
          },
        );
      }

      // Staggered checkout with 100ms intervals
      const startTime = performance.now();
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`staggered-${u.user.id}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
            body: err.response?.body || { error: err.message },
          })),
      );

      const results = await runStaggeredOperations(checkoutOperations, 100);
      const totalDuration = performance.now() - startTime;

      // Calculate metrics
      const stressResults = calculateStressMetrics(
        results.map((r: any) => ({
          result: r.result,
          latencyMs: r.latencyMs,
          error: r.error,
          success: r.result?.status === 201,
        })),
        totalDuration,
      );

      console.log(formatStressResults(stressResults));

      // All 20 should succeed
      const successfulCheckouts = results.filter(
        (r: any) => r.result?.status === 201,
      );
      expect(successfulCheckouts.length).toBe(20);

      // Verify latency is reasonable (p95 < 2000ms)
      expect(stressResults.p95LatencyMs).toBeLessThan(2000);
    });

    it("should generate unique order numbers even under heavy concurrent load", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 15 users for burst test
      const users = await createConcurrentUsers(app, 15, "burst@test.com");

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      // Create addresses
      const addresses = await Promise.all(
        dbUsers.map((u) => createHomeAddress(u!)),
      );

      // Prepare all carts
      for (let i = 0; i < users.length; i++) {
        await authenticatedPost(
          app,
          "/cart/items",
          users[i].tokens.access_token,
          {
            itemId: menu.items.pizza.id,
            quantity: 2,
            branchId: mainBranch.id,
          },
        );

        await authenticatedPost(
          app,
          "/cart/delivery-address",
          users[i].tokens.access_token,
          {
            deliveryAddressId: addresses[i].id,
          },
        );
      }

      // Burst: all checkout at exactly the same time
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`burst-${u.user.id}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
            body: err.response?.body || { error: err.message },
          })),
      );

      const results = await runSimultaneousOperations(checkoutOperations);

      // All should succeed
      const successfulCheckouts = results.filter(
        (r: any) => r.result?.status === 201,
      );
      expect(successfulCheckouts.length).toBe(15);

      // Verify order numbers are unique
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find();
      const orderNumbers = orders.map((o) => o.orderNumber);
      const uniqueOrderNumbers = new Set(orderNumbers);

      expect(uniqueOrderNumbers.size).toBe(15);
    });

    it("should maintain database integrity under concurrent order placement", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 8 users
      const users = await createConcurrentUsers(app, 8, "integrity@test.com");

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      const addresses = await Promise.all(
        dbUsers.map((u) => createHomeAddress(u!)),
      );

      // Each user orders different quantity
      const expectedTotals: number[] = [];
      for (let i = 0; i < users.length; i++) {
        const quantity = i + 1;

        await authenticatedPost(
          app,
          "/cart/items",
          users[i].tokens.access_token,
          {
            itemId: menu.items.burger.id,
            quantity,
            branchId: mainBranch.id,
          },
        );

        await authenticatedPost(
          app,
          "/cart/delivery-address",
          users[i].tokens.access_token,
          {
            deliveryAddressId: addresses[i].id,
          },
        );

        // Track expected quantity for verification
        expectedTotals.push(quantity);
      }

      // Concurrent checkout
      const checkoutOperations = users.map(
        (u, index) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`integrity-${u.user.id}`),
          })
            .then((res) => ({ ...res, userIndex: index }))
            .catch((err) => ({
              status: err.response?.status || 500,
              body: err.response?.body || { error: err.message },
              userIndex: index,
            })),
      );

      await runSimultaneousOperations(checkoutOperations);

      // Verify database integrity
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find({
        relations: ["orderItems", "user"],
      });

      expect(orders.length).toBe(8);

      // Each order should have correct number of items matching user's quantity
      for (const order of orders) {
        const userIndex = dbUsers.findIndex((u) => u?.id === order.user.id);
        expect(userIndex).toBeGreaterThanOrEqual(0);

        const expectedQuantity = expectedTotals[userIndex];
        const actualQuantity = order.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

        expect(actualQuantity).toBe(expectedQuantity);
      }

      // Verify no orphaned order items (all have valid order reference)
      const orphanedItemsQuery = await getRepository<Order>(Order).query(`
        SELECT oi.* FROM order_items oi
        LEFT JOIN orders o ON oi."orderId" = o.id
        WHERE o.id IS NULL
      `);
      expect(orphanedItemsQuery.length).toBe(0);
    });
  });

  describe("Connection Pool Behavior", () => {
    it("should not exhaust connection pool under normal concurrent load", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const users = await createConcurrentUsers(app, 5, "pool@test.com");

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      const addresses = await Promise.all(
        dbUsers.map((u) => createHomeAddress(u!)),
      );

      for (let i = 0; i < users.length; i++) {
        await authenticatedPost(
          app,
          "/cart/items",
          users[i].tokens.access_token,
          {
            itemId: menu.items.burger.id,
            quantity: 1,
            branchId: mainBranch.id,
          },
        );

        await authenticatedPost(
          app,
          "/cart/delivery-address",
          users[i].tokens.access_token,
          {
            deliveryAddressId: addresses[i].id,
          },
        );
      }

      // Check connection pool before
      const beforeStats = await getConnectionPoolStats();

      // Concurrent checkouts
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`pool-${u.user.id}`),
          }),
      );

      await runSimultaneousOperations(checkoutOperations);

      // Check connection pool after
      const afterStats = await getConnectionPoolStats();

      // Connection pool should not be exhausted
      expect(afterStats.totalConnections).toBeLessThan(
        afterStats.maxConnections,
      );

      // Connections should return to reasonable level
      // (may take a moment for connections to be released)
      await new Promise((resolve) => setTimeout(resolve, 500));
      const finalStats = await getConnectionPoolStats();

      console.log("Connection pool stats:", {
        before: beforeStats,
        after: afterStats,
        final: finalStats,
      });

      expect(finalStats.totalConnections).toBeLessThanOrEqual(
        beforeStats.totalConnections + 5,
      );
    });
  });
});
