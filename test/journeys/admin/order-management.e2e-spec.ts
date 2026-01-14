import { INestApplication } from "@nestjs/common";
import { OrderStatus } from "../../../src/common/enums/OrderStatus";
import { createOrder } from "../../factories/order.factory";
import { createTestBranches } from "../../fixtures/branches.fixture";
import {
  createDefaultAdmin,
  createDefaultCustomer,
} from "../../fixtures/users.fixture";
import { loginUser } from "../../helpers/auth.helper";
import {
  authenticatedGet,
  authenticatedPatch,
  authenticatedPost,
} from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
} from "../../setup/test-app";

describe("Admin Order Management (E2E)", () => {
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

  describe("List & Filter Orders", () => {
    it("should list all orders with pagination", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      // Create test orders
      await createOrder(customer, mainBranch);
      await createOrder(customer, mainBranch);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/orders",
        tokens.access_token,
        {
          page: 1,
          limit: 10,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it("should filter orders by branch", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch, secondBranch } = await createTestBranches(admin);

      await createOrder(customer, mainBranch);
      await createOrder(customer, secondBranch);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/orders",
        tokens.access_token,
        {
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(200);
    });

    it("should filter orders by status", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      await createOrder(customer, mainBranch, { status: OrderStatus.PENDING });
      await createOrder(customer, mainBranch, {
        status: OrderStatus.CONFIRMED,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/orders",
        tokens.access_token,
        {
          status: OrderStatus.PENDING,
        },
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Order Status Updates", () => {
    it("should confirm pending order", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      const order = await createOrder(customer, mainBranch, {
        status: OrderStatus.PENDING,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/admin/orders/${order.id}/status`,
        tokens.access_token,
        {
          status: OrderStatus.CONFIRMED,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(OrderStatus.CONFIRMED);
    });

    it("should move order to preparing", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      const order = await createOrder(customer, mainBranch, {
        status: OrderStatus.CONFIRMED,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/admin/orders/${order.id}/status`,
        tokens.access_token,
        {
          status: OrderStatus.PREPARING,
        },
      );

      expect(response.status).toBe(200);
    });

    it("should mark order as ready", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      const order = await createOrder(customer, mainBranch, {
        status: OrderStatus.PREPARING,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/admin/orders/${order.id}/status`,
        tokens.access_token,
        {
          status: OrderStatus.READY,
        },
      );

      expect(response.status).toBe(200);
    });

    it("should complete order", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      const order = await createOrder(customer, mainBranch, {
        status: OrderStatus.OUT_FOR_DELIVERY,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/admin/orders/${order.id}/status`,
        tokens.access_token,
        {
          status: OrderStatus.COMPLETED,
        },
      );

      expect(response.status).toBe(200);
    });

    it("should cancel order with reason", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const { mainBranch } = await createTestBranches(admin);

      const order = await createOrder(customer, mainBranch, {
        status: OrderStatus.PENDING,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        `/admin/orders/${order.id}/cancel`,
        tokens.access_token,
        {
          reason: "Out of stock",
        },
      );

      expect(response.status).toBe(200);
    });
  });
});
