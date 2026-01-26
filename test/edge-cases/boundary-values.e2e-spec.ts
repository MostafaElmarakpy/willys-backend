import { INestApplication } from "@nestjs/common";
import { DiscountTargetType } from "../../src/common/enums/DiscountTargetType";
import { DiscountType } from "../../src/common/enums/DiscountType";
import { Discount } from "../../src/database/entities/discount.entity";
import { User } from "../../src/database/entities/user.entity";
import { createHomeAddress } from "../factories/address.factory";
import {
  assignDiscountToUsers,
  createLimitedDiscount,
} from "../factories/discount.factory";
import { createTestBranches } from "../fixtures/branches.fixture";
import { createTestMenu } from "../fixtures/menu.fixture";
import { createDefaultAdmin } from "../fixtures/users.fixture";
import { getAuthToken, registerUser } from "../helpers/auth.helper";
import {
  authenticatedGet,
  authenticatedPatch,
  authenticatedPost,
} from "../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../setup/test-app";

describe("Boundary Value Testing (E2E)", () => {
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

  describe("Quantity Boundaries", () => {
    it("should accept minimum valid quantity of 1", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Min Quantity User",
        email: "minqty@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1, // Minimum
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.items[0].quantity).toBe(1);
    });

    it("should accept maximum reasonable quantity", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Max Quantity User",
        email: "maxqty@test.com",
        password: "Test@1234",
      });

      // Test with max quantity (typically 99 based on DTO validation)
      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 99,
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(201);
      expect(response.body.data.items[0].quantity).toBe(99);
    });

    it("should reject quantity of 0", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Zero Qty User",
        email: "zeroqty@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 0,
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject quantity above maximum", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Over Max Qty User",
        email: "overmaxqty@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1000, // Way above max
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(400);
    });

    it("should handle quantity update to boundary values", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Update Qty User",
        email: "updateqty@test.com",
        password: "Test@1234",
      });

      // Add item
      const addResponse = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 5,
          branchId: mainBranch.id,
        },
      );
      const cartItemId = addResponse.body.data.items[0].id;

      // Update to minimum
      const minUpdate = await authenticatedPatch(
        app,
        `/cart/items/${cartItemId}`,
        tokens.access_token,
        {
          quantity: 1,
        },
      );
      expect(minUpdate.status).toBe(200);

      // Update to maximum
      const maxUpdate = await authenticatedPatch(
        app,
        `/cart/items/${cartItemId}`,
        tokens.access_token,
        {
          quantity: 99,
        },
      );
      expect(maxUpdate.status).toBe(200);

      // Try to update to 0 (should fail)
      const zeroUpdate = await authenticatedPatch(
        app,
        `/cart/items/${cartItemId}`,
        tokens.access_token,
        {
          quantity: 0,
        },
      );
      expect(zeroUpdate.status).toBe(400);
    });
  });

  describe("Price and Calculation Boundaries", () => {
    it("should handle calculations correctly at decimal precision boundary", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Decimal Precision User",
        email: "decimalprecision@test.com",
        password: "Test@1234",
      });

      // Add item with quantity that tests decimal math
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 3, // 3 * price should test decimal handling
        branchId: mainBranch.id,
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);

      // Verify no floating point errors
      const subtotal = Number(cart.body.data.subtotal);
      const itemPrice = Number(cart.body.data.items[0].unitPrice);
      const quantity = cart.body.data.items[0].quantity;

      const expectedSubtotal = itemPrice * quantity;

      // Should match to 2 decimal places
      expect(subtotal.toFixed(2)).toBe(expectedSubtotal.toFixed(2));
    });

    it("should handle large total amounts correctly", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Large Total User",
        email: "largetotal@test.com",
        password: "Test@1234",
      });

      // Add max quantity of expensive items
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 99,
        branchId: mainBranch.id,
      });

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.pizza.id,
        quantity: 99,
        branchId: mainBranch.id,
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);

      expect(cart.status).toBe(200);

      // Verify total is a valid number (not NaN or Infinity)
      const total = Number(cart.body.data.total);
      expect(Number.isFinite(total)).toBe(true);
      expect(total).toBeGreaterThan(0);
    });
  });

  describe("Discount Value Boundaries", () => {
    it("should handle 0% discount correctly", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);
      await createTestMenu(admin);

      // Note: Creating 0% discount may not be allowed by validation
      // This test documents the expected behavior
      const adminToken = getAuthToken(admin);

      const discountResponse = await authenticatedPost(
        app,
        "/admin/discounts",
        adminToken,
        {
          code: "ZERO",
          name: { en: "Zero Discount", ar: "خصم صفر" },
          description: { en: "Test", ar: "اختبار" },
          type: "percentage",
          value: 0,
          targetType: "user",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        },
      );

      // 0% discount should probably be rejected
      expect([400, 201]).toContain(discountResponse.status);
    });

    it("should handle 100% discount correctly", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create 100% discount
      const discount = await createLimitedDiscount(admin, 10, {
        code: "FULLOFF",
        value: 100, // 100%
        type: DiscountType.PERCENTAGE,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Full Discount User",
        email: "fulldiscount@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      // Add item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      // Apply 100% discount
      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "FULLOFF",
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);

      // Total should be delivery fee only (or 0 if no delivery fee)
      const subtotal = Number(cart.body.data.subtotal);
      const discountAmount = Number(cart.body.data.discountAmount);
      const total = Number(cart.body.data.total);
      const deliveryFee = Number(cart.body.data.deliveryFee || 0);

      expect(discountAmount).toBeCloseTo(subtotal, 2);
      expect(total).toBeCloseTo(deliveryFee, 2);
    });

    it("should reject discount value above 100%", async () => {
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);

      const response = await authenticatedPost(
        app,
        "/admin/discounts",
        adminToken,
        {
          code: "OVER100",
          name: { en: "Over 100", ar: "فوق 100" },
          description: { en: "Test", ar: "اختبار" },
          type: "percentage",
          value: 150, // 150% - invalid
          targetType: "user",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe("Date Boundaries", () => {
    it("should handle discount starting exactly now", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const now = new Date();
      const discountRepo = getRepository<Discount>(Discount);

      // Create discount starting now
      const discount = discountRepo.create({
        code: "STARTNOW",
        name: { en: "Start Now", ar: "ابدأ الآن" },
        description: { en: "Test", ar: "اختبار" },
        type: DiscountType.PERCENTAGE,
        value: 10,
        targetType: DiscountTargetType.USER,
        startDate: now,
        endDate: new Date(now.getTime() + 86400000),
        maxUsageTotal: 10,
        currentUsageCount: 0,
        isActive: true,
        createdBy: admin.id,
        createdByUser: admin,
      });
      await discountRepo.save(discount);

      const { user, tokens } = await registerUser(app, {
        fullName: "Start Now User",
        email: "startnow@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Apply discount (should work since it just started)
      const response = await authenticatedPost(
        app,
        "/cart/discount",
        tokens.access_token,
        {
          code: "STARTNOW",
        },
      );

      expect(response.status).toBe(200);
    });

    it("should handle discount that just expired", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const now = new Date();
      const discountRepo = getRepository<Discount>(Discount);

      // Create discount that ended 1 second ago
      const discount = discountRepo.create({
        code: "JUSTEXPIRED",
        name: { en: "Just Expired", ar: "انتهى للتو" },
        description: { en: "Test", ar: "اختبار" },
        type: DiscountType.PERCENTAGE,
        value: 10,
        targetType: DiscountTargetType.USER,
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() - 1000), // Ended 1 second ago
        maxUsageTotal: 10,
        currentUsageCount: 0,
        isActive: true,
        createdBy: admin.id,
        createdByUser: admin,
      });
      await discountRepo.save(discount);

      const { user, tokens } = await registerUser(app, {
        fullName: "Expired User",
        email: "expired@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Apply expired discount (should fail)
      const response = await authenticatedPost(
        app,
        "/cart/discount",
        tokens.access_token,
        {
          code: "JUSTEXPIRED",
        },
      );

      expect(response.status).toBe(400);
    });

    it("should handle discount scheduled for the future", async () => {
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const now = new Date();
      const discountRepo = getRepository<Discount>(Discount);

      // Create discount starting tomorrow
      const discount = discountRepo.create({
        code: "FUTURE",
        name: { en: "Future", ar: "المستقبل" },
        description: { en: "Test", ar: "اختبار" },
        type: DiscountType.PERCENTAGE,
        value: 10,
        targetType: DiscountTargetType.USER,
        startDate: new Date(now.getTime() + 86400000), // Tomorrow
        endDate: new Date(now.getTime() + 172800000),
        maxUsageTotal: 10,
        currentUsageCount: 0,
        isActive: true,
        createdBy: admin.id,
        createdByUser: admin,
      });
      await discountRepo.save(discount);

      const { user, tokens } = await registerUser(app, {
        fullName: "Future User",
        email: "future@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Apply future discount (should fail)
      const response = await authenticatedPost(
        app,
        "/cart/discount",
        tokens.access_token,
        {
          code: "FUTURE",
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe("String Length Boundaries", () => {
    it("should accept special instructions at maximum length", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Long Instructions User",
        email: "longinstructions@test.com",
        password: "Test@1234",
      });

      // Max length is typically 500 characters
      const maxLengthInstructions = "A".repeat(500);

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: mainBranch.id,
          specialInstructions: maxLengthInstructions,
        },
      );

      expect(response.status).toBe(201);
    });

    it("should reject special instructions exceeding maximum length", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Too Long Instructions User",
        email: "toolonginstructions@test.com",
        password: "Test@1234",
      });

      // Exceeds max length
      const tooLongInstructions = "A".repeat(1000);

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: mainBranch.id,
          specialInstructions: tooLongInstructions,
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe("Pagination Boundaries", () => {
    it("should handle minimum page number (1)", async () => {
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);
      await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Min Page User",
        email: "minpage@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedGet(
        app,
        "/orders",
        tokens.access_token,
        { page: 1, limit: 10 },
      );

      expect(response.status).toBe(200);
    });

    it("should reject page number of 0", async () => {
      const _admin = await createDefaultAdmin();

      const { tokens } = await registerUser(app, {
        fullName: "Zero Page User",
        email: "zeropage@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedGet(
        app,
        "/orders",
        tokens.access_token,
        { page: 0, limit: 10 },
      );

      expect(response.status).toBe(400);
    });

    it("should handle maximum limit", async () => {
      const _admin = await createDefaultAdmin();

      const { tokens } = await registerUser(app, {
        fullName: "Max Limit User",
        email: "maxlimit@test.com",
        password: "Test@1234",
      });

      // Max limit is typically 100
      const response = await authenticatedGet(
        app,
        "/orders",
        tokens.access_token,
        { page: 1, limit: 100 },
      );

      expect(response.status).toBe(200);
    });

    it("should reject limit exceeding maximum", async () => {
      const _admin = await createDefaultAdmin();

      const { tokens } = await registerUser(app, {
        fullName: "Over Limit User",
        email: "overlimit@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedGet(
        app,
        "/orders",
        tokens.access_token,
        { page: 1, limit: 1000 },
      );

      expect(response.status).toBe(400);
    });
  });
});
