import { INestApplication } from "@nestjs/common";
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
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../../setup/test-app";

describe("Customer Checkout - Delivery (E2E)", () => {
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

  describe("Full Delivery Checkout", () => {
    it("should complete full delivery checkout with cash payment", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Checkout User",
        email: "checkout@test.com",
        password: "Test@1234",
      });

      // Get user from DB
      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      // Create delivery address
      const address = await createHomeAddress(dbUser!, {
        latitude: 30.0444,
        longitude: 31.2357,
      });

      // Add items to cart
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 2,
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
      expect(response.body.data.orderNumber).toBeDefined();
      expect(response.body.data.orderType).toBe("DELIVERY");
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it("should reject checkout without delivery address", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Checkout User",
        email: "checkout@test.com",
        password: "Test@1234",
      });

      // Add items without setting address
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Try checkout without address
      const response = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe("Delivery Fee Calculation", () => {
    it("should calculate delivery fee based on zone", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Checkout User",
        email: "checkout@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      const address = await createHomeAddress(dbUser!, {
        latitude: 30.0444,
        longitude: 31.2357,
      });

      // Add items
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      await authenticatedPost(app, "/cart/address", tokens.access_token, {
        addressId: address.id,
      });

      // Get cart to check delivery fee
      const cartResponse = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );

      expect(cartResponse.body.data.deliveryFee).toBeGreaterThan(0);
    });
  });

  describe("Order Confirmation", () => {
    it("should generate unique order number", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Checkout User",
        email: "checkout@test.com",
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

      await authenticatedPost(app, "/cart/address", tokens.access_token, {
        addressId: address.id,
      });

      const response = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        { paymentMethod: "CASH" },
      );

      expect(response.body.data.orderNumber).toMatch(/^WO\d+$/);
    });

    it("should return estimated delivery time", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Checkout User",
        email: "checkout@test.com",
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

      await authenticatedPost(app, "/cart/address", tokens.access_token, {
        addressId: address.id,
      });

      const response = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        { paymentMethod: "CASH" },
      );

      expect(response.body.data.estimatedDeliveryTime).toBeDefined();
    });
  });
});
