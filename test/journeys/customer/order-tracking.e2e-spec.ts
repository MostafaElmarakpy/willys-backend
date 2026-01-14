import { INestApplication } from "@nestjs/common";
import { OrderStatus } from "../../../src/common/enums/OrderStatus";
import { User } from "../../../src/database/entities/user.entity";
import { createOrder } from "../../factories/order.factory";
import { createTestBranches } from "../../fixtures/branches.fixture";
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

describe("Customer Order Tracking (E2E)", () => {
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

  describe("Order Details", () => {
    it("should get order details by ID", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Order User",
        email: "order@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      const order = await createOrder(dbUser!, mainBranch);

      const response = await authenticatedGet(
        app,
        `/orders/${order.id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(order.id);
      expect(response.body.data.orderNumber).toBe(order.orderNumber);
    });

    it("should get order status and history", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Order User",
        email: "order@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      const order = await createOrder(dbUser!, mainBranch);

      const response = await authenticatedGet(
        app,
        `/orders/${order.id}`,
        tokens.access_token,
      );

      expect(response.body.data.status).toBeDefined();
    });
  });

  describe("Order Cancellation", () => {
    it("should cancel pending order", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Order User",
        email: "order@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      const order = await createOrder(dbUser!, mainBranch, {
        status: OrderStatus.PENDING,
      });

      const response = await authenticatedPost(
        app,
        `/orders/${order.id}/cancel`,
        tokens.access_token,
        {
          reason: "Changed my mind",
        },
      );

      expect(response.status).toBe(200);
    });

    it("should not cancel preparing order", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Order User",
        email: "order@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      const order = await createOrder(dbUser!, mainBranch, {
        status: OrderStatus.PREPARING,
      });

      const response = await authenticatedPost(
        app,
        `/orders/${order.id}/cancel`,
        tokens.access_token,
        {
          reason: "Changed my mind",
        },
      );

      expect(response.status).toBe(400); // Cannot cancel
    });
  });

  describe("Reorder", () => {
    it("should reorder previous order", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Order User",
        email: "order@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      const order = await createOrder(dbUser!, mainBranch, {
        status: OrderStatus.COMPLETED,
      });

      const response = await authenticatedPost(
        app,
        `/orders/${order.id}/reorder`,
        tokens.access_token,
        {},
      );

      expect(response.status).toBe(201);
      // Should create new cart with items from old order
    });
  });
});
