import { INestApplication } from "@nestjs/common";
import { Branch } from "../../src/database/entities/branch.entity";
import { Discount } from "../../src/database/entities/discount.entity";
import { Item } from "../../src/database/entities/item.entity";
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
import { authenticatedGet, authenticatedPost } from "../helpers/request.helper";
import { generateIdempotencyKey } from "../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../setup/test-app";

describe("Database Constraint Violation Handling (E2E)", () => {
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

  describe("Foreign Key Constraint Violations", () => {
    it("should reject cart item with non-existent item ID", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Invalid Item User",
        email: "invaliditem@test.com",
        password: "Test@1234",
      });

      // Try to add non-existent item
      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: "00000000-0000-0000-0000-000000000000", // Non-existent UUID
          quantity: 1,
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(404);
    });

    it("should reject cart with non-existent branch ID", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Invalid Branch User",
        email: "invalidbranch@test.com",
        password: "Test@1234",
      });

      // Try to add item to non-existent branch
      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: "00000000-0000-0000-0000-000000000000", // Non-existent
        },
      );

      expect(response.status).toBe(404);
    });

    it("should reject delivery address with non-existent address ID", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Invalid Address User",
        email: "invalidaddress@test.com",
        password: "Test@1234",
      });

      // Add item first
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Try to set non-existent delivery address
      const response = await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: "00000000-0000-0000-0000-000000000000",
        },
      );

      expect(response.status).toBe(404);
    });

    it("should handle checkout when referenced item is deleted", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Deleted Item User",
        email: "deleteditem@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add item to cart
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

      // Soft-delete the item (set deletedAt)
      const itemRepo = getRepository<Item>(Item);
      await itemRepo.softDelete(menu.items.burger.id);

      // Try to checkout
      const response = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("deleteditem"),
        },
      );

      // Should fail with appropriate error
      expect([400, 404, 409]).toContain(response.status);
    });

    it("should handle discount application when discount is deleted mid-operation", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 10, {
        code: "DELETEME",
        value: 20,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Deleted Discount User",
        email: "deleteddiscount@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      // Add item and apply discount
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      const applyResponse = await authenticatedPost(
        app,
        "/cart/discount",
        tokens.access_token,
        {
          code: "DELETEME",
        },
      );

      expect(applyResponse.status).toBe(200);

      // Delete the discount
      const discountRepo = getRepository<Discount>(Discount);
      await discountRepo.softDelete(discount.id);

      // Try to apply again (should fail)
      const reapplyResponse = await authenticatedPost(
        app,
        "/cart/discount",
        tokens.access_token,
        {
          code: "DELETEME",
        },
      );

      expect([400, 404]).toContain(reapplyResponse.status);
    });
  });

  describe("Unique Constraint Violations", () => {
    it("should reject duplicate email registration", async () => {
      await registerUser(app, {
        fullName: "Original User",
        email: "duplicate@test.com",
        password: "Test@1234",
      });

      // Try to register with same email
      const response = await authenticatedPost(app, "/auth/register", "", {
        fullName: "Duplicate User",
        email: "duplicate@test.com",
        password: "Test@1234",
        registerMethod: "email",
        callbackUrl: "http://localhost:3000/verify",
      });

      expect([400, 409]).toContain(response.status);
    });

    it("should reject adding same item to cart twice (should merge instead)", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Duplicate Cart Item User",
        email: "duplicatecartitem@test.com",
        password: "Test@1234",
      });

      // Add item first time
      const firstAdd = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 2,
          branchId: mainBranch.id,
        },
      );
      expect(firstAdd.status).toBe(201);

      // Add same item again
      const secondAdd = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 3,
          branchId: mainBranch.id,
        },
      );

      // Should either merge (success) or reject (conflict)
      if (secondAdd.status === 201 || secondAdd.status === 200) {
        // If merged, total quantity should be 5 or a separate item
        const cart = await authenticatedGet(app, "/cart", tokens.access_token);
        const totalQuantity = cart.body.data.items.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0,
        );
        expect(totalQuantity).toBeGreaterThanOrEqual(3);
      } else {
        // If rejected, should be conflict
        expect([409, 400]).toContain(secondAdd.status);
      }
    });
  });

  describe("Check Constraint Violations", () => {
    it("should reject cart item with quantity of 0", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Zero Quantity User",
        email: "zeroquantity@test.com",
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

    it("should reject cart item with negative quantity", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Negative Quantity User",
        email: "negativequantity@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: -5,
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject discount with negative value", async () => {
      const admin = await createDefaultAdmin();
      const adminToken = getAuthToken(admin);

      // Try to create discount with negative value via admin API
      const response = await authenticatedPost(
        app,
        "/admin/discounts",
        adminToken,
        {
          code: "NEGATIVEVALUE",
          name: { en: "Negative", ar: "سلبي" },
          description: { en: "Test", ar: "اختبار" },
          type: "percentage",
          value: -10,
          targetType: "user",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        },
      );

      expect(response.status).toBe(400);
    });
  });

  describe("Soft Delete Handling", () => {
    it("should not return soft-deleted items in menu queries", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Soft delete an item
      const itemRepo = getRepository<Item>(Item);
      await itemRepo.softDelete(menu.items.burger.id);

      // Query menu
      const response = await authenticatedGet(
        app,
        `/menu/items/${menu.items.burger.id}`,
        "",
      );

      expect(response.status).toBe(404);
    });

    it("should not return soft-deleted branches in branch queries", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      // Soft delete branch
      const branchRepo = getRepository<Branch>(Branch);
      await branchRepo.softDelete(mainBranch.id);

      // Query branch
      const response = await authenticatedGet(
        app,
        `/branches/${mainBranch.id}`,
        "",
      );

      expect(response.status).toBe(404);
    });

    it("should handle order reference to soft-deleted branch", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Soft Delete Branch User",
        email: "softdeletebranch@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
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

      // Soft delete branch before checkout
      const branchRepo = getRepository<Branch>(Branch);
      await branchRepo.softDelete(mainBranch.id);

      // Try to checkout
      const response = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("softdeletebranch"),
        },
      );

      // Should fail since branch is deleted
      expect([400, 404, 409]).toContain(response.status);
    });
  });

  describe("Invalid UUID Handling", () => {
    it("should reject invalid UUID format for item ID", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Invalid UUID User",
        email: "invaliduuid@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: "not-a-valid-uuid",
          quantity: 1,
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(400);
    });

    it("should reject invalid UUID format for branch ID", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Invalid Branch UUID User",
        email: "invalidbranchuuid@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 1,
          branchId: "invalid-branch-uuid",
        },
      );

      expect(response.status).toBe(400);
    });
  });
});
