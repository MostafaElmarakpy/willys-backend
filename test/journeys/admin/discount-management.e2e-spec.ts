import { INestApplication } from "@nestjs/common";
import { DiscountStatus } from "../../../src/common/enums/DiscountStatus";
import { DiscountType } from "../../../src/common/enums/DiscountType";
import { createPercentageDiscount } from "../../factories/discount.factory";
import { createTestMenu } from "../../fixtures/menu.fixture";
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

describe("Admin Discount Management (E2E)", () => {
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

  describe("Discount Creation", () => {
    it("should create percentage discount", async () => {
      const admin = await createDefaultAdmin();
      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/admin/discounts",
        tokens.access_token,
        {
          code: "SAVE20",
          name: { en: "20% Off", ar: "خصم 20%" },
          type: DiscountType.PERCENTAGE,
          value: 20,
          startDate: new Date().toISOString(),
          endDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          status: DiscountStatus.ACTIVE,
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.code).toBe("SAVE20");
    });

    it("should create fixed amount discount", async () => {
      const admin = await createDefaultAdmin();
      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/admin/discounts",
        tokens.access_token,
        {
          code: "SAVE50",
          name: { en: "50 EGP Off", ar: "خصم 50 جنيه" },
          type: DiscountType.FIXED_AMOUNT,
          value: 50,
          minimumPurchaseAmount: 200,
          status: DiscountStatus.ACTIVE,
        },
      );

      expect(response.status).toBe(201);
    });

    it("should create BOGO discount", async () => {
      const admin = await createDefaultAdmin();
      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        "/admin/discounts",
        tokens.access_token,
        {
          code: "BOGO",
          name: { en: "Buy 1 Get 1", ar: "اشتري واحد واحصل على الثاني" },
          type: DiscountType.BUY_X_GET_Y,
          buyQuantity: 1,
          getQuantity: 1,
          status: DiscountStatus.ACTIVE,
        },
      );

      expect(response.status).toBe(201);
    });
  });

  describe("Discount Updates", () => {
    it("should update discount", async () => {
      const admin = await createDefaultAdmin();
      const discount = await createPercentageDiscount(admin, 20);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/admin/discounts/${discount.id}`,
        tokens.access_token,
        {
          value: 25,
        },
      );

      expect(response.status).toBe(200);
      expect(response.body.data.value).toBe(25);
    });

    it("should activate discount", async () => {
      const admin = await createDefaultAdmin();
      const discount = await createPercentageDiscount(admin, 20, {
        status: DiscountStatus.INACTIVE,
      });

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/admin/discounts/${discount.id}`,
        tokens.access_token,
        {
          status: DiscountStatus.ACTIVE,
        },
      );

      expect(response.status).toBe(200);
    });

    it("should deactivate discount", async () => {
      const admin = await createDefaultAdmin();
      const discount = await createPercentageDiscount(admin, 20);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPatch(
        app,
        `/admin/discounts/${discount.id}`,
        tokens.access_token,
        {
          status: DiscountStatus.INACTIVE,
        },
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Discount Assignment", () => {
    it("should assign discount to specific users", async () => {
      const admin = await createDefaultAdmin();
      const customer = await createDefaultCustomer();
      const discount = await createPercentageDiscount(admin, 20);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        `/admin/discounts/${discount.id}/users`,
        tokens.access_token,
        {
          userIds: [customer.id],
        },
      );

      expect(response.status).toBe(200);
    });

    it("should assign discount to specific items", async () => {
      const admin = await createDefaultAdmin();
      const menu = await createTestMenu(admin);
      const discount = await createPercentageDiscount(admin, 20);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedPost(
        app,
        `/admin/discounts/${discount.id}/items`,
        tokens.access_token,
        {
          itemIds: [menu.items.burger.id],
        },
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Discount Deletion", () => {
    it("should delete discount", async () => {
      const admin = await createDefaultAdmin();
      const discount = await createPercentageDiscount(admin, 20);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedDelete(
        app,
        `/admin/discounts/${discount.id}`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Discount Statistics", () => {
    it("should get discount usage statistics", async () => {
      const admin = await createDefaultAdmin();
      const discount = await createPercentageDiscount(admin, 20);

      const { tokens } = await loginUser(app, {
        identifier: admin.email!,
        password: "Admin@1234",
      });

      const response = await authenticatedGet(
        app,
        `/admin/discounts/${discount.id}/stats`,
        tokens.access_token,
      );

      expect(response.status).toBe(200);
    });
  });
});
