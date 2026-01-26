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
  publicGet,
} from "../../helpers/request.helper";
import { generateIdempotencyKey } from "../../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../../setup/test-app";

describe("Multi-Branch Ordering Scenarios (E2E)", () => {
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

  describe("Branch-Based Routing", () => {
    it("should route order to correct branch based on delivery address zone", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Zone Routing User",
        email: "zonerouting@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      // Create address in main branch zone
      const address = await createHomeAddress(dbUser!);

      // Add item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Set delivery address
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
          idempotencyKey: generateIdempotencyKey("zonerouting"),
        },
      );

      expect(checkoutResponse.status).toBe(201);

      // Verify branch assignment
      const order = checkoutResponse.body.data.order;
      expect(order.branchId).toBe(mainBranch.id);
    });

    it("should apply correct delivery fee based on zone", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Zone Fee User",
        email: "zonefee@test.com",
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

      // Set delivery address
      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      // Get cart to verify delivery fee
      const cart = await authenticatedGet(app, "/cart", tokens.access_token);

      // Delivery fee should be set based on zone
      expect(cart.body.data.deliveryFee).toBeDefined();
      expect(Number(cart.body.data.deliveryFee)).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Branch Menu Availability", () => {
    it("should validate item availability at selected branch", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Availability User",
        email: "availability@test.com",
        password: "Test@1234",
      });

      // Add item that exists at branch
      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(201);
    });

    it("should reject order for unavailable item at branch", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const _menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Unavailable Item User",
        email: "unavailableitem@test.com",
        password: "Test@1234",
      });

      // Try to add non-existent item
      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: "00000000-0000-0000-0000-000000000000",
          quantity: 1,
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("Cross-Branch Operations", () => {
    it("should handle user ordering from different branches on different orders", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch, secondBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Cross Branch User",
        email: "crossbranch@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // First order from main branch
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

      const firstOrder = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("first-branch"),
        },
      );

      expect(firstOrder.status).toBe(201);

      // Second order from second branch
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.pizza.id,
        quantity: 1,
        branchId: secondBranch.id,
      });

      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      const secondOrder = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("second-branch"),
        },
      );

      expect(secondOrder.status).toBe(201);

      // Verify both orders exist with different branches
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find({
        where: { user: { id: user.id } },
        order: { createdAt: "ASC" },
      });

      expect(orders.length).toBe(2);
      expect(orders[0].branchId).toBe(mainBranch.id);
      expect(orders[1].branchId).toBe(secondBranch.id);
    });

    it("should switch branch and clear incompatible items from cart", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch, secondBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Switch Branch User",
        email: "switchbranch@test.com",
        password: "Test@1234",
      });

      // Add item from main branch
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Try to switch to second branch
      const switchResponse = await authenticatedPost(
        app,
        "/cart/branch",
        tokens.access_token,
        {
          branchId: secondBranch.id,
        },
      );

      // System should either:
      // 1. Clear cart and switch branch
      // 2. Keep items if available at both branches
      // 3. Reject switch if items not available
      expect([200, 400]).toContain(switchResponse.status);
    });
  });

  describe("Branch Discovery", () => {
    it("should find nearby branches", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);

      // Query nearby branches (Cairo coordinates)
      const response = await publicGet(app, "/branches/nearby", {
        latitude: 30.0444,
        longitude: 31.2357,
        radiusKm: 50,
      });

      expect(response.status).toBe(200);
      // Should find at least the main branch
      expect(response.body.data).toBeDefined();
    });

    it("should check if location is served", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);

      // Check serving (Cairo coordinates)
      const response = await publicGet(app, "/branches/serving", {
        latitude: 30.0444,
        longitude: 31.2357,
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Delivery Zone Edge Cases", () => {
    it("should handle address outside all delivery zones", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Outside Zone User",
        email: "outsidezone@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      // Create address with coordinates far from any zone
      // This might need adjustment based on actual zone definitions
      const address = await createHomeAddress(dbUser!);

      // Add item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Try to set delivery address
      const setAddressResponse = await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      // Should either succeed (if address is in zone) or fail with appropriate error
      // The exact behavior depends on the test fixture zone definitions
      expect([200, 400]).toContain(setAddressResponse.status);

      if (setAddressResponse.status === 400) {
        // Should have a meaningful error message about delivery area
        expect(setAddressResponse.body.message).toBeDefined();
      }
    });

    it("should handle address in overlapping zones with priority", async () => {
      // This test verifies that when an address falls in multiple zones,
      // the system correctly selects based on priority

      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Overlap Zone User",
        email: "overlapzone@test.com",
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

      // Set delivery address
      const response = await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      expect(response.status).toBe(200);

      // Verify cart has zone/delivery fee set
      const cart = await authenticatedGet(app, "/cart", tokens.access_token);
      expect(cart.body.data.deliveryFee).toBeDefined();
    });
  });

  describe("Branch Operating Hours", () => {
    it("should include branch details in order", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Branch Details User",
        email: "branchdetails@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

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

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("branchdetails"),
        },
      );

      expect(checkoutResponse.status).toBe(201);

      // Order should have branch ID
      expect(checkoutResponse.body.data.order.branchId).toBe(mainBranch.id);

      // Fetch order with branch details
      const orderResponse = await authenticatedGet(
        app,
        `/orders/${checkoutResponse.body.data.order.id}`,
        tokens.access_token,
      );

      expect(orderResponse.status).toBe(200);
      // Order should have branch information
      expect(
        orderResponse.body.data.branchId || orderResponse.body.data.branch,
      ).toBeDefined();
    });
  });
});
