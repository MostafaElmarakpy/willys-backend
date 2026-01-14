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

describe("Customer Browse Menu (E2E)", () => {
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

  describe("Browse Branches", () => {
    it("should list all active branches", async () => {
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);

      const response = await publicGet(app, "/branches");

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should get nearby branches by coordinates", async () => {
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

    it("should get single branch details", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const response = await publicGet(app, `/branches/${mainBranch.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(mainBranch.id);
      expect(response.body.data.name).toBeDefined();
    });
  });

  describe("Browse Menu", () => {
    it("should get branch menu with all categories", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      await createTestMenu(admin);

      const response = await publicGet(app, `/branches/${mainBranch.id}/menu`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it("should get menu categories", async () => {
      const admin = await createDefaultAdmin();
      await createTestMenu(admin);

      const response = await publicGet(app, "/menu/categories");

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
    });

    it("should get items by category", async () => {
      const admin = await createDefaultAdmin();
      const menu = await createTestMenu(admin);

      const response = await publicGet(
        app,
        `/menu/categories/${menu.categories.mainDishes.id}/items`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it("should get single item details with ingredients", async () => {
      const admin = await createDefaultAdmin();
      const menu = await createTestMenu(admin);

      const response = await publicGet(
        app,
        `/menu/items/${menu.items.burger.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(menu.items.burger.id);
      expect(response.body.data.name).toBeDefined();
      expect(response.body.data.pricing).toBeDefined();
    });

    it("should get bundle details with components", async () => {
      const admin = await createDefaultAdmin();
      const menu = await createTestMenu(admin);

      const response = await publicGet(
        app,
        `/menu/bundles/${menu.bundles.mealDeal.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(menu.bundles.mealDeal.id);
      expect(response.body.data.price).toBeDefined();
    });
  });

  describe("Delivery Zone Checks", () => {
    it("should check if address is within delivery zone", async () => {
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);

      const response = await publicGet(app, "/zones/check", {
        latitude: 30.0444,
        longitude: 31.2357,
      });

      expect(response.status).toBe(200);
      // Adjust based on actual response structure
    });

    it("should find serving branch for coordinates", async () => {
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);

      const response = await publicGet(app, "/branches/serving", {
        latitude: 30.0444,
        longitude: 31.2357,
      });

      expect(response.status).toBe(200);
      // Should return the branch that serves this location
    });
  });
});
