import { BilingualStringObject } from "src/common/dto/bilingual-string.dto";
import { OrderType } from "src/common/enums/OrderType";
import { AppliedDiscount, Cart } from "src/database/entities/cart.entity";
import { CartItem } from "src/database/entities/cart-item.entity";

export class CartItemResponseDto {
  id: string;
  itemType: "ITEM" | "BUNDLE";
  itemId?: string;
  bundleId?: string;
  name?: BilingualStringObject;
  image?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedVariant?: {
    name: string;
    value: string;
    price: number;
  };
  customizations?: Array<{
    ingredientId: string;
    name: BilingualStringObject;
    action: "ADD" | "REMOVE" | "EXTRA";
    price: number;
  }>;
  extras?: Array<{
    ingredientId: string;
    name: BilingualStringObject;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  specialInstructions?: string;
  discountAmount: number;
  appliedDiscountId?: string;

  constructor(cartItem: CartItem & { item?: any; bundle?: any }) {
    this.id = cartItem.id;
    this.itemType = cartItem.itemType;
    this.itemId = cartItem.itemId;
    this.bundleId = cartItem.bundleId;
    this.name = cartItem.item?.name || cartItem.bundle?.name;
    this.image = cartItem.item?.image || cartItem.bundle?.image;
    this.quantity = cartItem.quantity;
    this.unitPrice = Number(cartItem.unitPrice);
    this.totalPrice = Number(cartItem.totalPrice);
    this.selectedVariant = cartItem.selectedVariant;
    this.customizations = cartItem.customizations;
    this.extras = cartItem.extras;
    this.specialInstructions = cartItem.specialInstructions;
    this.discountAmount = Number(cartItem.discountAmount);
    this.appliedDiscountId = cartItem.appliedDiscountId;
  }
}

export class CartSummaryDto {
  subtotal: number;
  itemDiscounts: number;
  orderDiscounts: number;
  discountAmount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  itemCount: number;

  constructor(cart: Cart) {
    const itemDiscounts =
      cart.items?.reduce((sum, item) => sum + Number(item.discountAmount), 0) ||
      0;
    const orderDiscounts = Number(cart.discountAmount) - itemDiscounts;

    this.subtotal = Number(cart.subtotal);
    this.itemDiscounts = itemDiscounts;
    this.orderDiscounts = Math.max(0, orderDiscounts);
    this.discountAmount = Number(cart.discountAmount);
    this.deliveryFee = Number(cart.deliveryFee);
    this.tax = Number(cart.tax);
    this.total = Number(cart.total);
    this.itemCount =
      cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }
}

export class CartResponseDto {
  id: string;
  userId: string;
  branchId?: string;
  branchName?: BilingualStringObject;
  orderType?: OrderType;
  deliveryAddressId?: string;
  scheduledPickupTime?: Date;
  specialInstructions?: string;
  items: CartItemResponseDto[];
  appliedDiscounts?: AppliedDiscount[];
  summary: CartSummaryDto;
  // Flattened fields for backward compatibility
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  tax: number;
  total: number;
  itemCount: number;
  lastValidatedAt?: Date;
  validationErrors?: Array<{ itemId: string; error: string }>;
  createdAt: Date;
  updatedAt: Date;

  constructor(cart: Cart & { branch?: any }) {
    this.id = cart.id;
    this.userId = cart.userId;
    this.branchId = cart.branchId;
    this.branchName = cart.branch?.name;
    this.orderType = cart.orderType;
    this.deliveryAddressId = cart.deliveryAddressId;
    this.scheduledPickupTime = cart.scheduledPickupTime;
    this.specialInstructions = cart.specialInstructions;
    this.items = cart.items?.map((item) => new CartItemResponseDto(item)) || [];
    this.appliedDiscounts = cart.appliedDiscounts;
    this.summary = new CartSummaryDto(cart);
    // Flatten summary fields to root level for backward compatibility
    this.subtotal = this.summary.subtotal;
    this.discountAmount = this.summary.discountAmount;
    this.deliveryFee = this.summary.deliveryFee;
    this.tax = this.summary.tax;
    this.total = this.summary.total;
    this.itemCount = this.summary.itemCount;
    this.lastValidatedAt = cart.lastValidatedAt;
    this.validationErrors = cart.validationErrors;
    this.createdAt = cart.createdAt;
    this.updatedAt = cart.updatedAt;
  }
}
