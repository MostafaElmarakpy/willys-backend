import { INestApplication } from "@nestjs/common";
import { DiscountType } from "../../src/common/enums/DiscountType";
import { User } from "../../src/database/entities/user.entity";
import { createHomeAddress } from "../factories/address.factory";
import {
  assignDiscountToUsers,
  createLimitedDiscount,
} from "../factories/discount.factory";
import { createTestBranches } from "../fixtures/branches.fixture";
import { createTestMenu } from "../fixtures/menu.fixture";
import { createDefaultAdmin } from "../fixtures/users.fixture";
import { registerUser } from "../helpers/auth.helper";
import {
  authenticatedDelete,
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

describe("Cart Calculation Accuracy (E2E)", () => {
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

  describe("Subtotal Calculation", () => {
    it("should correctly calculate subtotal with single item", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Single Item Calc",
        email: "singleitemcalc@test.com",
        password: "Test@1234",
      });

      const response = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 3,
          branchId: mainBranch.id,
        },
      );

      expect(response.status).toBe(201);

      const cart = response.body.data;
      const item = cart.items[0];

      // Subtotal should be quantity * unitPrice
      const expectedSubtotal = item.quantity * Number(item.unitPrice);
      expect(Number(cart.subtotal)).toBeCloseTo(expectedSubtotal, 2);
    });

    it("should correctly calculate subtotal with multiple items", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Multi Item Calc",
        email: "multiitemcalc@test.com",
        password: "Test@1234",
      });

      // Add first item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 2,
        branchId: mainBranch.id,
      });

      // Add second item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.pizza.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Add third item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.pasta.id,
        quantity: 3,
        branchId: mainBranch.id,
      });

      const cartResponse = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      const cart = cartResponse.body.data;

      // Calculate expected subtotal
      let expectedSubtotal = 0;
      for (const item of cart.items) {
        expectedSubtotal += item.quantity * Number(item.unitPrice);
      }

      expect(Number(cart.subtotal)).toBeCloseTo(expectedSubtotal, 2);
    });

    it("should update subtotal correctly when quantity changes", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Quantity Change Calc",
        email: "qtychangecalc@test.com",
        password: "Test@1234",
      });

      // Add item
      const addResponse = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 2,
          branchId: mainBranch.id,
        },
      );

      const cartItemId = addResponse.body.data.items[0].id;
      const unitPrice = addResponse.body.data.items[0].unitPrice;

      // Update quantity
      await authenticatedPatch(
        app,
        `/cart/items/${cartItemId}`,
        tokens.access_token,
        {
          quantity: 5,
        },
      );

      const cartResponse = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );

      const expectedSubtotal = 5 * Number(unitPrice);
      expect(Number(cartResponse.body.data.subtotal)).toBeCloseTo(
        expectedSubtotal,
        2,
      );
    });

    it("should update subtotal correctly when item is removed", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Remove Item Calc",
        email: "removeitemcalc@test.com",
        password: "Test@1234",
      });

      // Add two items
      const _add1 = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.burger.id,
          quantity: 2,
          branchId: mainBranch.id,
        },
      );

      const _add2 = await authenticatedPost(
        app,
        "/cart/items",
        tokens.access_token,
        {
          itemId: menu.items.pizza.id,
          quantity: 1,
          branchId: mainBranch.id,
        },
      );

      const cartBefore = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      const burgerItem = cartBefore.body.data.items.find(
        (i: any) => i.itemId === menu.items.burger.id,
      );

      // Remove burger
      await authenticatedDelete(
        app,
        `/cart/items/${burgerItem.id}`,
        tokens.access_token,
      );

      const cartAfter = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );

      // Remaining item only
      const pizzaItem = cartAfter.body.data.items[0];
      const expectedSubtotal = pizzaItem.quantity * Number(pizzaItem.unitPrice);

      expect(Number(cartAfter.body.data.subtotal)).toBeCloseTo(
        expectedSubtotal,
        2,
      );
    });
  });

  describe("Percentage Discount Calculation", () => {
    it("should correctly apply percentage discount", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "PERCENT20",
        value: 20, // 20%
        type: DiscountType.PERCENTAGE,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Percent Discount Calc",
        email: "percentdiscountcalc@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      // Add item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 5,
        branchId: mainBranch.id,
      });

      // Get cart to see subtotal before discount
      const cartBefore = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );
      const subtotalBefore = Number(cartBefore.body.data.subtotal);

      // Apply discount
      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "PERCENT20",
      });

      const cartAfter = await authenticatedGet(
        app,
        "/cart",
        tokens.access_token,
      );

      const expectedDiscountAmount = subtotalBefore * 0.2; // 20%
      expect(Number(cartAfter.body.data.discountAmount)).toBeCloseTo(
        expectedDiscountAmount,
        2,
      );
    });

    it("should correctly calculate total with percentage discount", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "PERCENT15",
        value: 15, // 15%
        type: DiscountType.PERCENTAGE,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Total With Percent",
        email: "totalwithpercent@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 4,
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

      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "PERCENT15",
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);
      const cartData = cart.body.data;

      const subtotal = Number(cartData.subtotal);
      const discountAmount = Number(cartData.discountAmount);
      const deliveryFee = Number(cartData.deliveryFee || 0);
      const tax = Number(cartData.tax || 0);
      const total = Number(cartData.total);

      // Total should be: subtotal - discount + delivery + tax
      const expectedTotal = subtotal - discountAmount + deliveryFee + tax;
      expect(total).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe("Fixed Amount Discount Calculation", () => {
    it("should correctly apply fixed amount discount", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "FIXED50",
        value: 50, // 50 EGP
        type: DiscountType.FIXED_AMOUNT,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Fixed Discount Calc",
        email: "fixeddiscountcalc@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      // Add items worth more than 50
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 5,
        branchId: mainBranch.id,
      });

      // Apply discount
      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "FIXED50",
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);

      // Fixed discount should be exactly 50
      expect(Number(cart.body.data.discountAmount)).toBeCloseTo(50, 2);
    });

    it("should not exceed subtotal with fixed discount", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Create a very large fixed discount
      const discount = await createLimitedDiscount(admin, 100, {
        code: "FIXED1000",
        value: 1000, // 1000 EGP
        type: DiscountType.FIXED_AMOUNT,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Large Fixed Discount",
        email: "largefixeddiscount@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      // Add small item
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Apply discount
      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "FIXED1000",
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);

      // Discount should not exceed subtotal
      const subtotal = Number(cart.body.data.subtotal);
      const discountAmount = Number(cart.body.data.discountAmount);

      expect(discountAmount).toBeLessThanOrEqual(subtotal);
    });
  });

  describe("Delivery Fee Calculation", () => {
    it("should apply correct delivery fee based on zone", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Delivery Fee Calc",
        email: "deliveryfeecalc@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      // Set delivery address
      await authenticatedPost(
        app,
        "/cart/delivery-address",
        tokens.access_token,
        {
          deliveryAddressId: address.id,
        },
      );

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);

      // Delivery fee should be applied
      expect(cart.body.data.deliveryFee).toBeDefined();
      expect(Number(cart.body.data.deliveryFee)).toBeGreaterThanOrEqual(0);
    });

    it("should include delivery fee in total calculation", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Total With Delivery",
        email: "totalwithdelivery@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 2,
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

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);
      const cartData = cart.body.data;

      const subtotal = Number(cartData.subtotal);
      const discountAmount = Number(cartData.discountAmount || 0);
      const deliveryFee = Number(cartData.deliveryFee || 0);
      const tax = Number(cartData.tax || 0);
      const total = Number(cartData.total);

      const expectedTotal = subtotal - discountAmount + deliveryFee + tax;
      expect(total).toBeCloseTo(expectedTotal, 2);
    });
  });

  describe("Total Formula Verification", () => {
    it("should follow formula: total = subtotal - discount + delivery + tax", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "FORMULA",
        value: 10,
        type: DiscountType.PERCENTAGE,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Formula Test",
        email: "formulatest@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      // Add multiple items
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 3,
        branchId: mainBranch.id,
      });

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.pizza.id,
        quantity: 2,
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

      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "FORMULA",
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);
      const c = cart.body.data;

      const subtotal = Number(c.subtotal);
      const discountAmount = Number(c.discountAmount || 0);
      const deliveryFee = Number(c.deliveryFee || 0);
      const tax = Number(c.tax || 0);
      const total = Number(c.total);

      // Verify formula
      const calculatedTotal = subtotal - discountAmount + deliveryFee + tax;

      expect(total).toBeCloseTo(calculatedTotal, 2);

      // Also verify subtotal calculation
      let calculatedSubtotal = 0;
      for (const item of c.items) {
        calculatedSubtotal += item.quantity * Number(item.unitPrice);
      }
      expect(subtotal).toBeCloseTo(calculatedSubtotal, 2);
    });

    it("should handle zero values correctly in formula", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Zero Values Test",
        email: "zerovaluestest@test.com",
        password: "Test@1234",
      });

      // Add item without discount or delivery
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 1,
        branchId: mainBranch.id,
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);
      const c = cart.body.data;

      const subtotal = Number(c.subtotal);
      const discountAmount = Number(c.discountAmount || 0);
      const deliveryFee = Number(c.deliveryFee || 0);
      const tax = Number(c.tax || 0);
      const total = Number(c.total);

      // Without discount or delivery set, those should be 0 or undefined
      const calculatedTotal = subtotal - discountAmount + deliveryFee + tax;

      expect(total).toBeCloseTo(calculatedTotal, 2);
    });
  });

  describe("Decimal Precision", () => {
    it("should handle decimal prices without floating point errors", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { tokens } = await registerUser(app, {
        fullName: "Decimal Precision",
        email: "decimalprecision2@test.com",
        password: "Test@1234",
      });

      // Add items with quantities that test decimal math
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 7, // Odd quantity
        branchId: mainBranch.id,
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);
      const c = cart.body.data;

      // Verify no floating point issues (like 0.1 + 0.2 !== 0.3)
      const item = c.items[0];
      const expectedTotal = Number(item.unitPrice) * item.quantity;

      // Should be exact to 2 decimal places
      expect(Number(c.subtotal).toFixed(2)).toBe(expectedTotal.toFixed(2));
    });

    it("should round correctly to 2 decimal places", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "ROUNDTEST",
        value: 33, // 33% - will create numbers that need rounding
        type: DiscountType.PERCENTAGE,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Round Test",
        email: "roundtest@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 3,
        branchId: mainBranch.id,
      });

      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "ROUNDTEST",
      });

      const cart = await authenticatedGet(app, "/cart", tokens.access_token);

      // All monetary values should have at most 2 decimal places
      const subtotal = cart.body.data.subtotal.toString();
      const discountAmount = cart.body.data.discountAmount.toString();
      const total = cart.body.data.total.toString();

      const countDecimals = (value: string) => {
        if (value.includes(".")) {
          return value.split(".")[1].length;
        }
        return 0;
      };

      expect(countDecimals(subtotal)).toBeLessThanOrEqual(2);
      expect(countDecimals(discountAmount)).toBeLessThanOrEqual(2);
      expect(countDecimals(total)).toBeLessThanOrEqual(2);
    });
  });
});
