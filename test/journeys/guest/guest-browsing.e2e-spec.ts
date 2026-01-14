import { INestApplication } from "@nestjs/common";
import { createTestBranches } from "../../fixtures/branches.fixture";
import { createTestMenu } from "../../fixtures/menu.fixture";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { publicGet } from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
} from "../../setup/test-app";

describe("Guest Browsing (E2E)", () => {
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

  describe("Public Menu Browsing", () => {
    it("should browse branches without authentication", async () => {
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);

      const response = await publicGet(app, "/branches");

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should get branch details without authentication", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const response = await publicGet(app, `/branches/${mainBranch.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(mainBranch.id);
    });

    it("should browse menu categories without authentication", async () => {
      const admin = await createDefaultAdmin();
      await createTestMenu(admin);

      const response = await publicGet(app, "/menu/categories");

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it("should get item details without authentication", async () => {
      const admin = await createDefaultAdmin();
      const menu = await createTestMenu(admin);

      const response = await publicGet(
        app,
        `/menu/items/${menu.items.burger.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(menu.items.burger.id);
    });

    it("should get bundle details without authentication", async () => {
      const admin = await createDefaultAdmin();
      const menu = await createTestMenu(admin);

      const response = await publicGet(
        app,
        `/menu/bundles/${menu.bundles.mealDeal.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(menu.bundles.mealDeal.id);
    });

    it("should search for items without authentication", async () => {
      const admin = await createDefaultAdmin();
      await createTestMenu(admin);

      const response = await publicGet(app, "/menu/search", {
        query: "burger",
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe("Delivery Zone Checks", () => {
    it("should check delivery availability without authentication", async () => {
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);

      const response = await publicGet(app, "/zones/check", {
        latitude: 30.0444,
        longitude: 31.2357,
      });

      expect(response.status).toBe(200);
    });

    it("should find nearby branches without authentication", async () => {
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);

      const response = await publicGet(app, "/branches/nearby", {
        latitude: 30.0444,
        longitude: 31.2357,
        radius: 10,
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe("Authentication Required Endpoints", () => {
    it("should reject cart access without authentication", async () => {
      const response = await publicGet(app, "/cart");

      expect(response.status).toBe(401); // Unauthorized
    });

    it("should reject checkout without authentication", async () => {
      const response = await publicGet(app, "/orders/checkout");

      expect(response.status).toBe(401);
    });

    it("should reject order history without authentication", async () => {
      const response = await publicGet(app, "/orders");

      expect(response.status).toBe(401);
    });
  });
});
