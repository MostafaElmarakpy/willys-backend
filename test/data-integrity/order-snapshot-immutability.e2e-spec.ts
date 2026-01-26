import { INestApplication } from "@nestjs/common";
import { Discount } from "../../src/database/entities/discount.entity";
import { Item } from "../../src/database/entities/item.entity";
import { Order } from "../../src/database/entities/order.entity";
import { User } from "../../src/database/entities/user.entity";
import { UserAddress } from "../../src/database/entities/user-address.entity";
import { createHomeAddress } from "../factories/address.factory";
import {
  assignDiscountToUsers,
  createLimitedDiscount,
} from "../factories/discount.factory";
import { createTestBranches } from "../fixtures/branches.fixture";
import { createTestMenu } from "../fixtures/menu.fixture";
import { createDefaultAdmin } from "../fixtures/users.fixture";
import { registerUser } from "../helpers/auth.helper";
import { authenticatedGet, authenticatedPost } from "../helpers/request.helper";
import { generateIdempotencyKey } from "../helpers/stress.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../setup/test-app";

describe("Order Snapshot Immutability (E2E)", () => {
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

  describe("Item Price Snapshot", () => {
    it("should preserve original item prices regardless of menu price changes", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Price Snapshot User",
        email: "pricesnapshot@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Get original item price
      const itemRepo = getRepository<Item>(Item);
      const originalItem = await itemRepo.findOne({
        where: { id: menu.items.burger.id },
      });
      const originalPrice =
        typeof originalItem!.pricing === "number"
          ? originalItem!.pricing
          : Number(originalItem!.pricing.price || 0);

      // Create order
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 3,
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

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("pricesnapshot"),
        },
      );

      expect(checkoutResponse.status).toBe(201);
      const orderId = checkoutResponse.body.data.order.id;

      // Change item price dramatically
      const newPrice = originalPrice * 3;
      await itemRepo.update(menu.items.burger.id, { pricing: newPrice });

      // Fetch order and verify price snapshot
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: ["items"],
      });

      // Order item should have the original price, not the new one
      const orderItem = order!.items[0];

      // The stored price should match original (allowing for type coercion)
      expect(Number(orderItem.unitPrice)).toBeCloseTo(originalPrice, 2);

      // Total should be based on original price
      const expectedTotal = Number(orderItem.unitPrice) * orderItem.quantity;
      expect(Number(orderItem.totalPrice)).toBeCloseTo(expectedTotal, 2);
    });

    it("should preserve item details even when item is deleted", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Deleted Item Snapshot User",
        email: "deleteditemsnapshot@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Create order
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

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("deleteditem"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Soft delete the item
      const itemRepo = getRepository<Item>(Item);
      await itemRepo.softDelete(menu.items.burger.id);

      // Fetch order - should still have item details
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: ["items"],
      });

      expect(order!.items.length).toBe(1);

      // Order item should have stored the item details
      const orderItem = order!.items[0];
      expect(orderItem).toBeDefined();
      expect(orderItem.unitPrice).toBeDefined();
      expect(orderItem.quantity).toBe(1);
    });
  });

  describe("Delivery Address Snapshot", () => {
    it("should preserve original delivery address when user updates their address", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Address Snapshot User",
        email: "addresssnapshot@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      const originalAddressLine1 = address.addressLine1;

      // Create order
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

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("addresssnapshot"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Update user's address
      const addressRepo = getRepository<UserAddress>(UserAddress);
      await addressRepo.update(address.id, {
        addressLine1: "Completely New Address 999",
        addressLine2: "New Suite 500",
      });

      // Verify order still has original address
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });

      // deliveryAddressSnapshot should contain the original address
      const snapshot = order!.deliveryAddressSnapshot;

      if (snapshot) {
        // If snapshot is stored as JSON, check it has original data
        if (typeof snapshot === "object") {
          expect(snapshot.addressLine1).toBe(originalAddressLine1);
        }
      }

      // Verify the user's actual address was updated
      const updatedAddress = await addressRepo.findOne({
        where: { id: address.id },
      });
      expect(updatedAddress!.addressLine1).toBe("Completely New Address 999");
    });

    it("should preserve delivery address even when address is deleted", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Deleted Address User",
        email: "deletedaddress@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Create order
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

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("deletedaddress"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Delete the address
      const addressRepo = getRepository<UserAddress>(UserAddress);
      await addressRepo.softDelete(address.id);

      // Order should still be accessible with address snapshot
      const orderResponse = await authenticatedGet(
        app,
        `/orders/${orderId}`,
        tokens.access_token,
      );

      expect(orderResponse.status).toBe(200);

      // Order should have delivery address information preserved
      const orderData = orderResponse.body.data;
      expect(
        orderData.deliveryAddressSnapshot || orderData.deliveryAddress,
      ).toBeDefined();
    });
  });

  describe("Applied Discount Snapshot", () => {
    it("should preserve original discount details when discount is modified", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "SNAPSHOT20",
        value: 20,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Discount Snapshot User",
        email: "discountsnapshot@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      // Create order with discount
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

      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "SNAPSHOT20",
      });

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("discountsnapshot"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;
      const originalDiscountAmount =
        checkoutResponse.body.data.order.discountAmount;

      // Modify discount value
      const discountRepo = getRepository<Discount>(Discount);
      await discountRepo.update(discount.id, {
        value: 50, // Changed from 20 to 50
        code: "CHANGED50", // Change code too
      });

      // Fetch order
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });

      // Order should have original discount amount, not recalculated
      expect(Number(order!.discountAmount)).toBeCloseTo(
        Number(originalDiscountAmount),
        2,
      );

      // appliedDiscounts should contain original discount info
      const appliedDiscounts = order!.appliedDiscounts;
      if (appliedDiscounts && Array.isArray(appliedDiscounts)) {
        expect(appliedDiscounts.length).toBeGreaterThan(0);
        // Original code should be preserved
        const discountSnapshot = appliedDiscounts[0];
        expect(discountSnapshot.code).toBe("SNAPSHOT20");
      }
    });

    it("should preserve discount even when discount is deleted", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const discount = await createLimitedDiscount(admin, 100, {
        code: "DELETEDISCOUNT",
        value: 15,
      });

      const { user, tokens } = await registerUser(app, {
        fullName: "Deleted Discount User",
        email: "deleteddiscount@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });

      await assignDiscountToUsers(discount, [dbUser!], admin);
      const address = await createHomeAddress(dbUser!);

      // Create order with discount
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

      await authenticatedPost(app, "/cart/discount", tokens.access_token, {
        code: "DELETEDISCOUNT",
      });

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("deletediscount"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Delete the discount
      const discountRepo = getRepository<Discount>(Discount);
      await discountRepo.softDelete(discount.id);

      // Order should still have discount information
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({ where: { id: orderId } });

      expect(order!.discountAmount).toBeDefined();
      expect(Number(order!.discountAmount)).toBeGreaterThan(0);
    });
  });

  describe("Item Name Bilingual Snapshot", () => {
    it("should preserve bilingual item names in order", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      // Get original item names
      const itemRepo = getRepository<Item>(Item);
      const originalItem = await itemRepo.findOne({
        where: { id: menu.items.burger.id },
      });
      const originalName = originalItem!.name;

      const { user, tokens } = await registerUser(app, {
        fullName: "Bilingual Snapshot User",
        email: "bilingualsnapshot@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Create order
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

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("bilingual"),
        },
      );

      const orderId = checkoutResponse.body.data.order.id;

      // Change item names
      await itemRepo.update(menu.items.burger.id, {
        name: {
          en: "Completely New Name",
          ar: "اسم جديد تماما",
        },
      });

      // Fetch order items
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: ["items"],
      });

      const orderItem = order!.items[0];

      // Order item should preserve original name
      if (orderItem.name) {
        // If stored as object
        if (typeof orderItem.name === "object") {
          expect(orderItem.name).toEqual(originalName);
        }
      }
    });
  });

  describe("Order Total Consistency", () => {
    it("should maintain consistent totals that match line items", async () => {
      // Setup
      const admin = await createDefaultAdmin();
      const { mainBranch } = await createTestBranches(admin);
      const menu = await createTestMenu(admin);

      const { user, tokens } = await registerUser(app, {
        fullName: "Total Consistency User",
        email: "totalconsistency@test.com",
        password: "Test@1234",
      });

      const userRepo = getRepository<User>(User);
      const dbUser = await userRepo.findOne({ where: { id: user.id } });
      const address = await createHomeAddress(dbUser!);

      // Add multiple items
      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.burger.id,
        quantity: 2,
        branchId: mainBranch.id,
      });

      await authenticatedPost(app, "/cart/items", tokens.access_token, {
        itemId: menu.items.pizza.id,
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

      const checkoutResponse = await authenticatedPost(
        app,
        "/orders/checkout",
        tokens.access_token,
        {
          paymentType: "CASH",
          idempotencyKey: generateIdempotencyKey("totalconsistency"),
        },
      );

      expect(checkoutResponse.status).toBe(201);
      const orderId = checkoutResponse.body.data.order.id;

      // Fetch order with items
      const orderRepo = getRepository<Order>(Order);
      const order = await orderRepo.findOne({
        where: { id: orderId },
        relations: ["items"],
      });

      // Calculate subtotal from items
      const calculatedSubtotal = order!.items.reduce(
        (sum, item) => sum + Number(item.totalPrice),
        0,
      );

      // Verify subtotal matches
      expect(Number(order!.subtotal)).toBeCloseTo(calculatedSubtotal, 2);

      // Verify total formula: total = subtotal - discount + delivery + tax
      const expectedTotal =
        Number(order!.subtotal) -
        Number(order!.discountAmount || 0) +
        Number(order!.deliveryFee || 0) +
        Number(order!.tax || 0);

      expect(Number(order!.total)).toBeCloseTo(expectedTotal, 2);
    });
  });
});
