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
import { authenticatedPost } from "../helpers/request.helper";
import {
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

describe("Discount Usage Count Accuracy (E2E)", () => {
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

  describe("Global Usage Count Accuracy", () => {
    it("should accurately track currentUsageCount after sequential uses", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "SEQUENTIAL",
        value: 10,
      });

      // Create 5 users who will use discount sequentially
      const userPromises = Array.from({ length: 5 }, (_, i) =>
        registerUser(app, {
          fullName: `Sequential User ${i + 1}`,
          email: `sequential${i + 1}@test.com`,
          password: "Test@1234",
        }),
      );
      const users = await Promise.all(userPromises);

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

      // Sequential checkouts
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
            code: "SEQUENTIAL",
          },
        );

        await authenticatedPost(
          app,
          "/orders/checkout",
          users[i].tokens.access_token,
          {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`sequential-${i}`),
          },
        );
      }

      // Verify count
      const discountRepo = getRepository<Discount>(Discount);
      const updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      expect(updatedDiscount!.currentUsageCount).toBe(5);
    });

    it("should accurately track currentUsageCount under concurrent usage", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 15, {
        code: "CONCURRENT15",
        value: 10,
      });

      // Create 15 users
      const users = await createConcurrentUsers(
        app,
        15,
        "concurrent15@test.com",
      );

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
            code: "CONCURRENT15",
          },
        );
      }

      // Concurrent checkout
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`concurrent15-${u.user.id}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
          })),
      );

      const results = await runSimultaneousOperations(checkoutOperations);

      // Count successful checkouts
      const successfulCheckouts = results.filter(
        (r: any) => r.result?.status === 201,
      ).length;

      // Verify database count matches successful checkouts
      const discountRepo = getRepository<Discount>(Discount);
      const updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      expect(updatedDiscount!.currentUsageCount).toBe(successfulCheckouts);
      expect(successfulCheckouts).toBe(15); // All should succeed since limit is 15
    });

    it("should not overcount when limit is reached during concurrent requests", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Limit of 5, but 10 users will try
      const discount = await createLimitedDiscount(admin, 5, {
        code: "NOOVERCOUNT",
        value: 15,
      });

      const users = await createConcurrentUsers(
        app,
        10,
        "noovercount@test.com",
      );

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

      // Prepare carts
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
            code: "NOOVERCOUNT",
          },
        );
      }

      // Concurrent checkout
      const checkoutOperations = users.map(
        (u) => () =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`noovercount-${u.user.id}`),
          }).catch((err) => ({
            status: err.response?.status || 500,
          })),
      );

      await runSimultaneousOperations(checkoutOperations);

      // Verify count is exactly 5 (the limit), not more
      const discountRepo = getRepository<Discount>(Discount);
      const updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      expect(updatedDiscount!.currentUsageCount).toBe(5);
      expect(updatedDiscount!.currentUsageCount).toBeLessThanOrEqual(
        discount.maxUsageTotal!,
      );
    });
  });

  describe("Per-User Usage Count Accuracy", () => {
    it("should accurately track per-user usageCount", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Discount with high per-user limit for testing
      const discount = await createLimitedDiscount(admin, 100, {
        code: "PERUSERTRACK",
        value: 5,
        usageLimitPerUser: 5,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Per User Track",
        email: "perusertrack@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      // Use discount 3 times sequentially
      for (let i = 0; i < 3; i++) {
        await authenticatedPost(app, "/cart/items", tokens.access_token, {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: mainBranch.id,
        });

        await authenticatedPost(
          app,
          "/cart/delivery-address",
          tokens.access_token,
          {
            deliveryAddressId: address.id,
          },
        );

        await authenticatedPost(app, "/cart/discount", tokens.access_token, {
          code: "PERUSERTRACK",
        });

        await authenticatedPost(app, "/orders/checkout", tokens.access_token, {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey(`perusertrack-${i}`),
        });
      }

      // Verify per-user count
      const userDiscountRepo = getRepository<UserDiscount>(UserDiscount);
      const userDiscount = await userDiscountRepo.findOne({
        where: { user: { id: dbUser!.id }, discount: { id: discount.id } },
      });

      expect(userDiscount!.usageCount).toBe(3);
    });

    it("should accurately track usageCount for multiple users independently", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "MULTIUSER",
        value: 10,
        usageLimitPerUser: 3,
      });

      // Create 3 users who will each use discount different number of times
      const userPromises = Array.from({ length: 3 }, (_, i) =>
        registerUser(app, {
          fullName: `Multi User ${i + 1}`,
          email: `multiuser${i + 1}@test.com`,
          password: "Test@1234",
        }),
      );
      const users = await Promise.all(userPromises);

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

      // User 0: uses 1 time, User 1: uses 2 times, User 2: uses 3 times
      const usageCounts = [1, 2, 3];

      for (let userIndex = 0; userIndex < users.length; userIndex++) {
        for (let j = 0; j < usageCounts[userIndex]; j++) {
          await authenticatedPost(
            app,
            "/cart/items",
            users[userIndex].tokens.access_token,
            {
              itemId: menu.items.burger.id,
              quantity: 1,
              branchId: mainBranch.id,
            },
          );

          await authenticatedPost(
            app,
            "/cart/delivery-address",
            users[userIndex].tokens.access_token,
            {
              deliveryAddressId: addresses[userIndex].id,
            },
          );

          await authenticatedPost(
            app,
            "/cart/discount",
            users[userIndex].tokens.access_token,
            {
              code: "MULTIUSER",
            },
          );

          await authenticatedPost(
            app,
            "/orders/checkout",
            users[userIndex].tokens.access_token,
            {
              paymentType: "CASH",
              idempotencyKey: generateIdempotencyKey(
                `multiuser-${userIndex}-${j}`,
              ),
            },
          );
        }
      }

      // Verify each user's count
      const userDiscountRepo = getRepository<UserDiscount>(UserDiscount);

      for (let i = 0; i < dbUsers.length; i++) {
        const userDiscount = await userDiscountRepo.findOne({
          where: {
            user: { id: dbUsers[i]!.id },
            discount: { id: discount.id },
          },
        });

        expect(userDiscount!.usageCount).toBe(usageCounts[i]);
      }

      // Verify global count is sum of all
      const discountRepo = getRepository<Discount>(Discount);
      const updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      const totalUsage = usageCounts.reduce((a, b) => a + b, 0);
      expect(updatedDiscount!.currentUsageCount).toBe(totalUsage);
    });
  });

  describe("Usage Logs Consistency", () => {
    it("should have usage log count matching currentUsageCount", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 20, {
        code: "LOGCOUNT",
        value: 10,
      });

      const users = await createConcurrentUsers(app, 8, "logcount@test.com");

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

      // Prepare and checkout
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
            code: "LOGCOUNT",
          },
        );

        await authenticatedPost(
          app,
          "/orders/checkout",
          users[i].tokens.access_token,
          {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`logcount-${i}`),
          },
        );
      }

      // Verify log count equals currentUsageCount
      const discountRepo = getRepository<Discount>(Discount);
      const updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      const usageLogRepo = getRepository<DiscountUsageLog>(DiscountUsageLog);
      const usageLogs = await usageLogRepo.find({
        where: { discount: { id: discount.id } },
      });

      expect(usageLogs.length).toBe(updatedDiscount!.currentUsageCount);
      expect(usageLogs.length).toBe(8);
    });

    it("should have unique users in usage logs for user-targeted discount", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 10, {
        code: "UNIQUELOGS",
        value: 10,
        usageLimitPerUser: 1, // Each user can only use once
      });

      const users = await createConcurrentUsers(app, 5, "uniquelogs@test.com");

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

      // Each user uses discount once
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
            code: "UNIQUELOGS",
          },
        );

        await authenticatedPost(
          app,
          "/orders/checkout",
          users[i].tokens.access_token,
          {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey(`uniquelogs-${i}`),
          },
        );
      }

      // Verify usage logs have unique users
      const usageLogRepo = getRepository<DiscountUsageLog>(DiscountUsageLog);
      const usageLogs = await usageLogRepo.find({
        where: { discount: { id: discount.id } },
        relations: ["user"],
      });

      const userIds = usageLogs.map((log) => log.user.id);
      const uniqueUserIds = new Set(userIds);

      expect(uniqueUserIds.size).toBe(5);
      expect(usageLogs.length).toBe(5);
    });

    it("should record correct discount amount in usage logs", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 10, {
        code: "LOGAMOUNT",
        value: 25, // 25% discount
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Log Amount User",
        email: "logamount@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      // Add item and checkout
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 2,
        branchId: mainBranch.id,
      });

      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "LOGAMOUNT",
      });

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("logamount"),
        },
      );

      const orderDiscountAmount =
        checkoutResponse.body.data.order.discountAmount;

      // Verify usage log has correct amount
      const usageLogRepo = getRepository<DiscountUsageLog>(DiscountUsageLog);
      const usageLogs = await usageLogRepo.find({
        where: { discount: { id: discount.id } },
      });

      expect(usageLogs.length).toBe(1);
      expect(Number(usageLogs[0].discountAmount)).toBeCloseTo(
        Number(orderDiscountAmount),
        2,
      );
    });
  });
});
