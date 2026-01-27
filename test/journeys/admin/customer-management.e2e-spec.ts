import { INestApplication } from "@nestjs/common";
import { OrderStatus } from "../../../src/common/enums/OrderStatus";
import { OrderType } from "../../../src/common/enums/OrderType";
import {
  createOrder,
  createOrders,
  createOrdersWithStatuses,
} from "../../factories/order.factory";
import { createTestBranches } from "../../fixtures/branches.fixture";
import {
  createDefaultAdmin,
  createDefaultCustomer,
} from "../../fixtures/users.fixture";
import { loginUser } from "../../helpers/auth.helper";
import {
  authenticatedDelete,
  authenticatedGet,
} from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
} from "../../setup/test-app";

describe("Admin Customer Management (E2E)", () => {
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

  describe("List Customers", () => {
    it("should list all customers with pagination", async () => {
      const admin = await createDefaultAdmin();
      await createDefaultCustomer();
      await createDefaultCustomer();
      await createDefaultCustomer();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers",
        tokens.access_token,
        {
          page: 1,
          limit: 10,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it("should return customer order statistics", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      // Create completed orders for customer
      await createOrdersWithStatuses(customer, mainBranch, [
        OrderStatus.COMPLETED,
        OrderStatus.COMPLETED,
        OrderStatus.COMPLETED,
      ]);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers",
        tokens.access_token,
      );

      expect(response.status).toBe(200);

      const customerData = response.body.data.find(
        (c: any) => c.id === customer.id,
      );
      expect(customerData).toBeDefined();
      expect(customerData.totalOrders).toBe(3);
      expect(customerData.totalSpent).toBeDefined();
      expect(customerData.lastOrderDate).toBeDefined();
    });

    it("should filter by last order date - today", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      // Create order today
      await createOrder(customer, mainBranch, {
        status: OrderStatus.COMPLETED,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers",
        tokens.access_token,
        { lastOrderFilter: "today" },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it("should filter by last order date - last 7 days", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      await createOrder(customer, mainBranch, {
        status: OrderStatus.COMPLETED,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers",
        tokens.access_token,
        { lastOrderFilter: "last7days" },
      );

      expect(response.status).toBe(200);
    });

    it("should sort by highest spent", async () => {
      const admin = await createDefaultAdmin();
      const customer1 = await createDefaultCustomer();
      const customer2 = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      // Customer 1 spends 100
      await createOrder(customer1, mainBranch, {
        status: OrderStatus.COMPLETED,
        total: 100,
      });

      // Customer 2 spends 500
      await createOrder(customer2, mainBranch, {
        status: OrderStatus.COMPLETED,
        total: 500,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers",
        tokens.access_token,
        { sortBy: "highestSpent", sortOrder: "DESC" },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it("should sort by most orders", async () => {
      const admin = await createDefaultAdmin();
      const customer1 = await createDefaultCustomer();
      const customer2 = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      // Customer 1 has 1 order
      await createOrders(customer1, mainBranch, 1);

      // Customer 2 has 5 orders
      await createOrders(customer2, mainBranch, 5);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers",
        tokens.access_token,
        { sortBy: "mostOrders", sortOrder: "DESC" },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it("should search customers by name", async () => {
      const admin = await createDefaultAdmin();
      await createDefaultCustomer(); // Creates "Test Customer"

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers",
        tokens.access_token,
        { search: "Test" },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("should search customers by email", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const emailPrefix = customer.email!.split("@")[0];

      const response = await authenticatedGet(
        app,
        "/admin/customers",
        tokens.access_token,
        { search: emailPrefix },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe("Get Customer Details", () => {
    it("should return customer details with analytics", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      // Create orders for customer
      await createOrdersWithStatuses(customer, mainBranch, [
        OrderStatus.COMPLETED,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ]);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        `/admin/customers/${customer.id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(customer.id);
      expect(response.body.data.fullName).toBe(customer.fullName);
      expect(response.body.data.analytics).toBeDefined();
      expect(response.body.data.analytics.totalOrders).toBe(3);
      expect(response.body.data.analytics.completedOrders).toBe(2);
      expect(response.body.data.analytics.cancelledOrders).toBe(1);
      expect(response.body.data.orders).toBeDefined();
      expect(response.body.data.discountUsage).toBeDefined();
    });

    it("should filter customer orders by order type", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      // Create orders with different types
      await createOrder(customer, mainBranch, {
        orderType: OrderType.DELIVERY,
        status: OrderStatus.COMPLETED,
      });
      await createOrder(customer, mainBranch, {
        orderType: OrderType.PICKUP,
        status: OrderStatus.COMPLETED,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        `/admin/customers/${customer.id}`,
        tokens.access_token,
        { orderType: OrderType.PICKUP },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.orders.items.length).toBe(1);
      expect(response.body.data.orders.items[0].orderType).toBe(
        OrderType.PICKUP,
      );
    });

    it("should filter customer orders by date range", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      await createOrders(customer, mainBranch, 3);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const today = new Date();
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - 7);

      const response = await authenticatedGet(
        app,
        `/admin/customers/${customer.id}`,
        tokens.access_token,
        {
          fromDate: fromDate.toISOString(),
          toDate: today.toISOString(),
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.orders.items).toBeInstanceOf(Array);
    });

    it("should paginate customer orders", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      // Create 15 orders
      await createOrders(customer, mainBranch, 15);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        `/admin/customers/${customer.id}`,
        tokens.access_token,
        { page: 1, limit: 10 },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.orders.items.length).toBe(10);
      expect(response.body.data.orders.total).toBe(15);
      expect(response.body.data.orders.totalPages).toBe(2);
    });

    it("should return 404 for non-existent customer", async () => {
      const admin = await createDefaultAdmin();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers/550e8400-e29b-41d4-a716-446655440000",
        tokens.access_token,
      );

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid UUID", async () => {
      const admin = await createDefaultAdmin();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers/invalid-uuid",
        tokens.access_token,
      );

      expect(response.status).toBe(400);
    });
  });

  describe("Get Customer Orders", () => {
    it("should return paginated orders for a customer", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      await createOrders(customer, mainBranch, 5);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        `/admin/customers/${customer.id}/orders`,
        tokens.access_token,
        { page: 1, limit: 10 },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(5);
      expect(response.body.pagination).toBeDefined();
    });

    it("should filter orders by status", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      await createOrdersWithStatuses(customer, mainBranch, [
        OrderStatus.PENDING,
        OrderStatus.COMPLETED,
        OrderStatus.COMPLETED,
      ]);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        `/admin/customers/${customer.id}/orders`,
        tokens.access_token,
        { status: OrderStatus.COMPLETED },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
      expect(
        response.body.data.every(
          (order: any) => order.status === OrderStatus.COMPLETED,
        ),
      ).toBe(true);
    });
  });

  describe("Get Customer Analytics", () => {
    it("should return customer analytics", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      await createOrdersWithStatuses(customer, mainBranch, [
        OrderStatus.COMPLETED,
        OrderStatus.COMPLETED,
      ]);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        `/admin/customers/${customer.id}/analytics`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.totalOrders).toBe(2);
      expect(response.body.data.completedOrders).toBe(2);
      expect(response.body.data.totalSpent).toBeDefined();
      expect(response.body.data.averageOrderValue).toBeDefined();
    });
  });

  describe("Delete Customer", () => {
    it("should soft delete a customer", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedDelete(
        app,
        `/admin/customers/${customer.id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);

      // Verify customer is soft deleted (no longer retrievable)
      const getResponse = await authenticatedGet(
        app,
        `/admin/customers/${customer.id}`,
        tokens.access_token,
      );
      expect(getResponse.status).toBe(404);
    });

    it("should return 404 when deleting non-existent customer", async () => {
      const admin = await createDefaultAdmin();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedDelete(
        app,
        "/admin/customers/550e8400-e29b-41d4-a716-446655440000",
        tokens.access_token,
      );

      expect(response.status).toBe(404);
    });
  });

  describe("Permission Enforcement", () => {
    it("should deny access for regular customers", async () => {
      const customer = await createDefaultCustomer();

      const { tokens } = await loginUser(app, {
        identifier: customer.email!,
        password: "Test@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/customers",
        tokens.access_token,
      );

      expect(response.status).toBe(403);
    });

    it("should deny delete access for customers without DELETE permission", async () => {
      const customer = await createDefaultCustomer();
      const targetCustomer = await createDefaultCustomer();

      const { tokens } = await loginUser(app, {
        identifier: customer.email!,
        password: "Test@1234",
      });

      const response = await authenticatedDelete(
        app,
        `/admin/customers/${targetCustomer.id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(403);
    });
  });
});
