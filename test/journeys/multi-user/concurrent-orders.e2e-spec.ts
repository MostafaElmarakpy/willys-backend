import { INestApplication } from "@nestjs/common";
import { User } from "../../../src/database/entities/user.entity";
import { createHomeAddress } from "../../factories/address.factory";
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

describe("Multi-User Concurrent Orders (E2E)", () => {
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

  describe("Concurrent Order Placement", () => {
    it("should handle 3 users placing orders simultaneously", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 3 customers
      const customer1Data = {
        fullName: "Customer 1",
        email: "customer1@concurrent.com",
        password: "Test@1234",
      };

      const customer2Data = {
        fullName: "Customer 2",
        email: "customer2@concurrent.com",
        password: "Test@1234",
      };

      const customer3Data = {
        fullName: "Customer 3",
        email: "customer3@concurrent.com",
        password: "Test@1234",
      };

      const [
        { user: user1, tokens: tokens1 },
        { user: user2, tokens: tokens2 },
        { user: user3, tokens: tokens3 },
      ] = await Promise.all([
        registerUser(app, customer1Data),
        registerUser(app, customer2Data),
        registerUser(app, customer3Data),
      ]);

      // Create addresses for all users
      const userRepo = getRepository<User>(User);
      const [dbUser1, dbUser2, dbUser3] = await Promise.all([
        userRepo.findOne({ where: { id: user1.id } }),
        userRepo.findOne({ where: { id: user2.id } }),
        userRepo.findOne({ where: { id: user3.id } }),
      ]);

      const [address1, address2, address3] = await Promise.all([
        createHomeAddress(dbUser1!),
        createHomeAddress(dbUser2!),
        createHomeAddress(dbUser3!),
      ]);

      // All users add items to cart
      await Promise.all([
        authenticatedPost(app, "/cart/items", tokens1.access_token, {
          itemId: menu.items.burger.id,
          quantity: 2,
          branchId: mainBranch.id,
        }),
        authenticatedPost(app, "/cart/items", tokens2.access_token, {
          itemId: menu.items.pizza.id,
          quantity: 1,
          branchId: mainBranch.id,
        }),
        authenticatedPost(app, "/cart/items", tokens3.access_token, {
          itemId: menu.items.pasta.id,
          quantity: 1,
          branchId: mainBranch.id,
        }),
      ]);

      // Set addresses
      await Promise.all([
        authenticatedPost(app, "/cart/delivery-address", tokens1.access_token, {
          deliveryAddressId: address1.id,
        }),
        authenticatedPost(app, "/cart/delivery-address", tokens2.access_token, {
          deliveryAddressId: address2.id,
        }),
        authenticatedPost(app, "/cart/delivery-address", tokens3.access_token, {
          deliveryAddressId: address3.id,
        }),
      ]);

      // All users checkout simultaneously
      const checkoutPromises = [
        authenticatedPost(app, "/orders/checkout", tokens1.access_token, {
          paymentType: "CASH",
          idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
        }),
        authenticatedPost(app, "/orders/checkout", tokens2.access_token, {
          paymentType: "CASH",
          idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
        }),
        authenticatedPost(app, "/orders/checkout", tokens3.access_token, {
          paymentType: "CASH",
          idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
        }),
      ];

      const results = await Promise.all(checkoutPromises);

      // All orders should succeed
      expect(results[0].status).toBe(201);
      expect(results[1].status).toBe(201);
      expect(results[2].status).toBe(201);

      // All orders should have unique order numbers
      const orderNumbers = results.map((r) => r.body.data.order.orderNumber);
      const uniqueOrderNumbers = new Set(orderNumbers);
      expect(uniqueOrderNumbers.size).toBe(3);
    });

    it("should handle users ordering from different branches", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch, secondBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const [
        { user: user1, tokens: tokens1 },
        { user: user2, tokens: tokens2 },
      ] = await Promise.all([
        registerUser(app, {
          fullName: "User 1",
          email: "user1@branches.com",
          password: "Test@1234",
        }),
        registerUser(app, {
          fullName: "User 2",
          email: "user2@branches.com",
          password: "Test@1234",
        }),
      ]);

      const userRepo = getRepository<User>(User);
      const [dbUser1, dbUser2] = await Promise.all([
        userRepo.findOne({ where: { id: user1.id } }),
        userRepo.findOne({ where: { id: user2.id } }),
      ]);

      const [address1, address2] = await Promise.all([
        createHomeAddress(dbUser1!),
        createHomeAddress(dbUser2!),
      ]);

      // User 1 orders from main branch, User 2 from second branch
      await Promise.all([
        authenticatedPost(app, "/cart/items", tokens1.access_token, {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: mainBranch.id,
        }),
        authenticatedPost(app, "/cart/items", tokens2.access_token, {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: secondBranch.id,
        }),
      ]);

      await Promise.all([
        authenticatedPost(app, "/cart/delivery-address", tokens1.access_token, {
          deliveryAddressId: address1.id,
        }),
        authenticatedPost(app, "/cart/delivery-address", tokens2.access_token, {
          deliveryAddressId: address2.id,
        }),
      ]);

      const [result1, result2] = await Promise.all([
        authenticatedPost(app, "/orders/checkout", tokens1.access_token, {
          paymentType: "CASH",
          idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
        }),
        authenticatedPost(app, "/orders/checkout", tokens2.access_token, {
          paymentType: "CASH",
          idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
        }),
      ]);

      expect(result1.status).toBe(201);
      expect(result2.status).toBe(201);
      expect(result1.body.data.order.branchId).toBe(mainBranch.id);
      expect(result2.body.data.order.branchId).toBe(secondBranch.id);
    });

    it("should handle multiple users ordering the same item", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 5 users sequentially to avoid connection pool exhaustion
      // The concurrent test happens during checkout, not registration
      const users: Awaited<ReturnType<typeof registerUser>>[] = [];
      for (let i = 0; i < 5; i++) {
        const user = await registerUser(app, {
          fullName: `User ${i + 1}`,
          email: `user${i + 1}@sameitem.com`,
          password: "Test@1234",
        });
        users.push(user);
      }

      const userRepo = getRepository<User>(User);
      const dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      const addresses = await Promise.all(
        dbUsers.map((u) => createHomeAddress(u!)),
      );

      // All add the same item
      await Promise.all(
        users.map((u, _i) =>
          authenticatedPost(app, "/cart/items", u.tokens.access_token, {
            itemId: menu.items.burger.id,
            quantity: 2,
            branchId: mainBranch.id,
          }),
        ),
      );

      // Set addresses
      await Promise.all(
        users.map((u, i) =>
          authenticatedPost(
            app,
            "/cart/delivery-address",
            u.tokens.access_token,
            {
              deliveryAddressId: addresses[i].id,
            },
          ),
        ),
      );

      // All checkout
      const checkouts = await Promise.all(
        users.map((u) =>
          authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
            paymentType: "CASH",
            idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
          }),
        ),
      );

      // All should succeed
      checkouts.forEach((checkout) => {
        expect(checkout.status).toBe(201);
      });
    });
  });
});
