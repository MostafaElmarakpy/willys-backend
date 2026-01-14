import { INestApplication } from "@nestjs/common";
import { ItemStatus } from "../../../src/common/enums/ItemStatus";
import {
  createCategory,
  createIngredientCategory,
  createItem,
} from "../../factories/menu.factory";
import { createDefaultAdmin } from "../../fixtures/users.fixture";
import { loginUser } from "../../helpers/auth.helper";
import {
  authenticatedDelete,
  authenticatedPatch,
  authenticatedPost,
} from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
} from "../../setup/test-app";

describe("Admin Menu Management (E2E)", () => {
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

  describe("Category Management", () => {
    it("should create new menu category", async () => {
      const admin = await createDefaultAdmin();
      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/menu/categories",
        tokens.access_token,
        {
          name: { en: "Appetizers", ar: "المقبلات" },
          description: { en: "Delicious appetizers", ar: "مقبلات لذيذة" },
          isActive: true,
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.name.en).toBe("Appetizers");
    });

    it("should update category", async () => {
      const admin = await createDefaultAdmin();
      const category = await createCategory(admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/menu/categories/${category.id}`,
        tokens.access_token,
        {
          name: { en: "Updated Name", ar: "اسم محدث" },
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.name.en).toBe("Updated Name");
    });

    it("should delete category", async () => {
      const admin = await createDefaultAdmin();
      const category = await createCategory(admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedDelete(
        app,
        `/menu/categories/${category.id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Item Management", () => {
    it("should create item with simple pricing", async () => {
      const admin = await createDefaultAdmin();
      const category = await createCategory(admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/menu/items",
        tokens.access_token,
        {
          name: { en: "Test Item", ar: "عنصر اختبار" },
          categoryId: category.id,
          pricing: 50.0,
          status: ItemStatus.ACTIVE,
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.pricing).toBe(50.0);
    });

    it("should create item with variant pricing", async () => {
      const admin = await createDefaultAdmin();
      const category = await createCategory(admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/menu/items",
        tokens.access_token,
        {
          name: { en: "Sized Item", ar: "عنصر بأحجام" },
          categoryId: category.id,
          pricing: {
            type: "object",
            variants: [
              {
                name: "Size",
                values: [
                  { value: "Small", price: "30.00" },
                  { value: "Large", price: "50.00" },
                ],
              },
            ],
          },
          status: ItemStatus.ACTIVE,
        },
      );

      expect(response.status).toBe(201);
    });

    it("should update item", async () => {
      const admin = await createDefaultAdmin();
      const category = await createCategory(admin);
      const item = await createItem(category, admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/menu/items/${item.id}`,
        tokens.access_token,
        {
          name: { en: "Updated Item", ar: "عنصر محدث" },
        },
      );

      expect(response.status).toBe(200);
    });

    it("should archive item", async () => {
      const admin = await createDefaultAdmin();
      const category = await createCategory(admin);
      const item = await createItem(category, admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/menu/items/${item.id}`,
        tokens.access_token,
        {
          status: ItemStatus.ARCHIVED,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(ItemStatus.ARCHIVED);
    });
  });

  describe("Ingredient Management", () => {
    it("should create ingredient category", async () => {
      const admin = await createDefaultAdmin();

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/menu/ingredient-categories",
        tokens.access_token,
        {
          name: { en: "Toppings", ar: "الإضافات" },
        },
      );

      expect(response.status).toBe(201);
    });

    it("should create ingredient", async () => {
      const admin = await createDefaultAdmin();
      const ingredientCategory = await createIngredientCategory(admin);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/menu/ingredients",
        tokens.access_token,
        {
          name: { en: "Cheese", ar: "جبنة" },
          categoryId: ingredientCategory.id,
          price: 10.0,
        },
      );

      expect(response.status).toBe(201);
    });
  });
});
