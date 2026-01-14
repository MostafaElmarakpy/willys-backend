import { faker } from "@faker-js/faker";
import { BilingualStringObject } from "../../src/common/dto/bilingual-string.dto";
import { DiscountStatus } from "../../src/common/enums/DiscountStatus";
import { DiscountTargetType } from "../../src/common/enums/DiscountTargetType";
import { DiscountType } from "../../src/common/enums/DiscountType";
import { Discount } from "../../src/database/entities/discount.entity";
import { DiscountUsageLog } from "../../src/database/entities/discount-usage-log.entity";
import { Item } from "../../src/database/entities/item.entity";
import { ItemDiscount } from "../../src/database/entities/item-discount.entity";
import { Order } from "../../src/database/entities/order.entity";
import { User } from "../../src/database/entities/user.entity";
import { UserDiscount } from "../../src/database/entities/user-discount.entity";
import { getRepository } from "../setup/test-app";

export interface CreateDiscountOptions {
  code?: string;
  name?: BilingualStringObject;
  description?: BilingualStringObject;
  type?: DiscountType;
  targetType?: DiscountTargetType;
  value?: number;
  buyQuantity?: number;
  getQuantity?: number;
  freeItem?: Item;
  minimumPurchaseAmount?: number;
  maximumDiscountAmount?: number;
  startDate?: Date;
  endDate?: Date;
  status?: DiscountStatus;
  usageLimit?: number;
  usageLimitPerUser?: number;
  isStackable?: boolean;
}

/**
 * Generate a random discount code
 */
export function generateDiscountCode(): string {
  const prefix = faker.string.alpha({ length: 4, casing: "upper" });
  const suffix = faker.number.int({ min: 10, max: 99 });
  return `${prefix}${suffix}`;
}

/**
 * Generate discount data
 */
export function generateDiscountData(
  options: CreateDiscountOptions = {},
): Partial<Discount> {
  const discountName = faker.commerce.productName();

  return {
    code: options.code || generateDiscountCode(),
    name: options.name || {
      en: `${discountName} Discount`,
      ar: `خصم ${discountName}`,
    },
    description: options.description,
    type: options.type || DiscountType.PERCENTAGE,
    targetType: options.targetType || DiscountTargetType.USER,
    value:
      options.value ||
      faker.number.float({ min: 10, max: 50, fractionDigits: 2 }),
    buyQuantity: options.buyQuantity,
    getQuantity: options.getQuantity,
    freeItem: options.freeItem,
    freeItemId: options.freeItem?.id,
    minimumPurchaseAmount: options.minimumPurchaseAmount,
    maximumDiscountAmount: options.maximumDiscountAmount,
    startDate: options.startDate || new Date(),
    endDate: options.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    status: options.status || DiscountStatus.ACTIVE,
    usageLimit: options.usageLimit,
    usageLimitPerUser: options.usageLimitPerUser || 1,
    isStackable: options.isStackable || false,
    currentUsageCount: 0,
  };
}

/**
 * Create a discount in the database
 */
export async function createDiscount(
  createdBy: User,
  options: CreateDiscountOptions = {},
): Promise<Discount> {
  const discountData = generateDiscountData(options);

  const discountRepo = getRepository<Discount>(Discount);
  const discount = discountRepo.create({
    ...discountData,
    createdBy: createdBy.id,
    createdByUser: createdBy,
  });

  return discountRepo.save(discount);
}

/**
 * Create a percentage discount
 */
export async function createPercentageDiscount(
  createdBy: User,
  percentage: number = 20,
  options: CreateDiscountOptions = {},
): Promise<Discount> {
  return createDiscount(createdBy, {
    ...options,
    type: DiscountType.PERCENTAGE,
    value: percentage,
  });
}

/**
 * Create a fixed amount discount
 */
export async function createFixedDiscount(
  createdBy: User,
  amount: number = 50,
  options: CreateDiscountOptions = {},
): Promise<Discount> {
  return createDiscount(createdBy, {
    ...options,
    type: DiscountType.FIXED_AMOUNT,
    value: amount,
  });
}

/**
 * Create a BOGO (Buy X Get Y) discount
 */
export async function createBOGODiscount(
  createdBy: User,
  buyQuantity: number = 1,
  getQuantity: number = 1,
  options: CreateDiscountOptions = {},
): Promise<Discount> {
  return createDiscount(createdBy, {
    ...options,
    type: DiscountType.BUY_X_GET_Y,
    buyQuantity,
    getQuantity,
    value: 0,
  });
}

/**
 * Create a free item discount
 */
export async function createFreeItemDiscount(
  createdBy: User,
  freeItem: Item,
  options: CreateDiscountOptions = {},
): Promise<Discount> {
  return createDiscount(createdBy, {
    ...options,
    type: DiscountType.FREE_ITEM,
    freeItem,
    value: 0,
  });
}

/**
 * Assign discount to a user
 */
export async function assignDiscountToUser(
  discount: Discount,
  user: User,
): Promise<UserDiscount> {
  const userDiscountRepo = getRepository<UserDiscount>(UserDiscount);
  const userDiscount = userDiscountRepo.create({
    discount,
    discountId: discount.id,
    user,
    userId: user.id,
    usageCount: 0,
  });

  return userDiscountRepo.save(userDiscount);
}

/**
 * Assign discount to an item
 */
export async function assignDiscountToItem(
  discount: Discount,
  item: Item,
): Promise<ItemDiscount> {
  const itemDiscountRepo = getRepository<ItemDiscount>(ItemDiscount);
  const itemDiscount = itemDiscountRepo.create({
    discount,
    discountId: discount.id,
    item,
    itemId: item.id,
  });

  return itemDiscountRepo.save(itemDiscount);
}

/**
 * Assign discount to multiple users
 */
export async function assignDiscountToUsers(
  discount: Discount,
  users: User[],
): Promise<UserDiscount[]> {
  const userDiscounts: UserDiscount[] = [];

  for (const user of users) {
    const userDiscount = await assignDiscountToUser(discount, user);
    userDiscounts.push(userDiscount);
  }

  return userDiscounts;
}

/**
 * Assign discount to multiple items
 */
export async function assignDiscountToItems(
  discount: Discount,
  items: Item[],
): Promise<ItemDiscount[]> {
  const itemDiscounts: ItemDiscount[] = [];

  for (const item of items) {
    const itemDiscount = await assignDiscountToItem(discount, item);
    itemDiscounts.push(itemDiscount);
  }

  return itemDiscounts;
}

/**
 * Create a discount usage log
 */
export async function createDiscountUsageLog(
  discount: Discount,
  user: User,
  order: Order,
  discountAmount: number,
): Promise<DiscountUsageLog> {
  const usageLogRepo = getRepository<DiscountUsageLog>(DiscountUsageLog);
  const usageLog = usageLogRepo.create({
    discount,
    discountId: discount.id,
    user,
    userId: user.id,
    order,
    orderId: order.id,
    discountAmount,
    appliedAt: new Date(),
  });

  return usageLogRepo.save(usageLog);
}

/**
 * Create an expired discount
 */
export async function createExpiredDiscount(
  createdBy: User,
  options: CreateDiscountOptions = {},
): Promise<Discount> {
  return createDiscount(createdBy, {
    ...options,
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    status: DiscountStatus.EXPIRED,
  });
}

/**
 * Create a scheduled (future) discount
 */
export async function createScheduledDiscount(
  createdBy: User,
  options: CreateDiscountOptions = {},
): Promise<Discount> {
  return createDiscount(createdBy, {
    ...options,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // 37 days from now
    status: DiscountStatus.SCHEDULED,
  });
}

/**
 * Create a discount with usage limit
 */
export async function createLimitedDiscount(
  createdBy: User,
  usageLimit: number,
  options: CreateDiscountOptions = {},
): Promise<Discount> {
  return createDiscount(createdBy, {
    ...options,
    usageLimit,
  });
}

/**
 * Create multiple discounts
 */
export async function createDiscounts(
  createdBy: User,
  count: number,
  options: CreateDiscountOptions = {},
): Promise<Discount[]> {
  const discounts: Discount[] = [];

  for (let i = 0; i < count; i++) {
    const discount = await createDiscount(createdBy, {
      ...options,
      code: `${options.code || "DISC"}${i}`,
    });
    discounts.push(discount);
  }

  return discounts;
}
