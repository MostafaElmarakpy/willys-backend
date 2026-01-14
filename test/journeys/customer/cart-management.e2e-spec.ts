import { INestApplication } from "@nestjs/common";
import { createTestBranches } from "../../fixtures/branches.fixture";
import { createTestMenu } from "../../fixtures/menu.fixture";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { registerUser } from "../../helpers/auth.helper";
import {
  authenticatedDelete,
  authenticatedGet,
  authenticatedPatch,
  authenticatedPost,
} from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
} from "../../setup/test-app";

describe("Customer Cart Management (E2E)", () => {
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

  describe("Cart Operations", () => {
    it("should get empty cart for new user", async () => {
      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.items).toEqual([]);
    });

    it("should add simple item to cart", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

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
      expect(response.body.data.itemId).toBe(menu.items.burger.id);
      expect(response.body.data.quantity).toBe(1);
    });

    it("should add item with variant selection", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.pizza.id,
          quantity: 1,
          branchId: mainBranch.id,
          selectedVariant: {
            name: "Size",
            value: "Large",
            price: 100,
          },
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.selectedVariant).toBeDefined();
    });

    it("should add item with extras", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: mainBranch.id,
          extras: [
            {
              ingredientId: menu.ingredients.items.cheese.id,
              quantity: 2,
            },
          ],
        },
      );

      expect(response.status).toBe(201);
    });

    it("should add bundle to cart", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          bundleId: menu.bundles.mealDeal.id,
          quantity: 1,
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.bundleId).toBe(menu.bundles.mealDeal.id);
    });

    it("should update cart item quantity", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
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

      const cartItemId = addResponse.body.data.id;

      // Update quantity
      const updateResponse = await authenticatedPatch(
        app,
        `/cart/items/${cartItemId}`,
        tokens.access_token,
        { quantity: 3 },
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.quantity).toBe(3);
    });

    it("should remove item from cart", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
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

      const cartItemId = addResponse.body.data.id;

      // Remove item
      const removeResponse = await authenticatedDelete(
        app,
        `/cart/items/${cartItemId}`,
        tokens.access_token,
      );

      expect(removeResponse.status).toBe(200);
    });

    it("should clear entire cart", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

      // Add items
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Clear cart
      const clearResponse = await authenticatedDelete(
        app,
        "/cart",
        tokens.access_token,
      );

      expect(clearResponse.status).toBe(200);

      // Verify cart is empty
      const cartResponse = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartResponse.body.data.items).toEqual([]);
    });
  });

  describe("Cart Configuration", () => {
    it("should set order type to delivery", async () => {
      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPatch(
        app,
        "/cart",
        tokens.access_token,
        { orderType: "DELIVERY" },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.orderType).toBe("DELIVERY");
    });

    it("should set order type to pickup", async () => {
      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPatch(
        app,
        "/cart",
        tokens.access_token,
        { orderType: "PICKUP" },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.orderType).toBe("PICKUP");
    });
  });

  describe("Cart Validation", () => {
    it("should validate cart before checkout", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

      // Add item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Validate cart
      const response = await authenticatedPost(
        app,
        "/cart/validate",
        tokens.access_token,
        {},
      );

      expect(response.status).toBe(200);
    });

    it("should get cart summary with calculated totals", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Cart User",
        email: "cart@test.com",
        password: "Test@1234",
      });

      // Add items
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 2,
        branchId: mainBranch.id,
      });

      // Get cart summary
      const response = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.subtotal).toBeDefined();
      expect(response.body.data.total).toBeDefined();
    });
  });
});
