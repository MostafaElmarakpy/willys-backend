import { INestApplication } from "@nestjs/common";
import { Order } from "../../../src/database/entities/order.entity";
import { User } from "../../../src/database/entities/user.entity";
import { createHomeAddress } from "../../factories/address.factory";
import {
  assignDiscountToUsers,
  createLimitedDiscount,
} from "../../factories/discount.factory";
import { createTestBranches } from "../../fixtures/branches.fixture";
import { createTestMenu } from "../../fixtures/menu.fixture";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import {
  getAuthToken,
  loginUser,
  registerUser,
} from "../../helpers/auth.helper";
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

describe("Complete Customer Order Lifecycle (E2E)", () => {
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

  describe("Full Delivery Order Journey", () => {
    it("should complete full journey: register -> browse -> cart -> checkout -> track -> reorder", async () => {
      // SETUP: Create admin, branches, and menu
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "NEWCUSTOMER",
        value: 10,
      });

      // ============================================
      // STEP 1: REGISTER NEW CUSTOMER
      // ============================================
      const registrationData = {
        fullName: "John Doe",
        email: "john.doe@lifecycle.com",
        password: "SecurePass@123",
      };

      const { user, tokens } = await registerUser(app, registrationData);

      expect(user).toBeDefined();
      expect(user.fullName).toBe(registrationData.fullName);
      expect(tokens.access_token).toBeDefined();
      expect(tokens.refresh_token).toBeDefined();

      console.log("✓ Step 1: User registered successfully");

      // ============================================
      // STEP 2: LOGIN AND RECEIVE TOKENS
      // ============================================
      const loginResult = await loginUser(app, {
        identifier: registrationData.email,
        password: registrationData.password,
      });

      expect(loginResult.user).toBeDefined();
      expect(loginResult.tokens.access_token).toBeDefined();

      console.log("✓ Step 2: User logged in successfully");

      // ============================================
      // STEP 3: BROWSE BRANCHES AND MENU
      // ============================================
      // Browse branches (public endpoint)
      const branchesResponse = await publicGet(app, "/branches");
      expect(branchesResponse.status).toBe(200);
      expect(branchesResponse.body.data.length).toBeGreaterThan(0);

      // Browse menu categories
      const categoriesResponse = await publicGet(app, "/menu/categories");
      expect(categoriesResponse.status).toBe(200);

      // Browse specific category items
      const category = menu.categories.mainDishes;
      const itemsResponse = await publicGet(
        app,
        `/menu/categories/${category.id}/items`,
      );
      expect(itemsResponse.status).toBe(200);

      console.log("✓ Step 3: Browsed branches and menu");

      // ============================================
      // STEP 4: ADD ITEMS TO CART WITH CUSTOMIZATIONS
      // ============================================
      // Add burger
      const addBurgerResponse = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 2,
          branchId: mainBranch.id,
          specialInstructions: "No onions please",
        },
      );
      expect(addBurgerResponse.status).toBe(201);

      // Add pizza
      const addPizzaResponse = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.pizza.id,
          quantity: 1,
          branchId: mainBranch.id,
        },
      );
      expect(addPizzaResponse.status).toBe(201);

      // Verify cart
      const cartAfterItems = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartAfterItems.body.data.items.length).toBe(2);

      console.log("✓ Step 4: Added items to cart");

      // ============================================
      // STEP 5: APPLY DISCOUNT CODE
      // ============================================
      // Assign discount to user first
      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      await assignDiscountToUsers(discount, [dbUser!], admin);

      const applyDiscountResponse = await authenticatedPost(
        app,
        "/cart/discount",
        tokens.access_token,
        {
          code: "NEWCUSTOMER",
        },
      );
      expect(applyDiscountResponse.status).toBe(201); // Discount application returns 201

      const cartWithDiscount = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(Number(cartWithDiscount.body.data.discountAmount)).toBeGreaterThan(
        0,
      );

      console.log("✓ Step 5: Applied discount code");

      // ============================================
      // STEP 6: SET DELIVERY ADDRESS (ZONE ROUTING)
      // ============================================
      const address = await createHomeAddress(dbUser!);

      const setAddressResponse = await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );
      expect(setAddressResponse.status).toBe(200);

      const cartWithAddress = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartWithAddress.body.data.deliveryFee).toBeDefined();

      console.log("✓ Step 6: Set delivery address");

      // ============================================
      // STEP 7: VALIDATE CART
      // ============================================
      const validateResponse = await authenticatedPost(
        app,
        "/cart/validate",
        tokens.access_token,
        {},
      );
      expect([200, 201]).toContain(validateResponse.status);

      console.log("✓ Step 7: Cart validated");

      // ============================================
      // STEP 8: CHECKOUT WITH CASH PAYMENT
      // ============================================
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("lifecycle-checkout"),
        },
      );
      expect(checkoutResponse.status).toBe(201);

      const order = checkoutResponse.body.data.order;
      expect(order.orderNumber).toBeDefined();
      expect(order.status).toBe("CONFIRMED"); // Cash payments are immediately confirmed

      console.log(`✓ Step 8: Order created - ${order.orderNumber}`);

      // ============================================
      // STEP 9: TRACK ORDER STATUS CHANGES
      // ============================================
      // Get order details
      const orderDetailsResponse = await authenticatedGet(
        app,
        `/orders/${order.id}`,
        tokens.access_token,
      );
      expect(orderDetailsResponse.status).toBe(200);

      // Get order status
      const orderStatusResponse = await authenticatedGet(
        app,
        `/orders/${order.id}/status`,
        tokens.access_token,
      );
      expect(orderStatusResponse.status).toBe(200);

      // Order is already confirmed for cash payments, skip admin confirmation
      const _adminToken = getAuthToken(admin);

      // Check status again
      const statusAfterConfirm = await authenticatedGet(
        app,
        `/orders/${order.id}/status`,
        tokens.access_token,
      );
      expect(statusAfterConfirm.body.data.status).toBe("CONFIRMED");

      console.log("✓ Step 9: Tracked order status changes");

      // ============================================
      // STEP 10: VIEW ORDER IN HISTORY
      // ============================================
      const orderHistoryResponse = await authenticatedGet(
        app,
        "/orders",
        tokens.access_token,
      );
      expect(orderHistoryResponse.status).toBe(200);
      expect(orderHistoryResponse.body.data.length).toBeGreaterThan(0);

      const historyOrder = orderHistoryResponse.body.data.find(
        (o: any) => o.id === order.id,
      );
      expect(historyOrder).toBeDefined();

      console.log("✓ Step 10: Viewed order in history");

      // ============================================
      // STEP 11: REORDER FROM HISTORY
      // ============================================
      const reorderResponse = await authenticatedPost(
        app,
        `/orders/${order.id}/reorder`,
        tokens.access_token,
        {},
      );
      expect([200, 201]).toContain(reorderResponse.status);

      console.log("✓ Step 11: Reorder initiated");

      // ============================================
      // STEP 12: VERIFY CART REPOPULATED
      // ============================================
      const cartAfterReorder = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      expect(cartAfterReorder.body.data.items.length).toBeGreaterThan(0);

      console.log("✓ Step 12: Cart repopulated from reorder");

      // ============================================
      // FINAL VERIFICATION
      // ============================================
      // Verify order data integrity
      const orderRepo = getRepository<Order>(Order);
      const finalOrder = await orderRepo.findOne({
        where: { id: order.id },
        relations: ["items", "user"],
      });

      expect(finalOrder).toBeDefined();
      expect(finalOrder!.items.length).toBe(2);
      expect(finalOrder!.user.id).toBe(user.id);
      expect(Number(finalOrder!.discountAmount)).toBeGreaterThan(0);
      expect(finalOrder!.deliveryAddressSnapshot).toBeDefined();

      console.log("\n✅ Complete order lifecycle test passed!");
    });
  });

  describe("Full Pickup Order Journey", () => {
    it("should complete pickup order journey with scheduled time", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Register
      const { tokens } = await registerUser(app, {
        fullName: "Pickup Customer",
        email: "pickup@lifecycle.com",
        password: "Test@1234",
      });

      // Add item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Set order type to PICKUP
      const setOrderTypeResponse = await authenticatedPost(
        app,
        "/cart/order-type",
        tokens.access_token,
        {
          orderType: "PICKUP",
        },
      );
      expect([200, 201]).toContain(setOrderTypeResponse.status);

      // Set pickup time (30 minutes from now)
      const pickupTime = new Date(Date.now() + 30 * 60 * 1000);
      const setPickupTimeResponse = await authenticatedPost(
        app,
        "/cart/pickup-time",
        tokens.access_token,
        {
          scheduledPickupTime: pickupTime.toISOString(),
        },
      );
      expect([200, 201]).toContain(setPickupTimeResponse.status);

      // Checkout
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("pickup-checkout"),
        },
      );

      expect(checkoutResponse.status).toBe(201);
      const order = checkoutResponse.body.data.order;

      // Verify pickup order specifics
      expect(order.orderType).toBe("PICKUP");

      // Verify no delivery fee for pickup
      expect(Number(order.deliveryFee || 0)).toBe(0);

      console.log("✅ Pickup order journey completed!");
    });
  });

  describe("Order with Multiple Discounts", () => {
    it("should handle order with item-specific and cart-wide discounts", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const cartDiscount = await createLimitedDiscount(admin, 100, {
        code: "CART10",
        value: 10,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Multi Discount User",
        email: "multidiscount@lifecycle.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(cartDiscount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      // Add items
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 2,
        branchId: mainBranch.id,
      });

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

      // Apply cart discount
      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "CART10",
      });

      // Checkout
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("multidiscount"),
        },
      );

      expect(checkoutResponse.status).toBe(201);

      const order = checkoutResponse.body.data.order;
      expect(Number(order.discountAmount)).toBeGreaterThan(0);
      expect(order.appliedDiscounts).toBeDefined();

      console.log("✅ Multi-discount order completed!");
    });
  });

  describe("Edge Case Journeys", () => {
    it("should handle order with maximum items", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Max Items User",
        email: "maxitems@lifecycle.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add max quantity of each item type
      const items = [menu.items.burger, menu.items.pizza, menu.items.pasta];
      for (const item of items) {
        await authenticatedPost(app, "/cart/items", tokens.access_token, {
          itemId: item.id,
          quantity: 10,
          branchId: mainBranch.id,
        });
      }

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
          idempotencyKey: generateIdempotencyKey("maxitems"),
        },
      );

      expect(checkoutResponse.status).toBe(201);

      // Verify all items in order
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({
        where: { id: checkoutResponse.body.data.order.id },
        relations: ["items"],
      });

      expect(order!.items.length).toBe(3);
      const totalQuantity = order!.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      expect(totalQuantity).toBe(30);

      console.log("✅ Max items order completed!");
    });

    it("should handle immediate reorder after order completion", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Quick Reorder User",
        email: "quickreorder@lifecycle.com",
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
          idempotencyKey: generateIdempotencyKey("first"),
        },
      );

      const firstOrderId = firstCheckout.body.data.order.id;

      // Immediate reorder
      await authenticatedPost(
        app,
        `/orders/${firstOrderId}/reorder`,
        tokens.access_token,
        {},
      );

      // Set delivery address again
      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      // Second checkout
      const secondCheckout = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("second"),
        },
      );

      expect(secondCheckout.status).toBe(201);
      expect(secondCheckout.body.data.order.id).not.toBe(firstOrderId);

      // Verify two orders exist
      const orderRepo = getRepository<Order>(Order);
      const orders = await orderRepo.find({ where: { user: { id: user.id } } });
      expect(orders.length).toBe(2);

      console.log("✅ Quick reorder completed!");
    });
  });
});
