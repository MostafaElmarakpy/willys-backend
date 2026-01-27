import { INestApplication } from "@nestjs/common";
import { DiscountTargetType } from "../../../src/common/enums/DiscountTargetType";
import { DiscountType } from "../../../src/common/enums/DiscountType";
import { ItemStatus } from "../../../src/common/enums/ItemStatus";
import { OrderStatus } from "../../../src/common/enums/OrderStatus";
import { User } from "../../../src/database/entities/user.entity";
import { createHomeAddress } from "../../factories/address.factory";
import {
  createDefaultAdmin,
  createDefaultCustomer,
} from "../../fixtures/users.fixture";
import { loginUser } from "../../helpers/auth.helper";
import {
  authenticatedGet,
  authenticatedPatch,
  authenticatedPost,
} from "../../helpers/request.helper";
import {
  cleanDatabase,
  closeTestApp,
  createTestApp,
  getRepository,
} from "../../setup/test-app";

describe("Full Admin Journey (E2E)", () => {
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

  it("should complete full admin workflow from setup to order management", async () => {
    // Step 1: Login as admin
    const admin = await createDefaultAdmin();
    const { tokens } = await loginUser(app, {
      identifier: admin.email!,
      password: "Admin@1234",
    });

    // Step 2: Create new branch
    const branchResponse = await authenticatedPost(
      app,
      "/admin/branches",
      tokens.access_token,
      {
        name: { en: "Main Branch", ar: "الفرع الرئيسي" },
        address: "123 Main St, Cairo",
        latitude: 30.0444,
        longitude: 31.2357,
        phone: "+201234567890",
      },
    );

    expect(branchResponse.status).toBe(201);
    const branchId = branchResponse.body.data.id;

    // Step 3: Create delivery zone for branch
    const zoneResponse = await authenticatedPost(
      app,
      "/admin/zones",
      tokens.access_token,
      {
        branchId,
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

    expect(zoneResponse.status).toBe(201);

    // Step 4: Create menu category
    const categoryResponse = await authenticatedPost(
      app,
      "/admin/menu/categories",
      tokens.access_token,
      {
        name: { en: "Main Dishes", ar: "الأطباق الرئيسية" },
      },
    );

    expect(categoryResponse.status).toBe(201);
    const categoryId = categoryResponse.body.data.id;

    // Step 5: Create menu items
    const itemResponse = await authenticatedPost(
      app,
      "/admin/menu/items",
      tokens.access_token,
      {
        name: { en: "Burger", ar: "برجر" },
        categoryId,
        pricing: 85,
        status: ItemStatus.ACTIVE,
      },
    );

    expect(itemResponse.status).toBe(201);
    const itemId = itemResponse.body.data.id;

    // Step 6: Create discount
    const discountResponse = await authenticatedPost(
      app,
      "/admin/discounts",
      tokens.access_token,
      {
        code: "WELCOME10",
        name: { en: "10% Off", ar: "خصم 10%" },
        type: DiscountType.PERCENTAGE,
        targetType: DiscountTargetType.USER,
        value: 10,
        startDate: new Date().toISOString(),
        status: "active",
      },
    );

    expect(discountResponse.status).toBe(201);

    // Step 7: Customer places order
    const customer = await createDefaultCustomer();
    const { tokens: customerTokens } = await loginUser(app, {
      identifier: customer.email!,
      password: "Test@1234",
    });

    const userRepo = getRepository<User>(User);
    const dbCustomer = await userRepo.findOne({ where: { id: customer.id } });

    const address = await createHomeAddress(dbCustomer!);

    // Add item to cart
    await authenticatedPost(app, "/cart/items", customerTokens.access_token, {
      itemId,
      quantity: 2,
      branchId,
    });

    // Set address
    await authenticatedPost(
      app,
      "/cart/delivery-address",
      customerTokens.access_token,
      {
        deliveryAddressId: address.id,
      },
    );

    await authenticatedPost(
      app,
      "/cart/order-type",
      customerTokens.access_token,
      {
        orderType: "DELIVERY",
      },
    );

    // Checkout
    const orderResponse = await authenticatedPost(
      app,
      "/orders/checkout",
      customerTokens.access_token,
      {
        paymentType: "CASH",
        idempotencyKey: `checkout-${Date.now()}-${Math.random()}`,
      },
    );

    expect(orderResponse.status).toBe(201);
    const orderId = orderResponse.body.data.order.id;
    const orderStatus = orderResponse.body.data.order.status;

    // Step 8: Admin views incoming order
    const ordersListResponse = await authenticatedGet(
      app,
      "/admin/orders",
      tokens.access_token,
      {
        status: orderStatus,
      },
    );

    expect(ordersListResponse.status).toBe(200);

    // Step 9: Admin confirms order (only if not already confirmed)
    if (orderStatus !== OrderStatus.CONFIRMED) {
      const confirmResponse = await authenticatedPatch(
        app,
        `/admin/orders/${orderId}/status`,
        tokens.access_token,
        {
          status: OrderStatus.CONFIRMED,
        },
      );
      expect(confirmResponse.status).toBe(200);
    }

    // Step 10: Update order through lifecycle
    await authenticatedPatch(
      app,
      `/admin/orders/${orderId}/status`,
      tokens.access_token,
      { status: OrderStatus.PREPARING },
    );

    await authenticatedPatch(
      app,
      `/admin/orders/${orderId}/status`,
      tokens.access_token,
      { status: OrderStatus.READY },
    );

    await authenticatedPatch(
      app,
      `/admin/orders/${orderId}/status`,
      tokens.access_token,
      { status: OrderStatus.OUT_FOR_DELIVERY },
    );

    const completeResponse = await authenticatedPatch(
      app,
      `/admin/orders/${orderId}/status`,
      tokens.access_token,
      { status: OrderStatus.COMPLETED },
    );

    expect(completeResponse.status).toBe(200);

    // Step 11: View statistics (if endpoint exists)
    const _statsResponse = await authenticatedGet(
      app,
      "/admin/dashboard/stats",
      tokens.access_token,
    );

    // Verify we reached the end
    expect(completeResponse.body.data.status).toBe(OrderStatus.COMPLETED);
  });
});
