import { INestApplication } from "@nestjs/common";
import { createBranch, createZone } from "../../factories/branch.factory";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { loginUser } from "../../helpers/auth.helper";
import {
  authenticatedDelete,
  authenticatedPatch,
  authenticatedPost,
  authenticatedPut,
} from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
} from "../../setup/test-app";

describe("Admin Branch Management (E2E)", () => {
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

  describe("Branch Management", () => {
    it("should create new branch", async () => {
      const admin = await createDefaultAdmin();
      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/admin/branches",
        tokens.access_token,
        {
          name: { en: "New Branch", ar: "فرع جديد" },
          address: "123 Test Street, Cairo",
          latitude: 30.0444,
          longitude: 31.2357,
          phone: "+201234567890",
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.name.en).toBe("New Branch");
    });

    it("should update branch", async () => {
      const admin = await createDefaultAdmin();
      const branch = await createBranch(admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPut(
        app,
        `/admin/branches/${branch.id}`,
        tokens.access_token,
        {
          name: { en: "Updated Branch", ar: "فرع محدث" },
        },
      );

      expect(response.status).toBe(200);
    });

    it("should toggle branch status", async () => {
      const admin = await createDefaultAdmin();
      const branch = await createBranch(admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/admin/branches/${branch.id}/toggle-status`,
        tokens.access_token,
        {
          status: "active",
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(false);
    });

    it("should delete branch", async () => {
      const admin = await createDefaultAdmin();
      const branch = await createBranch(admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedDelete(
        app,
        `/admin/branches/${branch.id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Zone Management", () => {
    it("should create delivery zone", async () => {
      const admin = await createDefaultAdmin();
      const branch = await createBranch(admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/admin/zones",
        tokens.access_token,
        {
          branchId: branch.id,
          name: { en: "Zone 1", ar: "منطقة 1" },
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [31.0, 30.0],
                [31.5, 30.0],
                [31.5, 30.5],
                [31.0, 30.5],
                [31.0, 30.0],
              ],
            ],
          },
          deliveryFee: 25,
        },
      );

      expect(response.status).toBe(201);
    });

    it("should update zone", async () => {
      const admin = await createDefaultAdmin();
      const branch = await createBranch(admin);
      const zone = await createZone(branch, admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPut(
        app,
        `/admin/zones/${zone.id}`,
        tokens.access_token,
        {
          branchId: branch.id,
          polygon: {
            type: "Polygon",
            coordinates: [
              [
                [31.0, 30.0],
                [31.5, 30.0],
                [31.5, 30.5],
                [31.0, 30.5],
                [31.0, 30.0],
              ],
            ],
          },
          deliveryFee: 30,
        },
      );

      expect(response.status).toBe(200);
    });

    it("should delete zone", async () => {
      const admin = await createDefaultAdmin();
      const branch = await createBranch(admin);
      const zone = await createZone(branch, admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedDelete(
        app,
        `/admin/zones/${zone.id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
    });
  });
});
