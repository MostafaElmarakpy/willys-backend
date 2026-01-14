import { Branch } from "../../src/database/entities/branch.entity";
import { Bundle } from "../../src/database/entities/bundle.entity";
import { Cart } from "../../src/database/entities/cart.entity";
import {
  CartItem,
  type CartItemType,
} from "../../src/database/entities/cart-item.entity";
import { Item } from "../../src/database/entities/item.entity";
import { User } from "../../src/database/entities/user.entity";
import { UserAddress } from "../../src/database/entities/user-address.entity";
import { getRepository } from "../setup/test-app";

export type OrderType = "DELIVERY" | "PICKUP";

export interface CreateCartOptions {
  user?: User;
  userId?: string;
  branch?: Branch;
  branchId?: string;
  orderType?: OrderType;
  deliveryAddress?: UserAddress;
  deliveryAddressId?: string;
  scheduledPickupTime?: Date;
}

export interface AddCartItemOptions {
  quantity?: number;
  selectedVariant?: { name: string; value: string; price: number };
  customizations?: Array<{
    ingredientId: string;
    name: { en: string; ar: string };
    action: "ADD" | "REMOVE" | "EXTRA";
    price: number;
  }>;
  extras?: Array<{
    ingredientId: string;
    name: { en: string; ar: string };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  specialInstructions?: string;
}

/**
 * Create a cart in the database
 */
export async function createCart(
  user: User,
  options: CreateCartOptions = {},
): Promise<Cart> {
  const cartRepo = getRepository<Cart>(Cart);
  const cart = cartRepo.create({
    user: options.user || user,
    userId: options.userId || user.id,
    branch: options.branch,
    branchId: options.branchId,
    orderType: options.orderType || "DELIVERY",
    deliveryAddress: options.deliveryAddress,
    deliveryAddressId: options.deliveryAddressId,
    scheduledPickupTime: options.scheduledPickupTime,
    subtotal: 0,
    discountAmount: 0,
    deliveryFee: 0,
    tax: 0,
    total: 0,
  });

  return cartRepo.save(cart);
}

/**
 * Add an item to a cart
 */
export async function addItemToCart(
  cart: Cart,
  item: Item,
  options: AddCartItemOptions = {},
): Promise<CartItem> {
  const quantity = options.quantity || 1;
  const unitPrice =
    typeof item.pricing === "number"
      ? item.pricing
      : options.selectedVariant?.price || 0;

  let totalPrice = unitPrice * quantity;

  // Add customization prices
  if (options.customizations) {
    for (const customization of options.customizations) {
      totalPrice += customization.price * quantity;
    }
  }

  // Add extras prices
  if (options.extras) {
    for (const extra of options.extras) {
      totalPrice += extra.totalPrice;
    }
  }

  const cartItemRepo = getRepository<CartItem>(CartItem);
  const cartItem = cartItemRepo.create({
    cart,
    cartId: cart.id,
    itemType: "ITEM" as CartItemType,
    item,
    itemId: item.id,
    quantity,
    unitPrice,
    totalPrice,
    selectedVariant: options.selectedVariant,
    customizations: options.customizations,
    extras: options.extras,
    specialInstructions: options.specialInstructions,
    discountAmount: 0,
  });

  const savedCartItem = await cartItemRepo.save(cartItem);

  // Update cart totals
  await updateCartTotals(cart);

  return savedCartItem;
}

/**
 * Add a bundle to a cart
 */
export async function addBundleToCart(
  cart: Cart,
  bundle: Bundle,
  options: AddCartItemOptions = {},
): Promise<CartItem> {
  const quantity = options.quantity || 1;
  const unitPrice = Number(bundle.price);
  const totalPrice = unitPrice * quantity;

  const cartItemRepo = getRepository<CartItem>(CartItem);
  const cartItem = cartItemRepo.create({
    cart,
    cartId: cart.id,
    itemType: "BUNDLE" as CartItemType,
    bundle,
    bundleId: bundle.id,
    quantity,
    unitPrice,
    totalPrice,
    specialInstructions: options.specialInstructions,
    discountAmount: 0,
  });

  const savedCartItem = await cartItemRepo.save(cartItem);

  // Update cart totals
  await updateCartTotals(cart);

  return savedCartItem;
}

/**
 * Update cart totals based on items
 */
export async function updateCartTotals(cart: Cart): Promise<Cart> {
  const cartItemRepo = getRepository<CartItem>(CartItem);
  const items = await cartItemRepo.find({
    where: { cartId: cart.id },
  });

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.totalPrice),
    0,
  );
  const discountAmount = items.reduce(
    (sum, item) => sum + Number(item.discountAmount),
    0,
  );
  const deliveryFee = cart.orderType === "DELIVERY" ? 20 : 0;
  const tax = 0; // Implement tax calculation if needed
  const total = subtotal - discountAmount + deliveryFee + tax;

  const cartRepo = getRepository<Cart>(Cart);
  cart.subtotal = subtotal;
  cart.discountAmount = discountAmount;
  cart.deliveryFee = deliveryFee;
  cart.tax = tax;
  cart.total = total;

  return cartRepo.save(cart);
}

/**
 * Create a cart with items
 */
export async function createCartWithItems(
  user: User,
  items: Item[],
  branch?: Branch,
  options: CreateCartOptions = {},
): Promise<Cart> {
  const cart = await createCart(user, {
    ...options,
    branch,
    branchId: branch?.id,
  });

  for (const item of items) {
    await addItemToCart(cart, item, { quantity: 1 });
  }

  return cart;
}

/**
 * Clear all items from a cart
 */
export async function clearCart(cart: Cart): Promise<void> {
  const cartItemRepo = getRepository<CartItem>(CartItem);
  await cartItemRepo.delete({ cartId: cart.id });

  // Reset cart totals
  const cartRepo = getRepository<Cart>(Cart);
  cart.subtotal = 0;
  cart.discountAmount = 0;
  cart.tax = 0;
  cart.total = cart.deliveryFee || 0;
  await cartRepo.save(cart);
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  cartItem: CartItem,
  newQuantity: number,
): Promise<CartItem> {
  const cartItemRepo = getRepository<CartItem>(CartItem);

  cartItem.quantity = newQuantity;
  cartItem.totalPrice = Number(cartItem.unitPrice) * newQuantity;

  const updatedItem = await cartItemRepo.save(cartItem);

  // Update cart totals
  const cartRepo = getRepository<Cart>(Cart);
  const cart = await cartRepo.findOne({ where: { id: cartItem.cartId } });
  if (cart) {
    await updateCartTotals(cart);
  }

  return updatedItem;
}

/**
 * Remove an item from cart
 */
export async function removeCartItem(cartItem: CartItem): Promise<void> {
  const cartId = cartItem.cartId;
  const cartItemRepo = getRepository<CartItem>(CartItem);
  await cartItemRepo.remove(cartItem);

  // Update cart totals
  const cartRepo = getRepository<Cart>(Cart);
  const cart = await cartRepo.findOne({ where: { id: cartId } });
  if (cart) {
    await updateCartTotals(cart);
  }
}
