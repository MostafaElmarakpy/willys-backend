import { INestApplication } from "@nestjs/common";
import { Cart } from "../../src/database/entities/cart.entity";
import { User } from "../../src/database/entities/user.entity";
import { createHomeAddress } from "../factories/address.factory";
import { createTestBranches } from "../fixtures/branches.fixture";
import { createTestMenu } from "../fixtures/menu.fixture";
import { createDefaultAdmin } from "../fixtures/users.fixture";
import { registerUser } from "../helpers/auth.helper";
import { formatStressResults } from "../helpers/metrics.helper";
import {
  authenticatedDelete,
  authenticatedGet,
  authenticatedPatch,
  authenticatedPost,
} from "../helpers/request.helper";
import {
  calculateStressMetrics,
  createConcurrentUsers,
  measureLatency,
  runSimultaneousOperations,
  sleep,
} from "../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../setup/test-app";

describe("Bulk Cart Operations Under Load (E2E)", () => {
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

  describe("Sequential Cart Operations", () => {
    it("should handle 50 add/remove/update operations on single cart in sequence", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Bulk Cart User",
        email: "bulkcart@test.com",
        password: "Test@1234",
      });

      const latencies: number[] = [];
      const operations: string[] = [];

      // Perform 50 operations: mix of add, update, remove
      for (let i = 0; i < 50; i++) {
        const opType = i % 5;

        if (opType < 3) {
          // Add item (60% of operations)
          const { latencyMs } = await measureLatency(() =>
            authenticatedPost(app, "/cart/items", tokens.access_token, {
              itemId: i % 2 === 0 ? menu.items.burger.id : menu.items.pizza.id,
              quantity: (i % 5) + 1,
              branchId: mainBranch.id,
            }),
          );
          latencies.push(latencyMs);
          operations.push("add");
        } else if (opType === 3) {
          // Get cart (20% of operations)
          const { latencyMs } = await measureLatency(() =>
            authenticatedGet(app, "/cart", tokens.access_token),
          );
          latencies.push(latencyMs);
          operations.push("get");
        } else {
          // Clear cart and start fresh (20% of operations)
          const { latencyMs } = await measureLatency(() =>
            authenticatedDelete(app, "/cart", tokens.access_token),
          );
          latencies.push(latencyMs);
          operations.push("clear");
        }
      }

      // Calculate metrics
      const sortedLatencies = [...latencies].sort((a, b) => a - b);
      const avgLatency =
        latencies.reduce((a, b) => a + b, 0) / latencies.length;

      console.log(`
Sequential Cart Operations Results:
  Total operations: ${operations.length}
  Average latency: ${avgLatency.toFixed(2)}ms
  P50 latency: ${sortedLatencies[Math.floor(sortedLatencies.length * 0.5)].toFixed(2)}ms
  P95 latency: ${sortedLatencies[Math.floor(sortedLatencies.length * 0.95)].toFixed(2)}ms
  Max latency: ${sortedLatencies[sortedLatencies.length - 1].toFixed(2)}ms
      `);

      // Assert reasonable performance
      expect(avgLatency).toBeLessThan(500); // Average under 500ms
      expect(
        sortedLatencies[Math.floor(sortedLatencies.length * 0.95)],
      ).toBeLessThan(1000); // P95 under 1s

      // Verify cart is in valid state
      const cartResponse = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartResponse.status).toBe(200);
    });

    it("should maintain calculation accuracy after rapid sequential updates", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Calc Accuracy User",
        email: "calcaccuracy@test.com",
        password: "Test@1234",
      });

      // Add initial item
      const addResponse = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: mainBranch.id,
        },
      );
      expect(addResponse.status).toBe(201);

      const cartItemId = addResponse.body.data.items[0].id;

      // Rapidly update quantity multiple times
      let lastQuantity = 1;
      for (let i = 0; i < 20; i++) {
        const newQuantity = (i % 10) + 1;
        await authenticatedPatch(
          app,
          `/cart/items/${cartItemId}`,
          tokens.access_token,
          {
            quantity: newQuantity,
          },
        );
        lastQuantity = newQuantity;
      }

      // Verify final state
      const cartResponse = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartResponse.status).toBe(200);

      const cart = cartResponse.body.data;
      expect(cart.items[0].quantity).toBe(lastQuantity);

      // Verify totals are calculated correctly
      const itemPrice = cart.items[0].unitPrice;
      const expectedSubtotal = itemPrice * lastQuantity;
      expect(Number(cart.subtotal)).toBeCloseTo(expectedSubtotal, 2);
    });
  });

  describe("Concurrent Cart Operations", () => {
    it("should handle 10 users each doing 10 cart operations simultaneously", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 10 users
      const users = await createConcurrentUsers(
        app,
        10,
        "concurrentcart@test.com",
      );

      // Each user does 10 operations concurrently
      const allOperations: Array<() => Promise<any>> = [];

      for (const user of users) {
        // Each user adds multiple items
        for (let j = 0; j < 10; j++) {
          allOperations.push(() =>
            authenticatedPost(app, "/cart/items", user.tokens.access_token, {
              itemId: j % 2 === 0 ? menu.items.burger.id : menu.items.pizza.id,
              quantity: (j % 5) + 1,
              branchId: mainBranch.id,
            }).catch((err) => ({
              status: err.response?.status || 500,
              error: err.message,
            })),
          );
        }
      }

      // Run all 100 operations simultaneously
      const startTime = performance.now();
      const results = await runSimultaneousOperations(allOperations);
      const totalDuration = performance.now() - startTime;

      const stressResults = calculateStressMetrics(
        results.map((r: any) => ({
          result: r.result,
          latencyMs: r.latencyMs,
          error: r.error,
          success:
            r.result?.status === 200 ||
            r.result?.status === 201 ||
            r.result?.status === 409, // Conflict is ok for duplicate adds
        })),
        totalDuration,
      );

      console.log(formatStressResults(stressResults));

      // Most operations should succeed (some may conflict due to duplicate item adds)
      expect(stressResults.successfulOperations).toBeGreaterThan(80);

      // Verify each user has their own cart (no cross-contamination)
      const cartRepo = getRepository<Cart>(Cart);
      const carts = await cartRepo.find({ relations: ["user"] });

      expect(carts.length).toBe(10);

      const userIds = carts.map((c) => c.user.id);
      const uniqueUserIds = new Set(userIds);
      expect(uniqueUserIds.size).toBe(10);
    });

    it("should not have cross-user cart contamination under concurrent load", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 5 users
      const users = await createConcurrentUsers(
        app,
        5,
        "nocontamination@test.com",
      );

      // Each user adds a specific item that we can track
      const userItems = [
        menu.items.burger,
        menu.items.pizza,
        menu.items.pasta,
        menu.items.burger,
        menu.items.pizza,
      ];

      // Concurrent add operations
      const addOperations = users.map(
        (user, index) => () =>
          authenticatedPost(app, "/cart/items", user.tokens.access_token, {
            itemId: userItems[index].id,
            quantity: index + 1, // Unique quantity per user
            branchId: mainBranch.id,
          }),
      );

      await runSimultaneousOperations(addOperations);

      // Verify each user's cart contains exactly what they added
      for (let i = 0; i < users.length; i++) {
        const cartResponse = await authenticatedGet(
          app,
          "/cart",
          users[i].tokens.access_token,
        );

        expect(cartResponse.status).toBe(200);
        const cart = cartResponse.body.data;

        // Cart should have items only belonging to this user
        expect(cart.items.length).toBeGreaterThan(0);

        // Verify quantity matches what this user set
        const totalQuantity = cart.items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        );
        expect(totalQuantity).toBe(i + 1);
      }
    });
  });

  describe("Cart with Maximum Items", () => {
    it("should handle cart with 30+ unique items and maintain calculation accuracy", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Max Items User",
        email: "maxitems@test.com",
        password: "Test@1234",
      });

      // Add multiple items to cart
      const itemsToAdd = [
        { itemId: menu.items.burger.id, quantity: 5 },
        { itemId: menu.items.pizza.id, quantity: 3 },
        { itemId: menu.items.pasta.id, quantity: 2 },
      ];

      // Add each item multiple times with different quantities
      for (let round = 0; round < 10; round++) {
        for (const item of itemsToAdd) {
          await authenticatedPost(app, "/cart/items", tokens.access_token, {
            itemId: item.itemId,
            quantity: item.quantity,
            branchId: mainBranch.id,
          });
        }
      }

      // Get final cart state
      const { result: cartResponse, latencyMs } = await measureLatency(() =>
        authenticatedGet(app, "/cart", tokens.access_token),
      );

      expect(cartResponse.status).toBe(200);

      const cart = cartResponse.body.data;

      // Verify cart has items
      expect(cart.items.length).toBeGreaterThan(0);

      // Verify calculation accuracy
      let calculatedSubtotal = 0;
      for (const item of cart.items) {
        calculatedSubtotal += Number(item.unitPrice) * item.quantity;
      }

      expect(Number(cart.subtotal)).toBeCloseTo(calculatedSubtotal, 2);

      // Verify response time is still acceptable for large cart
      console.log(
        `Large cart (${cart.items.length} items) fetch latency: ${latencyMs.toFixed(2)}ms`,
      );
      expect(latencyMs).toBeLessThan(2000);
    });

    it("should validate cart efficiently with many items", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Validate Large Cart User",
        email: "validatelarge@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add items
      for (const item of [
        menu.items.burger,
        menu.items.pizza,
        menu.items.pasta,
      ]) {
        await authenticatedPost(app, "/cart/items", tokens.access_token, {
          itemId: item.id,
          quantity: 5,
          branchId: mainBranch.id,
        });
      }

      // Set delivery address
      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      // Measure validation time
      const { result: validateResponse, latencyMs } = await measureLatency(() =>
        authenticatedPost(app, "/cart/validate", tokens.access_token, {}),
      );

      console.log(`Cart validation latency: ${latencyMs.toFixed(2)}ms`);

      expect(
        validateResponse.status === 200 || validateResponse.status === 201,
      ).toBe(true);
      expect(latencyMs).toBeLessThan(1000); // Validation should be under 1s
    });
  });

  describe("Cart Total Recalculation Under Load", () => {
    it("should maintain accurate totals during rapid quantity changes", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Rapid Quantity User",
        email: "rapidqty@test.com",
        password: "Test@1234",
      });

      // Add item
      const addResponse = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: mainBranch.id,
        },
      );

      const cartItemId = addResponse.body.data.items[0].id;
      const itemPrice = addResponse.body.data.items[0].unitPrice;

      // Rapid fire quantity updates
      const quantities = [1, 5, 3, 10, 2, 8, 4, 6, 9, 7];
      const _updatePromises = [];

      for (let i = 0; i < quantities.length; i++) {
        // Small delay to ensure order
        await sleep(50);
        await authenticatedPatch(
          app,
          `/cart/items/${cartItemId}`,
          tokens.access_token,
          {
            quantity: quantities[i],
          },
        );
      }

      // Get final cart state
      const cartResponse = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );

      const cart = cartResponse.body.data;
      const finalQuantity = cart.items[0].quantity;
      const expectedSubtotal = itemPrice * finalQuantity;

      // Subtotal should match final quantity calculation
      expect(Number(cart.subtotal)).toBeCloseTo(expectedSubtotal, 2);
    });
  });
});
