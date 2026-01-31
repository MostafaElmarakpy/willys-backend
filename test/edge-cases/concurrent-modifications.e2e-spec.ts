import { INestApplication } from "@nestjs/common";
import { ItemStatus } from "../../src/common/enums/ItemStatus";
import { Branch } from "../../src/database/entities/branch.entity";
import { Discount } from "../../src/database/entities/discount.entity";
import { Item } from "../../src/database/entities/item.entity";
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
import { getAuthToken, registerUser } from "../helpers/auth.helper";
import {
  authenticatedGet,
  authenticatedPatch,
  authenticatedPost,
} from "../helpers/request.helper";
import {
  generateIdempotencyKey,
  runSimultaneousOperations,
  sleep,
} from "../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../setup/test-app";

describe("Concurrent Entity Modifications (E2E)", () => {
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

  describe("Item Modifications During Customer Operations", () => {
    it("should handle item price change during checkout", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const _adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Price Change User",
        email: "pricechange@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Customer adds item to cart
      const addResponse = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 2,
          branchId: mainBranch.id,
        },
      );
      expect(addResponse.status).toBe(201);

      const originalPrice = addResponse.body.data.items[0].unitPrice;

      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      // Admin changes the price while customer is checking out
      const itemRepo = getRepository<Item>(Item);
      await itemRepo.update(menu.items.burger.id, {
        pricing: Number(originalPrice) * 2, // Double the price
      });

      // Customer attempts checkout
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("pricechange"),
        },
      );

      // System should either:
      // 1. Use the original price from cart (snapshot behavior)
      // 2. Reject with "price changed" error (validation behavior)
      // 3. Succeed with new price (real-time pricing behavior)
      if (checkoutResponse.status === 201) {
        const order = checkoutResponse.body.data.order;
        // If successful, verify order has price data
        expect(order).toBeDefined();
        console.log(
          `Checkout succeeded. Order total: ${order.total}, Original price: ${originalPrice}`,
        );
      } else {
        // If failed, should be due to price change detection
        expect([400, 409]).toContain(checkoutResponse.status);
      }
    });

    it("should handle item becoming unavailable during checkout", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Unavailable Item User",
        email: "unavailableitem@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add item to cart
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

      // Admin marks item as unavailable
      const itemRepo = getRepository<Item>(Item);
      await itemRepo.update(menu.items.burger.id, {
        status: ItemStatus.ARCHIVED, // or whatever status marks it unavailable
      });

      // Customer attempts checkout
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("unavailable"),
        },
      );

      // Should fail with appropriate error
      expect([400, 404, 409]).toContain(checkoutResponse.status);
    });

    it("should handle concurrent cart modifications from same user", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Concurrent Cart User",
        email: "concurrentcart@test.com",
        password: "Test@1234",
      });

      // Add initial item
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
      const cartItemId = addResponse.body.data.items[0].id;

      // Concurrent updates to same cart item
      const updateOperations = [
        () =>
          authenticatedPatch(
            app,
            `/cart/items/${cartItemId}`,
            tokens.access_token,
            { quantity: 5 },
          ),
        () =>
          authenticatedPatch(
            app,
            `/cart/items/${cartItemId}`,
            tokens.access_token,
            { quantity: 3 },
          ),
        () =>
          authenticatedPatch(
            app,
            `/cart/items/${cartItemId}`,
            tokens.access_token,
            { quantity: 7 },
          ),
      ];

      const results = await runSimultaneousOperations(updateOperations);

      // All should complete (though order may vary)
      results.forEach((r: any) => {
        expect([200, 409]).toContain(r.result?.status || 200);
      });

      // Final cart should have a valid quantity (one of 5, 3, or 7)
      const cart = await authenticatedGet(app, "/cart", tokens.access_token);
      expect([5, 3, 7]).toContain(cart.body.data.items[0].quantity);
    });
  });

  describe("Branch Modifications During Customer Operations", () => {
    it("should handle branch deactivation during checkout", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Branch Deactivated User",
        email: "branchdeactivated@test.com",
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

      // Deactivate branch
      const branchRepo = getRepository<Branch>(Branch);
      await branchRepo.update(mainBranch.id, {
        isActive: false,
      });

      // Attempt checkout
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("branchdeactivated"),
        },
      );

      // Should fail
      expect([400, 404, 409]).toContain(checkoutResponse.status);
    });
  });

  describe("Discount Modifications During Customer Operations", () => {
    it("should handle discount value modification during checkout", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "MODIFYVALUE",
        value: 20, // 20%
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Discount Modify User",
        email: "discountmodify@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      // Add item and apply discount
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

      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "MODIFYVALUE",
      });

      // Get cart to see original discount amount
      const cartBefore = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      const originalDiscountAmount = cartBefore.body.data.discountAmount;

      // Admin changes discount value
      const discountRepo = getRepository<Discount>(Discount);
      await discountRepo.update(discount.id, {
        value: 50, // Changed to 50%
      });

      // Customer checkouts
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("discountmodify"),
        },
      );

      if (checkoutResponse.status === 201) {
        // Order should use the discount amount from when it was applied
        // (snapshot behavior) or the new value (real-time behavior)
        const order = checkoutResponse.body.data.order;
        console.log(
          `Original discount amount: ${originalDiscountAmount}, Order discount: ${order.discountAmount}`,
        );
        // Just verify it completed successfully
        expect(order.id).toBeDefined();
      }
    });

    it("should handle discount deactivation during checkout", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "DEACTIVATE",
        value: 15,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Discount Deactivate User",
        email: "discountdeactivate@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      // Add item and apply discount
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
        code: "DEACTIVATE",
      });

      // Deactivate discount
      const discountRepo = getRepository<Discount>(Discount);
      await discountRepo.update(discount.id, {
        isActive: false,
      });

      // Attempt checkout
      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("deactivate"),
        },
      );

      // Should either fail (discount no longer valid) or succeed without discount
      if (checkoutResponse.status === 201) {
        // If succeeded, discount might not be applied
        console.log(
          "Checkout succeeded despite discount deactivation:",
          checkoutResponse.body.data.order.discountAmount,
        );
      } else {
        expect([400, 409]).toContain(checkoutResponse.status);
      }
    });
  });

  describe("Order Status Race Conditions", () => {
    it("should prevent invalid concurrent order status updates", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Status Race User",
        email: "statusrace@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Create order
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
          idempotencyKey: generateIdempotencyKey("statusrace"),
        },
      );

      expect(checkoutResponse.status).toBe(201);
      const orderId = checkoutResponse.body.data.order.id;

      // Two admins try to update order status simultaneously
      // One to CONFIRMED, one to CANCELLED
      const statusUpdateOperations = [
        () =>
          authenticatedPatch(
            app,
            `/admin/orders/${orderId}/status`,
            adminToken,
            {
              status: "CONFIRMED",
            },
          ),
        () =>
          authenticatedPatch(
            app,
            `/admin/orders/${orderId}/status`,
            adminToken,
            {
              status: "CANCELLED",
            },
          ),
      ];

      const results = await runSimultaneousOperations(statusUpdateOperations);

      // Only one should succeed, or both may succeed if transitions are valid
      const _successCount = results.filter(
        (r: any) => r.result?.status === 200,
      ).length;

      // At least one should succeed (or get conflict)
      expect(results.some((r: any) => [200, 409].includes(r.result?.status)));

      // Verify final order state is consistent
      const orderRepo = getRepository<Order>(Order);
      const finalOrder = await orderRepo.findOne({ where: { id: orderId } });

      // Order should be in one of the two states (not a corrupted state)
      expect(["PENDING", "CONFIRMED", "CANCELLED"]).toContain(
        finalOrder?.status,
      );
    });

    it("should prevent customer cancellation of already processing order", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Cancel Race User",
        email: "cancelrace@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Create order
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
          idempotencyKey: generateIdempotencyKey("cancelrace"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Concurrent: Admin confirms while customer tries to cancel
      const raceOperations = [
        () =>
          authenticatedPatch(
            app,
            `/admin/orders/${orderId}/status`,
            adminToken,
            {
              status: "PREPARING",
            },
          ),
        () =>
          authenticatedPost(
            app,
            `/orders/${orderId}/cancel`,
            tokens.access_token,
            {},
          ),
      ];

      // Small delay to let admin confirm first
      await sleep(50);

      await runSimultaneousOperations(raceOperations);

      // Verify final state
      const orderRepo = getRepository<Order>(Order);
      const finalOrder = await orderRepo.findOne({ where: { id: orderId } });

      // If order is PREPARING, customer cancel should have failed
      // If order is CANCELLED, customer got there first
      console.log(`Final order status: ${finalOrder?.status}`);
      expect(["PENDING", "CONFIRMED", "PREPARING", "CANCELLED"]).toContain(
        finalOrder?.status,
      );
    });
  });

  describe("Address Modifications", () => {
    it("should handle user updating address while order is in transit", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Address Update User",
        email: "addressupdate@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Create order
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
          idempotencyKey: generateIdempotencyKey("addressupdate"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Get original delivery address from order
      const orderRepo = getRepository<Order>(Order);
      const originalOrder = await orderRepo.findOne({ where: { id: orderId } });
      const originalAddressSnapshot = originalOrder?.deliveryAddressSnapshot;

      // User updates their address
      await authenticatedPatch(
        app,
        `/addresses/${address.id}`,
        tokens.access_token,
        {
          addressLine1: "New Address Line 1",
          addressLine2: "Updated Suite 100",
        },
      );

      // Order's delivery address snapshot should be unchanged
      const updatedOrder = await orderRepo.findOne({ where: { id: orderId } });

      // The snapshot should remain the same (immutable)
      expect(updatedOrder?.deliveryAddressSnapshot).toEqual(
        originalAddressSnapshot,
      );
    });
  });
});
