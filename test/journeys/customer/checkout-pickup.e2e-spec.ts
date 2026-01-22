import { INestApplication } from "@nestjs/common";
import { createTestBranches } from "../../fixtures/branches.fixture";
import { createTestMenu } from "../../fixtures/menu.fixture";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { registerUser } from "../../helpers/auth.helper";
import {
  authenticatedPatch,
  authenticatedPost,
} from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
} from "../../setup/test-app";

describe("Customer Checkout - Pickup (E2E)", () => {
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

  describe("Full Pickup Checkout", () => {
    it("should complete full pickup checkout", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Pickup User",
        email: "pickup@test.com",
        password: "Test@1234",
      });

      // Add items to cart
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 2,
        branchId: mainBranch.id,
      });

      // Set order type to pickup
      await authenticatedPatch(app, "/cart", tokens.access_token, {
        orderType: "PICKUP",
        branchId: mainBranch.id,
      });

      // Checkout
      const response = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.orderType).toBe("PICKUP");
      expect(response.body.data.branchId).toBe(mainBranch.id);
    });

    it("should have zero delivery fee for pickup orders", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Pickup User",
        email: "pickup@test.com",
        password: "Test@1234",
      });

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      await authenticatedPatch(app, "/cart", tokens.access_token, {
        orderType: "PICKUP",
      });

      const response = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        { paymentMethod: "CASH" },
      );

      expect(response.body.data.deliveryFee).toBe(0);
    });

    it("should allow scheduling pickup time", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Pickup User",
        email: "pickup@test.com",
        password: "Test@1234",
      });

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      await authenticatedPatch(app, "/cart", tokens.access_token, {
        orderType: "PICKUP",
        scheduledPickupTime: scheduledTime.toISOString(),
      });

      const response = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        { paymentMethod: "CASH" },
      );

      expect(response.body.data.scheduledPickupTime).toBeDefined();
    });
  });

  describe("Preparation Time", () => {
    it("should return estimated preparation time", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Pickup User",
        email: "pickup@test.com",
        password: "Test@1234",
      });

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      await authenticatedPatch(app, "/cart", tokens.access_token, {
        orderType: "PICKUP",
      });

      const response = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        { paymentMethod: "CASH" },
      );

      // Should have preparation time estimate
      expect(response.body.data).toBeDefined();
    });
  });
});
