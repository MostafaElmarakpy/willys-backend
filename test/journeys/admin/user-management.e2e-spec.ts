import { INestApplication } from "@nestjs/common";
import { UserRole } from "../../../src/common/enums/UserRole";
import { createUsers } from "../../factories/user.factory";
import {
  createDefaultAdmin,
  createDefaultCustomer,
} from "../../fixtures/users.fixture";
import { loginUser } from "../../helpers/auth.helper";
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

describe("Admin User Management (E2E)", () => {
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

  describe("List Users", () => {
    it("should list all users with pagination", async () => {
      const admin = await createDefaultAdmin();
      await createUsers(3); // Create 3 regular users

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/users",
        tokens.access_token,
        {
          page: 1,
          limit: 10,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it("should list only management users", async () => {
      const admin = await createDefaultAdmin();
      await createDefaultCustomer();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        "/admin/users",
        tokens.access_token,
        {
          role: UserRole.admin,
        },
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Create Users", () => {
    it("should create admin user", async () => {
      const admin = await createDefaultAdmin();
      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/admin/users",
        tokens.access_token,
        {
          fullName: "New Admin",
          email: "newadmin@test.com",
          password: "Admin@1234",
          role: UserRole.admin,
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.role).toBe(UserRole.admin);
    });
  });

  describe("Update Users", () => {
    it("should update user details", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/admin/users/${customer.id}`,
        tokens.access_token,
        {
          fullName: "Updated Name",
        },
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Delete Users", () => {
    it("should delete user", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedDelete(
        app,
        `/admin/users/${customer.id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Permission Enforcement", () => {
    it("should enforce RBAC for admin endpoints", async () => {
      const customer = await createDefaultCustomer();

      const { tokens } = await loginUser(app, {
        identifier: customer.email!,
        password: "Test@1234",
      });

      // Customer trying to access admin endpoint
      const response = await authenticatedGet(
        app,
        "/admin/users",
        tokens.access_token,
      );

      expect(response.status).toBe(403); // Forbidden
    });
  });
});
