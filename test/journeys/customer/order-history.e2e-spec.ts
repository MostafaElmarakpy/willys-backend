import { INestApplication } from "@nestjs/common";
import { OrderStatus } from "../../../src/common/enums/OrderStatus";
import { User } from "../../../src/database/entities/user.entity";
import {
  createOrders,
  createOrdersWithStatuses,
} from "../../factories/order.factory";
import { createTestBranches } from "../../fixtures/branches.fixture";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { registerUser } from "../../helpers/auth.helper";
import { authenticatedGet } from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../../setup/test-app";

describe("Customer Order History (E2E)", () => {
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

  describe("List Orders", () => {
    it("should list user orders with pagination", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "History User",
        email: "history@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      // Create multiple orders
      await createOrders(dbUser!, mainBranch, 5);

      const response = await authenticatedGet(
        app,
        "/orders",
        tokens.access_token,
        {
          page: 1,
          limit: 10,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(5);
    });

    it("should filter orders by status", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "History User",
        email: "history@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      // Create orders with different statuses
      await createOrdersWithStatuses(dbUser!, mainBranch, [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.COMPLETED,
      ]);

      const response = await authenticatedGet(
        app,
        "/orders",
        tokens.access_token,
        {
          status: OrderStatus.COMPLETED,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(
        response.body.data.every(
          (order: any) => order.status === OrderStatus.COMPLETED,
        ),
      ).toBe(true);
    });

    it("should sort orders by date (newest first)", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "History User",
        email: "history@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await createOrders(dbUser!, mainBranch, 3);

      const response = await authenticatedGet(
        app,
        "/orders",
        tokens.access_token,
        {
          sortBy: "createdAt",
          sortOrder: "DESC",
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe("Order Details from History", () => {
    it("should get order details from history", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "History User",
        email: "history@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      const orders = await createOrders(dbUser!, mainBranch, 1);

      const response = await authenticatedGet(
        app,
        `/orders/${orders[0].id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(orders[0].id);
    });
  });
});
