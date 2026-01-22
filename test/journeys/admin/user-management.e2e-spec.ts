import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
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
      expect(response.body.data.users).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
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
        "/admin/users/management",
        tokens.access_token,
        {
          page: 1,
          limit: 10,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.users).toBeInstanceOf(Array);
    });
  });

  describe("Create Users", () => {
    it("should create admin user", async () => {
      const admin = await createDefaultAdmin();
      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const uniqueEmail = `newadmin-${Date.now()}@test.com`;
      // Generate valid Egyptian phone number (starts with 10, 11, 12, or 15)
      const prefixes = ["10", "11", "12", "15"];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const uniquePhone = `${prefix}${Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, "0")}`;

      const response = await request(app.getHttpServer())
        .post("/admin/users")
        .set("Authorization", `Bearer ${tokens.access_token}`)
        .set("api-version", "1")
        .field("fullName", "New Admin")
        .field("email", uniqueEmail)
        .field("password", "Admin@1234")
        .field("role", UserRole.admin)
        .field("userLocale", "en")
        .field("phoneNumber", uniquePhone)
        .field("phoneNumberCountryCode", "EG");

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
