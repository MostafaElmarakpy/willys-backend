import { INestApplication } from "@nestjs/common";
import { User } from "../../../src/database/entities/user.entity";
import { createHomeAddress } from "../../factories/address.factory";
import {
  assignDiscountToUsers,
  createLimitedDiscount,
} from "../../factories/discount.factory";
import { createTestBranches } from "../../fixtures/branches.fixture";
import { createTestMenu } from "../../fixtures/menu.fixture";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { registerUser } from "../../helpers/auth.helper";
import { authenticatedPost } from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../../setup/test-app";

describe("Multi-User Discount Race Conditions (E2E)", () => {
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

  describe("Limited Use Discount", () => {
    it("should handle discount with max usage limit", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create discount with usage limit of 2
      const discount = await createLimitedDiscount(admin, 2, {
        code: "LIMITED2",
        value: 20,
      });

      // Create 4 users
      const users = await Promise.all([
        registerUser(app, {
          fullName: "User 1",
          email: "user1@discount.com",
          password: "Test@1234",
        }),
        registerUser(app, {
          fullName: "User 2",
          email: "user2@discount.com",
          password: "Test@1234",
        }),
        registerUser(app, {
          fullName: "User 3",
          email: "user3@discount.com",
          password: "Test@1234",
        }),
        registerUser(app, {
          fullName: "User 4",
          email: "user4@discount.com",
          password: "Test@1234",
        }),
      ]);

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

      // All users add items and set addresses
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

        // Apply discount
        await authenticatedPost(
          app,
          "/cart/discount",
          users[i].tokens.access_token,
          {
            code: "LIMITED2",
          },
        );
      }

      // All try to checkout simultaneously
      const checkouts = await Promise.all(
        users.map((u) =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
          }).catch((err) => err.response || { status: 400 }),
        ),
      );

      // Only 2 should succeed (usage limit)
      const successfulCheckouts = checkouts.filter((c) => c.status === 201);
      expect(successfulCheckouts.length).toBe(2);
    });

    it("should handle per-user discount limits", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create discount with 1 use per user
      const discount = await createLimitedDiscount(admin, 10, {
        code: "ONEPERUSER",
        value: 15,
        usageLimitPerUser: 1,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Test User",
        email: "oneuser@discount.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      const address = await createHomeAddress(dbUser!);

      // First order with discount
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
        code: "ONEPERUSER",
      });

      const firstCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
        },
      );

      expect(firstCheckout.status).toBe(201);

      // Try to use same discount again
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

      const secondDiscountAttempt = await authenticatedPost(
        app,
        "/cart/discount",
        tokens.access_token,
        {
          code: "ONEPERUSER",
        },
      );

      // Should fail (already used once)
      expect(secondDiscountAttempt.status).toBe(400);
    }, 60000); // 60 second timeout

    it("should handle race condition on last discount usage", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create discount with only 1 use remaining (simulate race condition)
      const discount = await createLimitedDiscount(admin, 1, {
        code: "LASTONE",
        value: 25,
      });

      // Create 3 users sequentially to avoid connection pool exhaustion
      // The race condition test happens during discount application, not registration
      const users: Awaited<ReturnType<typeof registerUser>>[] = [];
      for (let i = 0; i < 3; i++) {
        const user = await registerUser(app, {
          fullName: `Racer ${i + 1}`,
          email: `racer${i + 1}@discount.com`,
          password: "Test@1234",
        });
        users.push(user);
      }

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

      // All users prepare their orders
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

      // All try to apply discount simultaneously
      const discountApplications = await Promise.all(
        users.map((u) =>
          authenticatedPost(app, "/cart/discount", u.tokens.access_token, {
            code: "LASTONE",
          }).catch((err) => err.response || { status: 400 }),
        ),
      );

      // Only one should get the discount (POST returns 201 for created)
      const successfulApplications = discountApplications.filter(
        (r) => r.status === 201 || r.status === 200,
      );
      expect(successfulApplications.length).toBe(1);

      // Verify 2 were rejected
      const rejectedApplications = discountApplications.filter(
        (r) => r.status === 400,
      );
      expect(rejectedApplications.length).toBe(2);
    });
  });
});
