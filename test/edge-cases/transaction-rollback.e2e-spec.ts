import { INestApplication } from "@nestjs/common";
import { Discount } from "../../src/database/entities/discount.entity";
import { Order } from "../../src/database/entities/order.entity";
import { User } from "../../src/database/entities/user.entity";
import { createHomeAddress } from "../factories/address.factory";
import {
  assignDiscountToUsers,
  createLimitedDiscount,
} from "../factories/discount.factory";
import { createTestBranches } from "../fixtures/branches.fixture";
import { createTestMenu } from "../fixtures/menu.fixture";
import { createDefaultAdmin } from "../fixtures/users.fixture";
import { registerUser } from "../helpers/auth.helper";
import { authenticatedGet, authenticatedPost } from "../helpers/request.helper";
import { generateIdempotencyKey } from "../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  executeQuery,
  getRepository,
} from "../setup/test-app";

describe("Transaction Rollback Scenarios (E2E)", () => {
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

  describe("Order Creation Rollback", () => {
    it("should preserve cart when checkout fails due to invalid data", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Rollback Test User",
        email: "rollback@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add item to cart
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

      // Verify cart has items before failed checkout
      const cartBefore = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartBefore.body.data.items.length).toBe(1);
      const itemsBefore = cartBefore.body.data.items;

      // Attempt checkout without idempotency key (should fail validation)
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          // Missing idempotencyKey - should fail validation
        },
      );

      // Should fail
      expect(checkoutResponse.status).toBe(400);

      // Cart should still have items
      const cartAfter = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartAfter.body.data.items.length).toBe(1);
      expect(cartAfter.body.data.items[0].id).toBe(itemsBefore[0].id);

      // No order should be created
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find({ where: { user: { id: user.id } } });
      expect(orders.length).toBe(0);
    });

    it("should not create order when cart is empty", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Empty Cart User",
        email: "emptycart@test.com",
        password: "Test@1234",
      });

      // Attempt checkout with empty cart
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("emptycart"),
        },
      );

      // Should fail
      expect(checkoutResponse.status).not.toBe(201);

      // No order should be created
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find({ where: { user: { id: user.id } } });
      expect(orders.length).toBe(0);
    });

    it("should rollback discount usage if checkout fails after discount validation", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 10, {
        code: "ROLLBACK",
        value: 20,
      });

      const initialUsageCount = discount.currentUsageCount;

      const { user, tokens } = await registerUser(app, {
        fullName: "Discount Rollback User",
        email: "discountrollback@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      // Add item to cart (but don't set delivery address to cause failure)
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 2,
        branchId: mainBranch.id,
      });

      // Apply discount
      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "ROLLBACK",
      });

      // Attempt checkout without delivery address (should fail for delivery orders)
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("discountrollback"),
        },
      );

      // Should fail due to missing delivery address
      expect(checkoutResponse.status).not.toBe(201);

      // Discount usage count should remain unchanged
      const discountRepo = getRepository<Discount>(Discount);
      const updatedDiscount = await discountRepo.findOne({
        where: { id: discount.id },
      });

      expect(updatedDiscount?.currentUsageCount).toBe(initialUsageCount);
    });
  });

  describe("Data Consistency After Failed Operations", () => {
    it("should maintain cart integrity after multiple failed checkout attempts", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Multiple Failures User",
        email: "multiplefailures@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add items to cart
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 3,
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

      const originalCart = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      const originalSubtotal = originalCart.body.data.subtotal;

      // Attempt multiple invalid checkouts
      for (let i = 0; i < 5; i++) {
        // Missing idempotency key
        await authenticatedPost(app, "/orders/checkout", tokens.access_token, {
          paymentType: "CASH",
        });
      }

      // Cart should be unchanged
      const cartAfter = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartAfter.body.data.subtotal).toBe(originalSubtotal);
      expect(cartAfter.body.data.items.length).toBe(1);
      expect(cartAfter.body.data.items[0].quantity).toBe(3);

      // Now do a successful checkout
      const successfulCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("success"),
        },
      );

      expect(successfulCheckout.status).toBe(201);

      // Only one order should exist
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find({ where: { user: { id: user.id } } });
      expect(orders.length).toBe(1);
    });

    it("should not leave orphaned records after checkout failure", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "No Orphans User",
        email: "noorphans@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Count records before
      const ordersBefore = await executeQuery("SELECT COUNT(*) FROM orders");
      const orderItemsBefore = await executeQuery(
        "SELECT COUNT(*) FROM order_items",
      );

      // Add items and attempt failed checkout
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

      // Fail checkout
      await authenticatedPost(app, "/orders/checkout", tokens.access_token, {
        paymentType: "CASH",
        // Missing idempotency key
      });

      // Count records after
      const ordersAfter = await executeQuery("SELECT COUNT(*) FROM orders");
      const orderItemsAfter = await executeQuery(
        "SELECT COUNT(*) FROM order_items",
      );

      // No new orders or order items should be created
      expect(ordersAfter[0].count).toBe(ordersBefore[0].count);
      expect(orderItemsAfter[0].count).toBe(orderItemsBefore[0].count);

      // Check for any orphaned records
      const orphanedOrderItems = await executeQuery(`
        SELECT * FROM order_items oi
        WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = oi."orderId")
      `);
      expect(orphanedOrderItems.length).toBe(0);
    });
  });

  describe("Concurrent Transaction Rollback", () => {
    it("should handle concurrent failed checkouts without corrupting data", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 5 users
      const userPromises = Array.from({ length: 5 }, (_, i) =>
        registerUser(app, {
          fullName: `Concurrent Rollback User ${i}`,
          email: `concurrentrollback${i}@test.com`,
          password: "Test@1234",
        }),
      );
      const users = await Promise.all(userPromises);

      const userRepo = getRepository<User>(User);
      const _dbUsers = await Promise.all(
        users.map((u) => userRepo.findOne({ where: { id: u.user.id } })),
      );

      // Prepare carts but don't set delivery addresses (will cause failure)
      for (let i = 0; i < users.length; i++) {
        await authenticatedPost(
          app,
          "/cart/items",
          users[i].tokens.access_token,
          {
            itemId: menu.items.burger.id,
            quantity: i + 1,
            branchId: mainBranch.id,
          },
        );
      }

      // All users try to checkout simultaneously (should all fail - no delivery address)
      const checkoutPromises = users.map((u) =>
        authenticatedPost(app, "/orders/checkout", u.tokens.access_token, {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey(`concurrent-${u.user.id}`),
        }),
      );

      const results = await Promise.all(checkoutPromises);

      // All should fail
      results.forEach((result) => {
        expect(result.status).not.toBe(201);
      });

      // No orders should be created
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find();
      expect(orders.length).toBe(0);

      // All carts should still have their items
      for (let i = 0; i < users.length; i++) {
        const cart = await authenticatedGet(
          app,
          "/cart",
          users[i].tokens.access_token,
        );
        expect(cart.body.data.items.length).toBe(1);
        expect(cart.body.data.items[0].quantity).toBe(i + 1);
      }
    });
  });

  describe("Idempotency Key Handling", () => {
    it("should prevent duplicate order creation with same idempotency key", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Idempotency User",
        email: "idempotency@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add item
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

      const idempotencyKey = "same-key-123";

      // First checkout should succeed
      const firstCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey,
        },
      );

      expect(firstCheckout.status).toBe(201);
      const firstOrderId = firstCheckout.body.data.order.id;

      // Add another item for potential second order
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.pizza.id,
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

      // Second checkout with same key should return same order or be rejected
      const secondCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey, // Same key
        },
      );

      // Should either return the original order or reject
      if (secondCheckout.status === 201) {
        expect(secondCheckout.body.data.order.id).toBe(firstOrderId);
      } else {
        // Or it could reject with conflict
        expect([409, 400]).toContain(secondCheckout.status);
      }

      // Only one order should exist for this user
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find({ where: { user: { id: user.id } } });
      expect(orders.length).toBe(1);
    });
  });
});
