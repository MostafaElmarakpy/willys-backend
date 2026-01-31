import { INestApplication } from "@nestjs/common";
import { Order } from "../../../src/database/entities/order.entity";
import { User } from "../../../src/database/entities/user.entity";
import { createHomeAddress } from "../../factories/address.factory";
import { createTestBranches } from "../../fixtures/branches.fixture";
import { createTestMenu } from "../../fixtures/menu.fixture";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { registerUser } from "../../helpers/auth.helper";
import {
  authenticatedGet,
  authenticatedPost,
} from "../../helpers/request.helper";
import { generateIdempotencyKey } from "../../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../../setup/test-app";

describe("Payment Failure Recovery Flows (E2E)", () => {
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

  describe("Cash Payment Flow", () => {
    it("should successfully complete cash payment checkout", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Cash Payment User",
        email: "cashpayment@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add item
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

      // Checkout with cash
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("cash"),
        },
      );

      expect(checkoutResponse.status).toBe(201);

      const order = checkoutResponse.body.data.order;
      expect(order.status).toBe("CONFIRMED"); // Cash payments are immediately confirmed
    });
  });

  describe("Idempotency Protection", () => {
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

      const idempotencyKey = "unique-checkout-key-123";

      // First checkout
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

      // Try again with same idempotency key
      const secondCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey, // Same key
        },
      );

      // Should either return the same order or be rejected
      if (secondCheckout.status === 201) {
        expect(secondCheckout.body.data.order.id).toBe(firstOrderId);
      } else {
        expect([409, 400]).toContain(secondCheckout.status);
      }

      // Verify only one order exists
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find({ where: { user: { id: user.id } } });
      expect(orders.length).toBe(1);
    });

    it("should allow new order with different idempotency key", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "New Key User",
        email: "newkey@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // First order
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

      const firstCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: "first-unique-key",
        },
      );

      expect(firstCheckout.status).toBe(201);

      // Second order with different key
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

      const secondCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: "second-unique-key", // Different key
        },
      );

      expect(secondCheckout.status).toBe(201);
      expect(secondCheckout.body.data.order.id).not.toBe(
        firstCheckout.body.data.order.id,
      );

      // Verify two orders exist
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find({ where: { user: { id: user.id } } });
      expect(orders.length).toBe(2);
    });
  });

  describe("Checkout Retry Scenarios", () => {
    it("should allow retry with new idempotency key after failed validation", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Retry User",
        email: "retry@test.com",
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

      // First attempt without delivery address (should fail validation)
      const failedCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: "retry-key-1",
        },
      );

      // Should fail due to missing delivery address
      expect(failedCheckout.status).not.toBe(201);

      // Fix the issue - set delivery address
      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      // Retry with new idempotency key
      const successfulCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: "retry-key-2", // New key
        },
      );

      expect(successfulCheckout.status).toBe(201);
    });

    it("should preserve cart after failed checkout attempt", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Preserve Cart User",
        email: "preservecart@test.com",
        password: "Test@1234",
      });

      // Add items
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 3,
        branchId: mainBranch.id,
      });

      const cartBefore = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );

      // Failed checkout (no delivery address)
      await authenticatedPost(app, "/orders/checkout", tokens.access_token, {
        paymentType: "CASH",
        idempotencyKey: generateIdempotencyKey("failed"),
      });

      // Cart should still have items
      const cartAfter = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );

      expect(cartAfter.body.data.items.length).toBe(
        cartBefore.body.data.items.length,
      );
      expect(cartAfter.body.data.items[0].quantity).toBe(3);
    });
  });

  describe("Payment Method Switching", () => {
    it("should allow switching from card to cash payment", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Switch Payment User",
        email: "switchpayment@test.com",
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

      // First, try card (might fail without payment method setup)
      const cardCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CARD",
          idempotencyKey: generateIdempotencyKey("card"),
        },
      );

      // If card fails, switch to cash
      if (cardCheckout.status !== 201) {
        // Add item again for new checkout
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

        const cashCheckout = await authenticatedPost(
          app,
          "/orders/checkout",
          tokens.access_token,
          {
            paymentType: "CASH",
            idempotencyKey: generateIdempotencyKey("cash-fallback"),
          },
        );

        expect(cashCheckout.status).toBe(201);
      }
    });
  });

  describe("Order State Verification", () => {
    it("should have correct order state after successful checkout", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Order State User",
        email: "orderstate@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add item
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

      // Checkout
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("state"),
        },
      );

      expect(checkoutResponse.status).toBe(201);

      const orderId = checkoutResponse.body.data.order.id;

      // Verify order state in database
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: ["items", "user"],
      });

      expect(order).toBeDefined();
      expect(order!.status).toBe("CONFIRMED"); // Cash payments are immediately confirmed
      expect(order!.orderNumber).toBeDefined();
      expect(order!.items.length).toBeGreaterThan(0);
      expect(order!.user.id).toBe(user.id);
      expect(Number(order!.subtotal)).toBeGreaterThan(0);
      expect(Number(order!.total)).toBeGreaterThan(0);
    });

    it("should clear cart after successful checkout", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Clear Cart User",
        email: "clearcart@test.com",
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

      // Verify cart has items before
      const cartBefore = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartBefore.body.data.items.length).toBeGreaterThan(0);

      // Checkout
      await authenticatedPost(app, "/orders/checkout", tokens.access_token, {
        paymentType: "CASH",
        idempotencyKey: generateIdempotencyKey("clearcart"),
      });

      // Cart should be empty after checkout
      const cartAfter = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartAfter.body.data.items.length).toBe(0);
    });
  });
});
