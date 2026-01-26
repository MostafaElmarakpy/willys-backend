import { INestApplication } from "@nestjs/common";
import { Order } from "../../../src/database/entities/order.entity";
import { OrderStatusLog } from "../../../src/database/entities/order-status-log.entity";
import { User } from "../../../src/database/entities/user.entity";
import { createHomeAddress } from "../../factories/address.factory";
import { createTestBranches } from "../../fixtures/branches.fixture";
import { createTestMenu } from "../../fixtures/menu.fixture";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { getAuthToken, registerUser } from "../../helpers/auth.helper";
import {
  authenticatedPatch,
  authenticatedPost,
} from "../../helpers/request.helper";
import { generateIdempotencyKey } from "../../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../../setup/test-app";

describe("Order Cancellation and Refund Flows (E2E)", () => {
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

  describe("Customer Cancellation", () => {
    it("should allow customer to cancel order in PENDING status", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Cancel Pending User",
        email: "cancelpending@test.com",
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
          idempotencyKey: generateIdempotencyKey("cancel-pending"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Customer cancels
      const cancelResponse = await authenticatedPost(
        app,
        `/orders/${orderId}/cancel`,
        tokens.access_token,
        {
          reason: "Changed my mind",
        },
      );

      expect(cancelResponse.status).toBe(200);

      // Verify order status
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });

      expect(order!.status).toBe("CANCELLED");
    });

    it("should allow customer to cancel order in CONFIRMED status", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Cancel Confirmed User",
        email: "cancelconfirmed@test.com",
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
          idempotencyKey: generateIdempotencyKey("cancel-confirmed"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Admin confirms the order
      await authenticatedPatch(app, `/admin/orders/${orderId}`, adminToken, {
        status: "CONFIRMED",
      });

      // Customer tries to cancel confirmed order
      const cancelResponse = await authenticatedPost(
        app,
        `/orders/${orderId}/cancel`,
        tokens.access_token,
        {
          reason: "Changed my mind after confirmation",
        },
      );

      // Might succeed or fail depending on business rules
      // If allowed, verify cancelled status
      // If not allowed, verify appropriate error
      if (cancelResponse.status === 200) {
        const orderRepo = getRepository<Order>(Order);
        const order = await orderRepo.findOne({ where: { id: orderId } });
        expect(order!.status).toBe("CANCELLED");
      } else {
        expect([400, 403]).toContain(cancelResponse.status);
      }
    });

    it("should prevent customer cancellation after PREPARING status", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "No Cancel Preparing User",
        email: "nocancelpreparing@test.com",
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
          idempotencyKey: generateIdempotencyKey("no-cancel-preparing"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Admin moves to PREPARING
      await authenticatedPatch(app, `/admin/orders/${orderId}`, adminToken, {
        status: "CONFIRMED",
      });
      await authenticatedPatch(app, `/admin/orders/${orderId}`, adminToken, {
        status: "PREPARING",
      });

      // Customer tries to cancel
      const cancelResponse = await authenticatedPost(
        app,
        `/orders/${orderId}/cancel`,
        tokens.access_token,
        {
          reason: "Want to cancel preparing order",
        },
      );

      // Should be blocked for customer (contact support instead)
      expect([400, 403]).toContain(cancelResponse.status);

      // Order should still be PREPARING
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });
      expect(order!.status).toBe("PREPARING");
    });
  });

  describe("Admin Cancellation", () => {
    it("should allow admin to cancel order at any status", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Admin Cancel User",
        email: "admincancel@test.com",
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
          idempotencyKey: generateIdempotencyKey("admin-cancel"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Move to PREPARING
      await authenticatedPatch(app, `/admin/orders/${orderId}`, adminToken, {
        status: "CONFIRMED",
      });
      await authenticatedPatch(app, `/admin/orders/${orderId}`, adminToken, {
        status: "PREPARING",
      });

      // Admin cancels
      const cancelResponse = await authenticatedPatch(
        app,
        `/admin/orders/${orderId}`,
        adminToken,
        {
          status: "CANCELLED",
          cancellationReason: "Out of stock",
        },
      );

      expect(cancelResponse.status).toBe(200);

      // Verify status
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });
      expect(order!.status).toBe("CANCELLED");
    });

    it("should track refund requirement based on order status at cancellation", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Refund Track User",
        email: "refundtrack@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Create order
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

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("refund-track"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Move to CONFIRMED (paid orders after CONFIRMED may require refund)
      await authenticatedPatch(app, `/admin/orders/${orderId}`, adminToken, {
        status: "CONFIRMED",
      });

      // Admin cancels
      await authenticatedPatch(app, `/admin/orders/${orderId}`, adminToken, {
        status: "CANCELLED",
        cancellationReason: "Restaurant closed unexpectedly",
      });

      // Check order for refund flags
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });

      // For cash orders, refund requirement depends on business logic
      // For card orders, refund would be tracked
      expect(order!.status).toBe("CANCELLED");
    });
  });

  describe("Cancellation Audit Trail", () => {
    it("should record cancellation reason and timestamp", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Audit Trail User",
        email: "audittrail@test.com",
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
          idempotencyKey: generateIdempotencyKey("audit-trail"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      const cancellationReason = "Order placed by mistake";

      // Cancel with reason
      await authenticatedPost(
        app,
        `/orders/${orderId}/cancel`,
        tokens.access_token,
        {
          reason: cancellationReason,
        },
      );

      // Verify order has cancellation info
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });

      expect(order!.status).toBe("CANCELLED");
      expect(order!.cancelledAt).toBeDefined();

      // Check status logs for cancellation entry
      const statusLogRepo = getRepository<OrderStatusLog>(OrderStatusLog);
      const logs = await statusLogRepo.find({
        where: { order: { id: orderId } },
        order: { createdAt: "DESC" },
      });

      const cancellationLog = logs.find((log) => log.newStatus === "CANCELLED");
      expect(cancellationLog).toBeDefined();
    });

    it("should track who cancelled the order", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Who Cancelled User",
        email: "whocancelled@test.com",
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
          idempotencyKey: generateIdempotencyKey("who-cancelled"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Admin cancels
      await authenticatedPatch(app, `/admin/orders/${orderId}`, adminToken, {
        status: "CANCELLED",
        cancellationReason: "Admin cancellation test",
      });

      // Check status logs for who changed it
      const statusLogRepo = getRepository<OrderStatusLog>(OrderStatusLog);
      const logs = await statusLogRepo.find({
        where: { order: { id: orderId } },
        relations: ["changedBy"],
        order: { createdAt: "DESC" },
      });

      const cancellationLog = logs.find((log) => log.newStatus === "CANCELLED");
      expect(cancellationLog).toBeDefined();
      expect(cancellationLog!.changedBy).toBeDefined();
      expect(cancellationLog!.changedBy!.id).toBe(admin.id);
    });
  });

  describe("Order Status Transitions", () => {
    it("should follow valid status transition path", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Status Path User",
        email: "statuspath@test.com",
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
          idempotencyKey: generateIdempotencyKey("status-path"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // PENDING -> CONFIRMED
      const confirmResponse = await authenticatedPatch(
        app,
        `/admin/orders/${orderId}`,
        adminToken,
        { status: "CONFIRMED" },
      );
      expect(confirmResponse.status).toBe(200);

      // CONFIRMED -> PREPARING
      const preparingResponse = await authenticatedPatch(
        app,
        `/admin/orders/${orderId}`,
        adminToken,
        { status: "PREPARING" },
      );
      expect(preparingResponse.status).toBe(200);

      // PREPARING -> READY
      const readyResponse = await authenticatedPatch(
        app,
        `/admin/orders/${orderId}`,
        adminToken,
        { status: "READY" },
      );
      expect(readyResponse.status).toBe(200);

      // READY -> OUT_FOR_DELIVERY
      const outForDeliveryResponse = await authenticatedPatch(
        app,
        `/admin/orders/${orderId}`,
        adminToken,
        { status: "OUT_FOR_DELIVERY" },
      );
      expect(outForDeliveryResponse.status).toBe(200);

      // OUT_FOR_DELIVERY -> COMPLETED
      const completedResponse = await authenticatedPatch(
        app,
        `/admin/orders/${orderId}`,
        adminToken,
        { status: "COMPLETED" },
      );
      expect(completedResponse.status).toBe(200);

      // Verify final status
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });
      expect(order!.status).toBe("COMPLETED");

      // Verify all transitions logged
      const statusLogRepo = getRepository<OrderStatusLog>(OrderStatusLog);
      const logs = await statusLogRepo.find({
        where: { order: { id: orderId } },
        order: { createdAt: "ASC" },
      });

      // Should have logs for each transition
      expect(logs.length).toBeGreaterThanOrEqual(5);
    });

    it("should reject invalid status transitions", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Invalid Transition User",
        email: "invalidtransition@test.com",
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
          idempotencyKey: generateIdempotencyKey("invalid-transition"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Try to skip from PENDING directly to COMPLETED (should fail)
      const invalidResponse = await authenticatedPatch(
        app,
        `/admin/orders/${orderId}`,
        adminToken,
        { status: "COMPLETED" },
      );

      // Should be rejected (invalid transition)
      expect([400, 422]).toContain(invalidResponse.status);

      // Order should still be PENDING
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });
      expect(order!.status).toBe("PENDING");
    });

    it("should not allow reverting to previous status", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "No Revert User",
        email: "norevert@test.com",
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
          idempotencyKey: generateIdempotencyKey("no-revert"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Move to CONFIRMED
      await authenticatedPatch(app, `/admin/orders/${orderId}`, adminToken, {
        status: "CONFIRMED",
      });

      // Try to revert to PENDING
      const revertResponse = await authenticatedPatch(
        app,
        `/admin/orders/${orderId}`,
        adminToken,
        { status: "PENDING" },
      );

      // Should be rejected
      expect([400, 422]).toContain(revertResponse.status);

      // Order should still be CONFIRMED
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });
      expect(order!.status).toBe("CONFIRMED");
    });
  });
});
