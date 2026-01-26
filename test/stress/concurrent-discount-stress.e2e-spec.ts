import { INestApplication } from "@nestjs/common";
import { Discount } from "../../src/database/entities/discount.entity";
import { DiscountUsageLog } from "../../src/database/entities/discount-usage-log.entity";
import { User } from "../../src/database/entities/user.entity";
import { UserDiscount } from "../../src/database/entities/user-discount.entity";
import { createHomeAddress } from "../factories/address.factory";
import {
  assignDiscountToUsers,
  createLimitedDiscount,
} from "../factories/discount.factory";
import { createTestBranches } from "../fixtures/branches.fixture";
import { createTestMenu } from "../fixtures/menu.fixture";
import { createDefaultAdmin } from "../fixtures/users.fixture";
import { registerUser } from "../helpers/auth.helper";
import { formatStressResults } from "../helpers/metrics.helper";
import { authenticatedPost } from "../helpers/request.helper";
import {
  calculateStressMetrics,
  createConcurrentUsers,
  generateIdempotencyKey,
  runSimultaneousOperations,
} from "../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../setup/test-app";

describe("Concurrent Discount Application Stress Test (E2E)", () => {
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

  describe("Global Usage Limit Stress", () => {
    it("should correctly limit discount usage when 20 users race for 5 uses", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create discount with max 5 total uses
      const discount = await createLimitedDiscount(admin, 5, {
        code: "RACE5",
        value: 25,
      });

      // Create 20 users
      const users = await createConcurrentUsers(app, 20, "race5@test.com");

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      // Assign discount to all users
      await assignDiscountToUsers(
        discount,
        dbUsers.filter((u) => u !== null) as User[],
        admin,
      );

      // Create addresses
      const addresses = await Promise.all(
        dbUsers.map((u) => createHomeAddress(u!)),
      );

      // All users add items, set addresses, and apply discount
      for (let i = 0; i < users.length; i++) {
        await authenticatedPost(
          app,
          "/cart/items",
          users[i].tokens.access_token,
          {
            itemId: menu.items.burger.id,
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

        await authenticatedPost(
          app,
          "/cart/discount",
          users[i].tokens.access_token,
          {
            code: "RACE5",
          },
        );
      }

      // All 20 users try to checkout simultaneously
      const startTime = performance.now();
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`race5-${u.user.id}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
            body: err.response?.body || { error: err.message },
          })),
      );

      const results = await runSimultaneousOperations(checkoutOperations);
      const totalDuration = performance.now() - startTime;

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

      // Count successful checkouts with discount applied
      const successfulWithDiscount = results.filter(
        (r: any) =>
          r.result?.status === 201 &&
          r.result?.body?.data?.order?.appliedDiscounts?.length > 0,
      );

      // Exactly 5 should succeed with the discount
      expect(successfulWithDiscount.length).toBe(5);

      // Verify database state
      const discountRepo = getRepository<Discount>(Discount);
      const updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      expect(updatedDiscount?.currentUsageCount).toBe(5);

      // Verify usage logs
      const usageLogRepo = getRepository<DiscountUsageLog>(DiscountUsageLog);
      const usageLogs = await usageLogRepo.find({
        where: { discount: { id: discount.id } },
      });

      expect(usageLogs.length).toBe(5);
    });

    it("should handle 30 users racing for 10 uses without overcounting", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 10, {
        code: "RACE10",
        value: 15,
      });

      const users = await createConcurrentUsers(app, 30, "race10@test.com");

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      await assignDiscountToUsers(
        discount,
        dbUsers.filter((u) => u !== null) as User[],
        admin,
      );

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

        await authenticatedPost(
          app,
          "/cart/discount",
          users[i].tokens.access_token,
          {
            code: "RACE10",
          },
        );
      }

      // Simultaneous checkout
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`race10-${u.user.id}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
            body: err.response?.body || { error: err.message },
          })),
      );

      await runSimultaneousOperations(checkoutOperations);

      // Verify exactly 10 successful discount uses
      const discountRepo = getRepository<Discount>(Discount);
      const updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      expect(updatedDiscount?.currentUsageCount).toBe(10);

      // Verify no overcounting in logs
      const usageLogRepo = getRepository<DiscountUsageLog>(DiscountUsageLog);
      const usageLogs = await usageLogRepo.find({
        where: { discount: { id: discount.id } },
      });

      expect(usageLogs.length).toBe(10);
    });
  });

  describe("Per-User Limit Stress", () => {
    it("should enforce per-user limit of 1 when same user makes 5 concurrent requests", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Discount with high global limit but 1 per user
      const discount = await createLimitedDiscount(admin, 100, {
        code: "ONEPERUSER",
        value: 20,
        usageLimitPerUser: 1,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Single User Test",
        email: "singleuser@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      const address = await createHomeAddress(dbUser!);

      // Add items to cart 5 times (creating 5 "carts" worth of items)
      // In practice, only one cart per user, so items accumulate
      for (let i = 0; i < 5; i++) {
        await authenticatedPost(app, "/cart/items", tokens.access_token, {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: mainBranch.id,
        });
      }

      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "ONEPERUSER",
      });

      // Same user tries 5 concurrent checkouts (different idempotency keys)
      const checkoutOperations = Array.from(
        { length: 5 },
        (_, i) => () =>
          authenticatedPost(app, "/orders/checkout", tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`oneperuser-${i}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
            body: err.response?.body || { error: err.message },
          })),
      );

      const results = await runSimultaneousOperations(checkoutOperations);

      // Only 1 should succeed with discount (first one to get through)
      const _successfulCheckouts = results.filter(
        (r: any) => r.result?.status === 201,
      );

      // At most 1 order should be created (idempotency might prevent some)
      // The key assertion is that the discount is only used once
      const discountRepo = getRepository<Discount>(Discount);
      const _updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      // Per-user limit should be respected
      const userDiscountRepo = getRepository<UserDiscount>(UserDiscount);
      const userDiscount = await userDiscountRepo.findOne({
        where: { user: { id: dbUser!.id }, discount: { id: discount.id } },
      });

      expect(userDiscount?.usageCount).toBeLessThanOrEqual(1);
    });
  });

  describe("Multiple Limited Discounts", () => {
    it("should handle concurrent application of multiple limited discounts", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 3 different discounts with different limits
      const discount1 = await createLimitedDiscount(admin, 3, {
        code: "MULTI1",
        value: 10,
      });
      const discount2 = await createLimitedDiscount(admin, 5, {
        code: "MULTI2",
        value: 15,
      });
      const discount3 = await createLimitedDiscount(admin, 2, {
        code: "MULTI3",
        value: 20,
      });

      // Create 15 users, each will try one of the discounts
      const users = await createConcurrentUsers(app, 15, "multi@test.com");

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      // Assign discounts (5 users per discount)
      await assignDiscountToUsers(
        discount1,
        dbUsers.slice(0, 5).filter((u) => u !== null) as User[],
        admin,
      );
      await assignDiscountToUsers(
        discount2,
        dbUsers.slice(5, 10).filter((u) => u !== null) as User[],
        admin,
      );
      await assignDiscountToUsers(
        discount3,
        dbUsers.slice(10, 15).filter((u) => u !== null) as User[],
        admin,
      );

      const addresses = await Promise.all(
        dbUsers.map((u) => createHomeAddress(u!)),
      );

      // Prepare carts with appropriate discounts
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

        // Apply appropriate discount
        let code: string;
        if (i < 5) code = "MULTI1";
        else if (i < 10) code = "MULTI2";
        else code = "MULTI3";

        await authenticatedPost(
          app,
          "/cart/discount",
          users[i].tokens.access_token,
          { code },
        );
      }

      // Concurrent checkout
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`multi-${u.user.id}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
            body: err.response?.body || { error: err.message },
          })),
      );

      await runSimultaneousOperations(checkoutOperations);

      // Verify each discount respects its limit
      const discountRepo = getRepository<Discount>(Discount);

      const [d1, d2, d3] = await Promise.all([
        discountRepo.findOne({ where: { id: discount1.id } }),
        discountRepo.findOne({ where: { id: discount2.id } }),
        discountRepo.findOne({ where: { id: discount3.id } }),
      ]);

      expect(d1?.currentUsageCount).toBe(3); // limit was 3, 5 users tried
      expect(d2?.currentUsageCount).toBe(5); // limit was 5, 5 users tried
      expect(d3?.currentUsageCount).toBe(2); // limit was 2, 5 users tried
    });
  });

  describe("Usage Count Accuracy", () => {
    it("should maintain accurate currentUsageCount under extreme concurrency", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // High-limit discount to allow many users through
      const discount = await createLimitedDiscount(admin, 25, {
        code: "ACCURACY",
        value: 5,
      });

      // Create exactly 25 users
      const users = await createConcurrentUsers(app, 25, "accuracy@test.com");

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      await assignDiscountToUsers(
        discount,
        dbUsers.filter((u) => u !== null) as User[],
        admin,
      );

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

        await authenticatedPost(
          app,
          "/cart/discount",
          users[i].tokens.access_token,
          {
            code: "ACCURACY",
          },
        );
      }

      // All checkout simultaneously
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`accuracy-${u.user.id}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
            body: err.response?.body || { error: err.message },
          })),
      );

      const results = await runSimultaneousOperations(checkoutOperations);

      // Count successful checkouts
      const successfulCheckouts = results.filter(
        (r: any) => r.result?.status === 201,
      );

      // Verify database counts match
      const discountRepo = getRepository<Discount>(Discount);
      const updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      const usageLogRepo = getRepository<DiscountUsageLog>(DiscountUsageLog);
      const usageLogs = await usageLogRepo.find({
        where: { discount: { id: discount.id } },
      });

      // All 25 should succeed since limit is 25
      expect(successfulCheckouts.length).toBe(25);

      // currentUsageCount should match successful uses
      expect(updatedDiscount?.currentUsageCount).toBe(25);

      // Usage logs should match count
      expect(usageLogs.length).toBe(25);

      console.log(`
Accuracy Test Results:
  Users attempted: 25
  Successful checkouts: ${successfulCheckouts.length}
  currentUsageCount: ${updatedDiscount?.currentUsageCount}
  Usage logs count: ${usageLogs.length}
      `);
    });
  });
});
