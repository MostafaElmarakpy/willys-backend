import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Cart, AppliedDiscount } from 'src/database/entities/cart.entity';
import { CartItem } from 'src/database/entities/cart-item.entity';
import { Item } from 'src/database/entities/item.entity';
import { Bundle } from 'src/database/entities/bundle.entity';
import { UserAddress } from 'src/database/entities/user-address.entity';
import { Branch } from 'src/database/entities/branch.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { OrderType } from 'src/common/enums/OrderType';
import { DiscountsService } from '../discounts/discounts.service';
import { OrderRoutingService } from '../branches/order-routing.service';
import { BranchMenuService } from '../branch-menu/branch-menu.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @InjectRepository(Item)
    private readonly itemRepository: Repository<Item>,
    @InjectRepository(Bundle)
    private readonly bundleRepository: Repository<Bundle>,
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    private readonly discountsService: DiscountsService,
    private readonly orderRoutingService: OrderRoutingService,
    private readonly branchMenuService: BranchMenuService,
    private readonly dataSource: DataSource,
  ) {}

  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId, deletedAt: IsNull() },
      relations: ['items', 'items.item', 'items.bundle', 'branch'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        userId,
        items: [],
        subtotal: 0,
        discountAmount: 0,
        deliveryFee: 0,
        tax: 0,
        total: 0,
      });
      await this.cartRepository.save(cart);
    }

    return cart;
  }

  async getCart(userId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    return cart;
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    // Validate item or bundle exists
    let itemData: Item | null = null;
    let bundleData: Bundle | null = null;
    let unitPrice = 0;

    if (dto.itemId) {
      itemData = await this.itemRepository.findOne({
        where: { id: dto.itemId, deletedAt: IsNull() },
      });
      if (!itemData) {
        throw new NotFoundException('Item not found');
      }

      // Check branch availability if branch is selected
      if (cart.branchId) {
        const isAvailable = await this.branchMenuService.isItemAvailable(
          cart.branchId,
          dto.itemId,
        );
        if (!isAvailable) {
          throw new BadRequestException(
            'Item is not available at the selected branch',
          );
        }
      }

      // Calculate price (base price + variant price if selected)
      unitPrice = this.getItemPrice(itemData, dto.selectedVariant);
    } else if (dto.bundleId) {
      bundleData = await this.bundleRepository.findOne({
        where: { id: dto.bundleId, deletedAt: IsNull() },
      });
      if (!bundleData) {
        throw new NotFoundException('Bundle not found');
      }

      // Check branch availability if branch is selected
      if (cart.branchId) {
        const isAvailable = await this.branchMenuService.isBundleAvailable(
          cart.branchId,
          dto.bundleId,
        );
        if (!isAvailable) {
          throw new BadRequestException(
            'Bundle is not available at the selected branch',
          );
        }
      }

      unitPrice = Number(bundleData.price);
    }

    // Add extras price
    const extrasTotal =
      dto.extras?.reduce(
        (sum, extra) => sum + extra.unitPrice * extra.quantity,
        0,
      ) || 0;

    // Add customization prices (only for ADD/EXTRA actions)
    const customizationsTotal =
      dto.customizations?.reduce((sum, cust) => {
        if (cust.action === 'ADD' || cust.action === 'EXTRA') {
          return sum + cust.price;
        }
        return sum;
      }, 0) || 0;

    unitPrice += customizationsTotal;
    const totalPrice = (unitPrice + extrasTotal / dto.quantity) * dto.quantity;

    // Check if same item with same customizations already exists
    const existingItem = cart.items?.find((item) => {
      if (dto.itemId && item.itemId === dto.itemId) {
        return (
          JSON.stringify(item.selectedVariant) ===
            JSON.stringify(dto.selectedVariant) &&
          JSON.stringify(item.customizations) ===
            JSON.stringify(dto.customizations) &&
          JSON.stringify(item.extras) === JSON.stringify(dto.extras)
        );
      }
      if (dto.bundleId && item.bundleId === dto.bundleId) {
        return true;
      }
      return false;
    });

    if (existingItem) {
      // Update quantity
      existingItem.quantity += dto.quantity;
      existingItem.totalPrice =
        Number(existingItem.unitPrice) * existingItem.quantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      // Create new cart item
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        itemType: dto.itemId ? 'ITEM' : 'BUNDLE',
        itemId: dto.itemId,
        bundleId: dto.bundleId,
        quantity: dto.quantity,
        unitPrice,
        totalPrice,
        selectedVariant: dto.selectedVariant,
        customizations: dto.customizations,
        extras: dto.extras?.map((extra) => ({
          ...extra,
          totalPrice: extra.unitPrice * extra.quantity,
        })),
        specialInstructions: dto.specialInstructions,
        discountAmount: 0,
      });
      await this.cartItemRepository.save(cartItem);
    }

    // Recalculate totals
    return this.recalculateTotals(userId);
  }

  async updateItem(
    userId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId, cartId: cart.id, deletedAt: IsNull() },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (dto.quantity !== undefined) {
      cartItem.quantity = dto.quantity;
    }

    if (dto.selectedVariant !== undefined) {
      cartItem.selectedVariant = dto.selectedVariant;
      // Recalculate unit price if variant changed
      cartItem.unitPrice = dto.selectedVariant.price;
    }

    if (dto.customizations !== undefined) {
      cartItem.customizations = dto.customizations;
    }

    if (dto.extras !== undefined) {
      cartItem.extras = dto.extras.map((extra) => ({
        ...extra,
        totalPrice: extra.unitPrice * extra.quantity,
      }));
    }

    if (dto.specialInstructions !== undefined) {
      cartItem.specialInstructions = dto.specialInstructions;
    }

    // Recalculate total price
    const customizationsTotal =
      cartItem.customizations?.reduce((sum, cust) => {
        if (cust.action === 'ADD' || cust.action === 'EXTRA') {
          return sum + cust.price;
        }
        return sum;
      }, 0) || 0;

    const extrasTotal =
      cartItem.extras?.reduce((sum, extra) => sum + extra.totalPrice, 0) || 0;

    cartItem.totalPrice =
      (Number(cartItem.unitPrice) + customizationsTotal) * cartItem.quantity +
      extrasTotal;

    await this.cartItemRepository.save(cartItem);

    return this.recalculateTotals(userId);
  }

  async removeItem(userId: string, cartItemId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    const cartItem = await this.cartItemRepository.findOne({
      where: { id: cartItemId, cartId: cart.id, deletedAt: IsNull() },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.softDelete(cartItemId);

    return this.recalculateTotals(userId);
  }

  async clearCart(userId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    // Soft delete all cart items
    await this.cartItemRepository.softDelete({ cartId: cart.id });

    // Reset cart
    cart.items = [];
    cart.appliedDiscounts = [];
    cart.subtotal = 0;
    cart.discountAmount = 0;
    cart.deliveryFee = 0;
    cart.tax = 0;
    cart.total = 0;
    cart.validationErrors = [];

    await this.cartRepository.save(cart);

    return cart;
  }

  async setOrderType(userId: string, orderType: OrderType): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    cart.orderType = orderType;

    // Clear delivery address if switching to pickup
    if (orderType === OrderType.PICKUP) {
      cart.deliveryAddressId = undefined;
      cart.deliveryFee = 0;
    }

    await this.cartRepository.save(cart);
    return this.recalculateTotals(userId);
  }

  async setBranch(userId: string, branchId: string): Promise<Cart> {
    const branch = await this.branchRepository.findOne({
      where: { id: branchId, isActive: true, deletedAt: IsNull() },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const cart = await this.getOrCreateCart(userId);

    // If branch is changing, validate all items are available at new branch
    if (cart.branchId !== branchId && cart.items?.length > 0) {
      const unavailableItems: string[] = [];

      for (const item of cart.items) {
        if (item.itemId) {
          const isAvailable = await this.branchMenuService.isItemAvailable(
            branchId,
            item.itemId,
          );
          if (!isAvailable) {
            unavailableItems.push(item.itemId);
          }
        } else if (item.bundleId) {
          const isAvailable = await this.branchMenuService.isBundleAvailable(
            branchId,
            item.bundleId,
          );
          if (!isAvailable) {
            unavailableItems.push(item.bundleId);
          }
        }
      }

      if (unavailableItems.length > 0) {
        throw new BadRequestException({
          message: 'Some items are not available at the selected branch',
          unavailableItems,
        });
      }
    }

    cart.branchId = branchId;
    await this.cartRepository.save(cart);

    return this.getOrCreateCart(userId);
  }

  async setDeliveryAddress(userId: string, addressId: string): Promise<Cart> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId, isActive: true, deletedAt: IsNull() },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Validate delivery zone
    const routingResult = await this.orderRoutingService.routeOrder({
      latitude: Number(address.latitude),
      longitude: Number(address.longitude),
    });

    if (!routingResult.canDeliver) {
      throw new BadRequestException(routingResult.message);
    }

    const cart = await this.getOrCreateCart(userId);
    cart.deliveryAddressId = addressId;
    cart.orderType = OrderType.DELIVERY;
    cart.branchId = routingResult.assignedBranch?.id;
    cart.deliveryFee = routingResult.deliveryFee || 0;

    await this.cartRepository.save(cart);

    return this.recalculateTotals(userId);
  }

  async setPickupTime(userId: string, scheduledTime?: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    if (scheduledTime) {
      const pickupDate = new Date(scheduledTime);
      if (pickupDate < new Date()) {
        throw new BadRequestException('Pickup time cannot be in the past');
      }
      cart.scheduledPickupTime = pickupDate;
    } else {
      cart.scheduledPickupTime = undefined;
    }

    await this.cartRepository.save(cart);

    return cart;
  }

  async applyDiscount(userId: string, code: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    // Find discount by code
    const discount = await this.discountsService.findByCode(code);
    if (!discount) {
      throw new NotFoundException('Discount code not found');
    }

    // Check if user can use this discount
    const eligibility = await this.discountsService.canUseDiscount(
      discount.id,
      userId,
    );
    if (!eligibility.canUse) {
      throw new BadRequestException(eligibility.reason);
    }

    // Check if discount is already applied
    const alreadyApplied = cart.appliedDiscounts?.some(
      (d) => d.discountId === discount.id,
    );
    if (alreadyApplied) {
      throw new BadRequestException('Discount already applied');
    }

    // Check minimum purchase requirement
    if (
      discount.minimumPurchase &&
      Number(cart.subtotal) < Number(discount.minimumPurchase)
    ) {
      throw new BadRequestException(
        `Minimum purchase of ${discount.minimumPurchase} EGP required`,
      );
    }

    // Calculate discount amount
    const discountAmount = this.discountsService.calculateDiscountAmount(
      discount,
      Number(cart.subtotal),
    );

    // Add to applied discounts
    const appliedDiscount: AppliedDiscount = {
      discountId: discount.id,
      code: discount.code,
      type: discount.type,
      amount: discountAmount,
    };

    cart.appliedDiscounts = [...(cart.appliedDiscounts || []), appliedDiscount];

    await this.cartRepository.save(cart);

    return this.recalculateTotals(userId);
  }

  async removeDiscount(userId: string, discountId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);

    cart.appliedDiscounts =
      cart.appliedDiscounts?.filter((d) => d.discountId !== discountId) || [];

    await this.cartRepository.save(cart);

    return this.recalculateTotals(userId);
  }

  async setSpecialInstructions(
    userId: string,
    instructions: string,
  ): Promise<Cart> {
    const cart = await this.getOrCreateCart(userId);
    cart.specialInstructions = instructions;
    await this.cartRepository.save(cart);
    return cart;
  }

  async recalculateTotals(userId: string): Promise<Cart> {
    const cart = await this.cartRepository.findOne({
      where: { userId, deletedAt: IsNull() },
      relations: ['items', 'items.item', 'items.bundle', 'branch'],
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Calculate subtotal
    const subtotal =
      cart.items
        ?.filter((item) => !item.deletedAt)
        .reduce((sum, item) => sum + Number(item.totalPrice), 0) || 0;

    // Calculate item discounts
    const itemDiscounts =
      cart.items
        ?.filter((item) => !item.deletedAt)
        .reduce((sum, item) => sum + Number(item.discountAmount), 0) || 0;

    // Calculate order discounts
    let orderDiscounts = 0;
    for (const appliedDiscount of cart.appliedDiscounts || []) {
      orderDiscounts += appliedDiscount.amount;
    }

    const totalDiscounts = itemDiscounts + orderDiscounts;

    // Delivery fee is already set
    const deliveryFee = Number(cart.deliveryFee);

    // Calculate tax (currently 0, can be configured)
    const tax = 0;

    // Calculate total
    const total = Math.max(0, subtotal - totalDiscounts + deliveryFee + tax);

    cart.subtotal = subtotal;
    cart.discountAmount = totalDiscounts;
    cart.tax = tax;
    cart.total = total;

    await this.cartRepository.save(cart);

    return cart;
  }

  async validateCart(userId: string): Promise<{
    isValid: boolean;
    errors: Array<{ itemId?: string; error: string }>;
    warnings: Array<{ itemId?: string; warning: string }>;
  }> {
    const cart = await this.getOrCreateCart(userId);
    const errors: Array<{ itemId?: string; error: string }> = [];
    const warnings: Array<{ itemId?: string; warning: string }> = [];

    // Check if cart has items
    if (!cart.items || cart.items.length === 0) {
      errors.push({ error: 'Cart is empty' });
    }

    // Check order type is set
    if (!cart.orderType) {
      errors.push({ error: 'Order type not selected' });
    }

    // Check branch is set
    if (!cart.branchId) {
      errors.push({ error: 'Branch not selected' });
    } else {
      // Check branch is active and open
      const branch = await this.branchRepository.findOne({
        where: { id: cart.branchId, deletedAt: IsNull() },
      });

      if (!branch) {
        errors.push({ error: 'Selected branch not found' });
      } else if (!branch.isActive) {
        errors.push({ error: 'Selected branch is not active' });
      } else if (!branch.isOpen) {
        warnings.push({ warning: 'Selected branch is currently closed' });
      }
    }

    // For delivery, check address is set
    if (cart.orderType === OrderType.DELIVERY && !cart.deliveryAddressId) {
      errors.push({ error: 'Delivery address not selected' });
    }

    // Validate each item
    for (const item of cart.items || []) {
      if (item.deletedAt) continue;

      if (item.itemId) {
        const itemData = await this.itemRepository.findOne({
          where: { id: item.itemId, deletedAt: IsNull() },
        });

        if (!itemData) {
          errors.push({ itemId: item.id, error: 'Item no longer exists' });
          continue;
        }

        if (cart.branchId) {
          const isAvailable = await this.branchMenuService.isItemAvailable(
            cart.branchId,
            item.itemId,
          );
          if (!isAvailable) {
            errors.push({
              itemId: item.id,
              error: 'Item not available at selected branch',
            });
          }
        }

        // Check price changes
        const currentPrice = this.getItemPrice(itemData, item.selectedVariant);
        if (currentPrice !== Number(item.unitPrice)) {
          warnings.push({
            itemId: item.id,
            warning: `Price changed from ${item.unitPrice} to ${currentPrice}`,
          });
        }
      } else if (item.bundleId) {
        const bundleData = await this.bundleRepository.findOne({
          where: { id: item.bundleId, deletedAt: IsNull() },
        });

        if (!bundleData) {
          errors.push({ itemId: item.id, error: 'Bundle no longer exists' });
          continue;
        }

        if (cart.branchId) {
          const isAvailable = await this.branchMenuService.isBundleAvailable(
            cart.branchId,
            item.bundleId,
          );
          if (!isAvailable) {
            errors.push({
              itemId: item.id,
              error: 'Bundle not available at selected branch',
            });
          }
        }
      }
    }

    // Validate applied discounts
    for (const appliedDiscount of cart.appliedDiscounts || []) {
      const eligibility = await this.discountsService.canUseDiscount(
        appliedDiscount.discountId,
        userId,
      );
      if (!eligibility.canUse) {
        warnings.push({
          warning: `Discount "${appliedDiscount.code}" is no longer valid: ${eligibility.reason}`,
        });
      }
    }

    // Update validation status
    cart.lastValidatedAt = new Date();
    cart.validationErrors = errors.map((e) => ({
      itemId: e.itemId || '',
      error: e.error,
    }));
    await this.cartRepository.save(cart);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Helper to get item price from the pricing structure
   * The Item entity has a complex pricing field that can be a number or an object with variants
   */
  private getItemPrice(
    item: Item,
    selectedVariant?: { price: number } | null,
  ): number {
    // If a variant is selected, use that price
    if (selectedVariant) {
      return selectedVariant.price;
    }

    // Handle the pricing field structure
    const pricing = item.pricing;

    // If pricing is a number, return it directly
    if (typeof pricing === 'number') {
      return pricing;
    }

    // If pricing is an object with type 'number' and a price field
    if (
      pricing &&
      typeof pricing === 'object' &&
      'type' in pricing &&
      pricing.type === 'number' &&
      'price' in pricing
    ) {
      return Number(pricing.price);
    }

    // If pricing has variants, return the first variant's first value price as default
    if (
      pricing &&
      typeof pricing === 'object' &&
      'variants' in pricing &&
      pricing.variants?.length > 0
    ) {
      const firstVariant = pricing.variants[0];
      if (firstVariant.values?.length > 0) {
        return Number(firstVariant.values[0].price);
      }
    }

    // Default to 0 if no price could be determined
    return 0;
  }
}
