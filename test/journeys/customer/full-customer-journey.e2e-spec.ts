import { INestApplication } from "@nestjs/common";
import { User } from "../../../src/database/entities/user.entity";
import { createHomeAddress } from "../../factories/address.factory";
import { createTestBranches } from "../../fixtures/branches.fixture";
import { createTestMenu } from "../../fixtures/menu.fixture";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { loginUser, registerUser } from "../../helpers/auth.helper";
import {
  authenticatedGet,
  authenticatedPatch,
  authenticatedPost,
} from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../../setup/test-app";

describe("Full Customer Journey (E2E)", () => {
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

  it("should complete full customer journey from registration to order tracking", async () => {
    // Setup: Create admin, branches, and menu
    const admin = await createDefaultAdmin();
    const { mainBranch } = await createTestBranches(admin);
    const menu = await createTestMenu(admin);

    // Step 1: Register new customer
    const userData = {
      fullName: "Complete Journey User",
      email: "journey@test.com",
      password: "Test@1234",
      userLocale: "en",
    };
    const { user: registeredUser, tokens: registrationTokens } =
      await registerUser(app, userData);

    expect(registeredUser).toBeDefined();
    expect(registrationTokens.access_token).toBeDefined();

    // Step 2: Login (verify can login after registration)
    const { user: loggedInUser, tokens } = await loginUser(app, {
      identifier: userData.email,
      password: userData.password,
    });

    expect(loggedInUser.email).toBe(userData.email);

    // Step 3: Add delivery address
    const userRepo = getRepository<User>(User);
    const dbUser = await userRepo.findOne({ where: { id: loggedInUser.id } });

    const address = await createHomeAddress(dbUser!, {
      latitude: 30.0444,
      longitude: 31.2357,
      label: "Home",
    });

    expect(address).toBeDefined();

    // Step 4: Browse branch menu
    const menuResponse = await authenticatedGet(
      app,
      `/branches/${mainBranch.id}/menu`,
      tokens.access_token,
    );

    expect(menuResponse.status).toBe(200);

    // Step 5: Add item to cart
    const addItemResponse = await authenticatedPost(
      app,
      "/cart/items",
      tokens.access_token,
      {
        itemId: menu.items.burger.id,
        quantity: 2,
        branchId: mainBranch.id,
        extras: [
          {
            ingredientId: menu.ingredients.items.cheese.id,
            quantity: 1,
          },
        ],
      },
    );

    expect(addItemResponse.status).toBe(201);

    // Step 6: Add bundle to cart
    const addBundleResponse = await authenticatedPost(
      app,
      "/cart/items",
      tokens.access_token,
      {
        bundleId: menu.bundles.mealDeal.id,
        quantity: 1,
        branchId: mainBranch.id,
      },
    );

    expect(addBundleResponse.status).toBe(201);

    // Step 7: Set delivery order type and address
    await authenticatedPatch(app, "/cart", tokens.access_token, {
      orderType: "DELIVERY",
    });

    await authenticatedPost(app, "/cart/address", tokens.access_token, {
      addressId: address.id,
    });

    // Step 8: Get cart summary (validate totals)
    const cartResponse = await authenticatedGet(
      app,
      "/cart",
      tokens.access_token,
    );

    expect(cartResponse.status).toBe(200);
    expect(cartResponse.body.data.subtotal).toBeGreaterThan(0);
    expect(cartResponse.body.data.total).toBeGreaterThan(0);
    expect(cartResponse.body.data.items.length).toBe(2);

    // Step 9: Validate cart
    const validateResponse = await authenticatedPost(
      app,
      "/cart/validate",
      tokens.access_token,
      {},
    );

    expect(validateResponse.status).toBe(200);

    // Step 10: Checkout with cash payment
    const checkoutResponse = await authenticatedPost(
      app,
      "/orders/checkout",
      tokens.access_token,
      {
        paymentMethod: "CASH",
      },
    );

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutResponse.body.data.orderNumber).toBeDefined();

    const orderId = checkoutResponse.body.data.id;

    // Step 11: Verify order created
    const orderResponse = await authenticatedGet(
      app,
      `/orders/${orderId}`,
      tokens.access_token,
    );

    expect(orderResponse.status).toBe(200);
    expect(orderResponse.body.data.id).toBe(orderId);
    expect(orderResponse.body.data.status).toBeDefined();

    // Step 12: Track order status
    const trackingResponse = await authenticatedGet(
      app,
      `/orders/${orderId}`,
      tokens.access_token,
    );

    expect(trackingResponse.status).toBe(200);
    expect(trackingResponse.body.data.status).toBeDefined();

    // Step 13: View order in history
    const historyResponse = await authenticatedGet(
      app,
      "/orders",
      tokens.access_token,
    );

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.data).toBeInstanceOf(Array);
    expect(historyResponse.body.data.length).toBeGreaterThan(0);

    // Step 14: Reorder same items
    const reorderResponse = await authenticatedPost(
      app,
      `/orders/${orderId}/reorder`,
      tokens.access_token,
      {},
    );

    expect(reorderResponse.status).toBe(201);

    // Verify items added back to cart
    const newCartResponse = await authenticatedGet(
      app,
      "/cart",
      tokens.access_token,
    );

    expect(newCartResponse.status).toBe(200);
    expect(newCartResponse.body.data.items.length).toBeGreaterThan(0);
  });
});
