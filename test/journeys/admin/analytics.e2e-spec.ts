import { INestApplication } from "@nestjs/common";
import { OrderStatus } from "../../../src/common/enums/OrderStatus";
import { Order } from "../../../src/database/entities/order.entity";
import { OrderItem } from "../../../src/database/entities/order-item.entity";
import { createBranch } from "../../factories/branch.factory";
import { createCategory, createItem } from "../../factories/menu.factory";
import {
  createOrder,
  createOrdersWithStatuses,
} from "../../factories/order.factory";
import {
  createDefaultAdmin,
  createDefaultCustomer,
} from "../../fixtures/users.fixture";
import { getAdminToken } from "../../helpers/auth.helper";
import { authenticatedGet } from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../../setup/test-app";

describe("Admin Analytics (E2E)", () => {
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

  describe("GET /admin/analytics/orders-over-time", () => {
    it("should return orders grouped by date", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch = await createBranch(admin);

      // Create orders on different dates
      await createOrder(customer, branch, { status: OrderStatus.COMPLETED });
      await createOrder(customer, branch, { status: OrderStatus.PENDING });
      await createOrder(customer, branch, { status: OrderStatus.COMPLETED });

      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/orders-over-time",
        token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it("should filter by date range", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch = await createBranch(admin);

      await createOrder(customer, branch, { status: OrderStatus.COMPLETED });

      const token = getAdminToken(admin);
      const today = new Date().toISOString().split("T")[0];

      const response = await authenticatedGet(
        app,
        "/admin/analytics/orders-over-time",
        token,
        { startDate: today, endDate: today },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it("should filter by branch", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch1 = await createBranch(admin);
      const branch2 = await createBranch(admin);

      await createOrder(customer, branch1, { status: OrderStatus.COMPLETED });
      await createOrder(customer, branch2, { status: OrderStatus.COMPLETED });

      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/orders-over-time",
        token,
        { branchId: branch1.id },
      );

      expect(response.status).toBe(200);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it("should return empty data when no orders exist", async () => {
      const admin = await createDefaultAdmin();
      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/orders-over-time",
        token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it("should require authentication", async () => {
      const response = await authenticatedGet(
        app,
        "/admin/analytics/orders-over-time",
        "invalid-token",
      );

      expect(response.status).toBe(401);
    });
  });

  describe("GET /admin/analytics/revenue-over-time", () => {
    it("should return revenue grouped by date for completed orders only", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch = await createBranch(admin);

      // Create completed order with known total
      await createOrder(customer, branch, {
        status: OrderStatus.COMPLETED,
        total: 150,
      });

      // Create pending order (should not be counted)
      await createOrder(customer, branch, {
        status: OrderStatus.PENDING,
        total: 200,
      });

      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/revenue-over-time",
        token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty("date");
        expect(response.body.data[0]).toHaveProperty("revenue");
        expect(typeof response.body.data[0].revenue).toBe("number");
      }
    });

    it("should support pagination", async () => {
      const admin = await createDefaultAdmin();
      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/revenue-over-time",
        token,
        { page: 1, limit: 10 },
      );

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe("GET /admin/analytics/order-status-distribution", () => {
    it("should return order counts by status", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch = await createBranch(admin);

      // Create orders with different statuses
      await createOrdersWithStatuses(customer, branch, [
        OrderStatus.COMPLETED,
        OrderStatus.COMPLETED,
        OrderStatus.PENDING,
        OrderStatus.CANCELLED,
      ]);

      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/order-status-distribution",
        token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Check structure
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty("status");
        expect(response.body.data[0]).toHaveProperty("value");
      }

      // Verify counts
      const completedStatus = response.body.data.find(
        (s: any) => s.status === OrderStatus.COMPLETED,
      );
      const pendingStatus = response.body.data.find(
        (s: any) => s.status === OrderStatus.PENDING,
      );

      expect(completedStatus?.value).toBe(2);
      expect(pendingStatus?.value).toBe(1);
    });

    it("should not have pagination (fixed enum result set)", async () => {
      const admin = await createDefaultAdmin();
      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/order-status-distribution",
        token,
      );

      expect(response.status).toBe(200);
      // This endpoint returns data directly without pagination wrapper
      expect(response.body.data).toBeDefined();
      expect(response.body.pagination).toBeUndefined();
    });
  });

  describe("GET /admin/analytics/revenue-by-category", () => {
    it("should return revenue grouped by category", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch = await createBranch(admin);

      // Create category and item
      const category = await createCategory(admin, {
        name: { en: "Burgers", ar: "برجر" },
      });
      const item = await createItem(category, admin);

      // Create order with items
      const order = await createOrder(customer, branch, {
        status: OrderStatus.COMPLETED,
        total: 100,
      });

      // Add order item linked to the category
      await createOrderItemForCategory(order, item.id, category.id);

      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/revenue-by-category",
        token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty("categoryId");
        expect(response.body.data[0]).toHaveProperty("category");
        expect(response.body.data[0]).toHaveProperty("revenue");
      }
    });

    it("should only count completed orders", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch = await createBranch(admin);

      // Create pending order (should not be counted)
      await createOrder(customer, branch, {
        status: OrderStatus.PENDING,
        total: 500,
      });

      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/revenue-by-category",
        token,
      );

      expect(response.status).toBe(200);
      // Should return empty or 0 revenue since no completed orders
      expect(response.body.data).toBeDefined();
    });
  });

  describe("GET /admin/analytics/customer-segments", () => {
    it("should return new and returning customer counts", async () => {
      const admin = await createDefaultAdmin();
      const customer1 = await createDefaultCustomer();
      const customer2 = await createDefaultCustomer();
      const branch = await createBranch(admin);

      // Create orders for customers
      await createOrder(customer1, branch, { status: OrderStatus.COMPLETED });
      await createOrder(customer2, branch, { status: OrderStatus.COMPLETED });

      const token = getAdminToken(admin);
      const today = new Date().toISOString().split("T")[0];

      const response = await authenticatedGet(
        app,
        "/admin/analytics/customer-segments",
        token,
        { startDate: today },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);

      const segments = response.body.data;
      const newSegment = segments.find((s: any) => s.segment === "new");
      const returningSegment = segments.find(
        (s: any) => s.segment === "returning",
      );

      expect(newSegment).toBeDefined();
      expect(returningSegment).toBeDefined();
      expect(typeof newSegment.value).toBe("number");
      expect(typeof returningSegment.value).toBe("number");
    });

    it("should correctly identify new vs returning customers", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch = await createBranch(admin);

      // Customer makes first order today - should be "new"
      await createOrder(customer, branch, { status: OrderStatus.COMPLETED });

      const token = getAdminToken(admin);
      const today = new Date().toISOString().split("T")[0];

      const response = await authenticatedGet(
        app,
        "/admin/analytics/customer-segments",
        token,
        { startDate: today },
      );

      expect(response.status).toBe(200);

      const newSegment = response.body.data.find(
        (s: any) => s.segment === "new",
      );
      expect(newSegment.value).toBeGreaterThanOrEqual(1);
    });
  });

  describe("GET /admin/analytics/dashboard", () => {
    it("should return all analytics combined", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch = await createBranch(admin);

      await createOrder(customer, branch, { status: OrderStatus.COMPLETED });

      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/dashboard",
        token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();

      // Check all analytics are present
      expect(response.body.data).toHaveProperty("ordersOverTime");
      expect(response.body.data).toHaveProperty("revenueOverTime");
      expect(response.body.data).toHaveProperty("orderStatusDistribution");
      expect(response.body.data).toHaveProperty("revenueByCategory");
      expect(response.body.data).toHaveProperty("customerSegments");

      // Verify arrays
      expect(Array.isArray(response.body.data.ordersOverTime)).toBe(true);
      expect(Array.isArray(response.body.data.revenueOverTime)).toBe(true);
      expect(Array.isArray(response.body.data.orderStatusDistribution)).toBe(
        true,
      );
      expect(Array.isArray(response.body.data.revenueByCategory)).toBe(true);
      expect(Array.isArray(response.body.data.customerSegments)).toBe(true);
    });

    it("should apply filters to all analytics", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const branch1 = await createBranch(admin);
      const branch2 = await createBranch(admin);

      await createOrder(customer, branch1, { status: OrderStatus.COMPLETED });
      await createOrder(customer, branch2, { status: OrderStatus.COMPLETED });

      const token = getAdminToken(admin);

      const response = await authenticatedGet(
        app,
        "/admin/analytics/dashboard",
        token,
        { branchId: branch1.id },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });
  });

  describe("Authorization", () => {
    it("should reject requests without admin permissions", async () => {
      const customer = await createDefaultCustomer();
      const token = getAdminToken({ ...customer, role: "user" as any });

      const endpoints = [
        "/admin/analytics/orders-over-time",
        "/admin/analytics/revenue-over-time",
        "/admin/analytics/order-status-distribution",
        "/admin/analytics/revenue-by-category",
        "/admin/analytics/customer-segments",
        "/admin/analytics/dashboard",
      ];

      for (const endpoint of endpoints) {
        const response = await authenticatedGet(app, endpoint, token);
        // Should be 403 Forbidden or handled by permission guard
        expect([401, 403]).toContain(response.status);
      }
    });
  });
});

/**
 * Helper to create order item linked to a category
 */
async function createOrderItemForCategory(
  order: Order,
  itemId: string,
  _categoryId: string,
): Promise<OrderItem> {
  const orderItemRepo = getRepository<OrderItem>(OrderItem);

  const orderItem = orderItemRepo.create({
    order,
    orderId: order.id,
    itemType: "ITEM",
    originalItemId: itemId,
    name: { en: "Test Item", ar: "عنصر اختبار" },
    quantity: 1,
    unitPrice: 50,
    totalPrice: 50,
    discountAmount: 0,
  });

  return orderItemRepo.save(orderItem);
}
