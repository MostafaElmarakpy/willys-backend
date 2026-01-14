import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, type Repository } from "typeorm";
import { DiscountType } from "../../common/enums/DiscountType";
import { OrderType } from "../../common/enums/OrderType";
import { Branch } from "../../database/entities/branch.entity";
import { Bundle } from "../../database/entities/bundle.entity";
import { Cart } from "../../database/entities/cart.entity";
import { CartItem } from "../../database/entities/cart-item.entity";
import { Item } from "../../database/entities/item.entity";
import { UserAddress } from "../../database/entities/user-address.entity";
import { BranchMenuService } from "../branch-menu/branch-menu.service";
import { OrderRoutingService } from "../branches/order-routing.service";
import { DiscountsService } from "../discounts/discounts.service";
import { CartService } from "./cart.service";
import { AddToCartDto } from "./dto/add-to-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";

describe("CartService", () => {
  let service: CartService;
  let cartRepository: jest.Mocked<Repository<Cart>>;
  let cartItemRepository: jest.Mocked<Repository<CartItem>>;
  let itemRepository: jest.Mocked<Repository<Item>>;
  let bundleRepository: jest.Mocked<Repository<Bundle>>;
  let addressRepository: jest.Mocked<Repository<UserAddress>>;
  let branchRepository: jest.Mocked<Repository<Branch>>;
  let discountsService: jest.Mocked<DiscountsService>;
  let orderRoutingService: jest.Mocked<OrderRoutingService>;
  let branchMenuService: jest.Mocked<BranchMenuService>;

  // Mock data
  const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
  const mockCartId = "550e8400-e29b-41d4-a716-446655440001";
  const mockBranchId = "550e8400-e29b-41d4-a716-446655440002";
  const mockAddressId = "550e8400-e29b-41d4-a716-446655440003";
  const mockItemId = "550e8400-e29b-41d4-a716-446655440004";
  const mockBundleId = "550e8400-e29b-41d4-a716-446655440005";
  const mockCartItemId = "550e8400-e29b-41d4-a716-446655440006";
  const mockDiscountId = "550e8400-e29b-41d4-a716-446655440007";

  const mockCart: Partial<Cart> = {
    id: mockCartId,
    userId: mockUserId,
    branchId: undefined,
    orderType: undefined,
    subtotal: 0,
    discountAmount: 0,
    deliveryFee: 0,
    tax: 0,
    total: 0,
    items: [],
    appliedDiscounts: [],
    deletedAt: undefined,
  };

  const mockBranch: Partial<Branch> = {
    id: mockBranchId,
    isActive: true,
    isOpen: true,
    deletedAt: undefined,
  };

  const mockAddress: Partial<UserAddress> = {
    id: mockAddressId,
    userId: mockUserId,
    addressLine1: "123 Main St",
    latitude: 30.0444,
    longitude: 31.2357,
    isActive: true,
    deletedAt: undefined,
  };

  const mockItem: Partial<Item> = {
    id: mockItemId,
    name: { en: "Burger", ar: "برجر" },
    pricing: { type: "number", price: "50" } as any,
    deletedAt: undefined,
  };

  const mockBundle: Partial<Bundle> = {
    id: mockBundleId,
    name: { en: "Family Meal", ar: "وجبة عائلية" },
    price: 150,
    deletedAt: undefined,
  };

  const mockCartItem: Partial<CartItem> = {
    id: mockCartItemId,
    cartId: mockCartId,
    itemType: "ITEM",
    itemId: mockItemId,
    quantity: 1,
    unitPrice: 50,
    totalPrice: 50,
    discountAmount: 0,
    deletedAt: undefined,
  };

  const mockDiscount = {
    id: mockDiscountId,
    code: "SAVE10",
    type: DiscountType.PERCENTAGE,
    value: 10,
    minimumPurchase: 0,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: getRepositoryToken(Cart),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CartItem),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Item),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Bundle),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserAddress),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Branch),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DiscountsService,
          useValue: {
            findByCode: jest.fn(),
            canUseDiscount: jest.fn(),
            calculateDiscountAmount: jest.fn(),
          },
        },
        {
          provide: OrderRoutingService,
          useValue: {
            routeOrder: jest.fn(),
          },
        },
        {
          provide: BranchMenuService,
          useValue: {
            isItemAvailable: jest.fn(),
            isBundleAvailable: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    cartRepository = module.get(getRepositoryToken(Cart));
    cartItemRepository = module.get(getRepositoryToken(CartItem));
    itemRepository = module.get(getRepositoryToken(Item));
    bundleRepository = module.get(getRepositoryToken(Bundle));
    addressRepository = module.get(getRepositoryToken(UserAddress));
    branchRepository = module.get(getRepositoryToken(Branch));
    discountsService = module.get(DiscountsService);
    orderRoutingService = module.get(OrderRoutingService);
    branchMenuService = module.get(BranchMenuService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getOrCreateCart", () => {
    it("should return existing cart when found", async () => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);

      const result = await service.getOrCreateCart(mockUserId);

      expect(result).toEqual(mockCart);
      expect(cartRepository.findOne).toHaveBeenCalledWith({
        where: { userId: mockUserId, deletedAt: expect.anything() },
        relations: ["items", "items.item", "items.bundle", "branch"],
      });
    });

    it("should create new cart when not found", async () => {
      cartRepository.findOne.mockResolvedValue(null);
      cartRepository.create.mockReturnValue(mockCart as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);

      const result = await service.getOrCreateCart(mockUserId);

      expect(cartRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        items: [],
        subtotal: 0,
        discountAmount: 0,
        deliveryFee: 0,
        tax: 0,
        total: 0,
      });
      expect(cartRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockCart);
    });
  });

  describe("getCart", () => {
    it("should return cart by calling getOrCreateCart", async () => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);

      const result = await service.getCart(mockUserId);

      expect(result).toEqual(mockCart);
    });
  });

  describe("addItem", () => {
    beforeEach(() => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should add item to cart successfully", async () => {
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      cartItemRepository.create.mockReturnValue(mockCartItem as CartItem);
      cartItemRepository.save.mockResolvedValue(mockCartItem as CartItem);

      const dto: AddToCartDto = {
        itemId: mockItemId,
        quantity: 2,
      };

      await service.addItem(mockUserId, dto);

      expect(itemRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockItemId, deletedAt: expect.anything() },
      });
      expect(cartItemRepository.create).toHaveBeenCalled();
      expect(cartItemRepository.save).toHaveBeenCalled();
    });

    it("should throw NotFoundException when item not found", async () => {
      itemRepository.findOne.mockResolvedValue(null);

      const dto: AddToCartDto = {
        itemId: mockItemId,
        quantity: 1,
      };

      await expect(service.addItem(mockUserId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should add bundle to cart successfully", async () => {
      bundleRepository.findOne.mockResolvedValue(mockBundle as Bundle);
      cartItemRepository.create.mockReturnValue({
        ...mockCartItem,
        itemType: "BUNDLE",
        bundleId: mockBundleId,
        itemId: undefined,
      } as CartItem);
      cartItemRepository.save.mockResolvedValue(mockCartItem as CartItem);

      const dto: AddToCartDto = {
        bundleId: mockBundleId,
        quantity: 1,
      };

      await service.addItem(mockUserId, dto);

      expect(bundleRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockBundleId, deletedAt: expect.anything() },
      });
    });

    it("should throw NotFoundException when bundle not found", async () => {
      bundleRepository.findOne.mockResolvedValue(null);

      const dto: AddToCartDto = {
        bundleId: mockBundleId,
        quantity: 1,
      };

      await expect(service.addItem(mockUserId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should check branch availability when branch is set", async () => {
      const cartWithBranch = { ...mockCart, branchId: mockBranchId } as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithBranch);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      branchMenuService.isItemAvailable.mockResolvedValue(true);
      cartItemRepository.create.mockReturnValue(mockCartItem as CartItem);
      cartItemRepository.save.mockResolvedValue(mockCartItem as CartItem);

      const dto: AddToCartDto = {
        itemId: mockItemId,
        quantity: 1,
      };

      await service.addItem(mockUserId, dto);

      expect(branchMenuService.isItemAvailable).toHaveBeenCalledWith(
        mockBranchId,
        mockItemId,
      );
    });

    it("should throw BadRequestException when item not available at branch", async () => {
      const cartWithBranch = { ...mockCart, branchId: mockBranchId } as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithBranch);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      branchMenuService.isItemAvailable.mockResolvedValue(false);

      const dto: AddToCartDto = {
        itemId: mockItemId,
        quantity: 1,
      };

      await expect(service.addItem(mockUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should merge duplicate items with same customizations", async () => {
      const existingCartItem = {
        ...mockCartItem,
        quantity: 1,
        selectedVariant: undefined,
        customizations: undefined,
        extras: undefined,
      } as CartItem;
      const cartWithItem = {
        ...mockCart,
        items: [existingCartItem],
      } as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithItem);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      cartItemRepository.save.mockResolvedValue(existingCartItem);

      const dto: AddToCartDto = {
        itemId: mockItemId,
        quantity: 2,
      };

      await service.addItem(mockUserId, dto);

      expect(cartItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 3, // 1 + 2
        }),
      );
    });

    it("should calculate price with customizations", async () => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      cartItemRepository.create.mockReturnValue(mockCartItem as CartItem);
      cartItemRepository.save.mockResolvedValue(mockCartItem as CartItem);

      const dto: AddToCartDto = {
        itemId: mockItemId,
        quantity: 1,
        customizations: [
          {
            ingredientId: "ing-1",
            name: { en: "Extra Cheese", ar: "جبنة إضافية" },
            action: "ADD",
            price: 10,
          },
        ],
      };

      await service.addItem(mockUserId, dto);

      expect(cartItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          unitPrice: 60, // 50 (base) + 10 (customization)
        }),
      );
    });

    it("should calculate price with extras", async () => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      cartItemRepository.create.mockReturnValue(mockCartItem as CartItem);
      cartItemRepository.save.mockResolvedValue(mockCartItem as CartItem);

      const dto: AddToCartDto = {
        itemId: mockItemId,
        quantity: 2,
        extras: [
          {
            ingredientId: "ing-1",
            name: { en: "Bacon", ar: "لحم مقدد" },
            quantity: 2,
            unitPrice: 15,
          },
        ],
      };

      await service.addItem(mockUserId, dto);

      // totalPrice = (unitPrice + extrasTotal/quantity) * quantity
      // = (50 + 30/2) * 2 = 65 * 2 = 130
      expect(cartItemRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPrice: 130,
        }),
      );
    });
  });

  describe("updateItem", () => {
    beforeEach(() => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should update cart item quantity", async () => {
      cartItemRepository.findOne.mockResolvedValue(mockCartItem as CartItem);
      cartItemRepository.save.mockResolvedValue({
        ...mockCartItem,
        quantity: 5,
      } as CartItem);

      const dto: UpdateCartItemDto = { quantity: 5 };

      await service.updateItem(mockUserId, mockCartItemId, dto);

      expect(cartItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 5,
        }),
      );
    });

    it("should throw NotFoundException when cart item not found", async () => {
      cartItemRepository.findOne.mockResolvedValue(null);

      const dto: UpdateCartItemDto = { quantity: 5 };

      await expect(
        service.updateItem(mockUserId, "non-existent", dto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update special instructions", async () => {
      cartItemRepository.findOne.mockResolvedValue(mockCartItem as CartItem);
      cartItemRepository.save.mockResolvedValue(mockCartItem as CartItem);

      const dto: UpdateCartItemDto = {
        specialInstructions: "No onions please",
      };

      await service.updateItem(mockUserId, mockCartItemId, dto);

      expect(cartItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          specialInstructions: "No onions please",
        }),
      );
    });

    it("should update selected variant and recalculate price", async () => {
      cartItemRepository.findOne.mockResolvedValue(mockCartItem as CartItem);
      cartItemRepository.save.mockResolvedValue(mockCartItem as CartItem);

      const dto: UpdateCartItemDto = {
        selectedVariant: { name: "Size", value: "Large", price: 75 },
      };

      await service.updateItem(mockUserId, mockCartItemId, dto);

      expect(cartItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          unitPrice: 75,
        }),
      );
    });
  });

  describe("removeItem", () => {
    beforeEach(() => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should soft delete cart item", async () => {
      cartItemRepository.findOne.mockResolvedValue(mockCartItem as CartItem);
      cartItemRepository.softDelete.mockResolvedValue({ affected: 1 } as any);

      await service.removeItem(mockUserId, mockCartItemId);

      expect(cartItemRepository.softDelete).toHaveBeenCalledWith(
        mockCartItemId,
      );
    });

    it("should throw NotFoundException when cart item not found", async () => {
      cartItemRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem(mockUserId, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("clearCart", () => {
    it("should clear all cart items and reset totals", async () => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      cartItemRepository.softDelete.mockResolvedValue({ affected: 1 } as any);
      cartRepository.save.mockResolvedValue(mockCart as Cart);

      const result = await service.clearCart(mockUserId);

      expect(cartItemRepository.softDelete).toHaveBeenCalledWith({
        cartId: mockCart.id,
      });
      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [],
          appliedDiscounts: [],
          subtotal: 0,
          discountAmount: 0,
          deliveryFee: 0,
          tax: 0,
          total: 0,
          validationErrors: [],
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe("setOrderType", () => {
    beforeEach(() => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should set order type to PICKUP", async () => {
      await service.setOrderType(mockUserId, OrderType.PICKUP);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: OrderType.PICKUP,
        }),
      );
    });

    it("should set order type to DELIVERY", async () => {
      await service.setOrderType(mockUserId, OrderType.DELIVERY);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: OrderType.DELIVERY,
        }),
      );
    });

    it("should clear delivery address when switching to PICKUP", async () => {
      const cartWithDelivery = {
        ...mockCart,
        orderType: OrderType.DELIVERY,
        deliveryAddressId: mockAddressId,
        deliveryFee: 25,
      } as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithDelivery);

      await service.setOrderType(mockUserId, OrderType.PICKUP);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: OrderType.PICKUP,
          deliveryAddressId: undefined,
          deliveryFee: 0,
        }),
      );
    });
  });

  describe("setBranch", () => {
    beforeEach(() => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should set branch successfully", async () => {
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);

      await service.setBranch(mockUserId, mockBranchId);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          branchId: mockBranchId,
        }),
      );
    });

    it("should throw NotFoundException when branch not found", async () => {
      branchRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setBranch(mockUserId, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should validate item availability when changing branch with items", async () => {
      const cartWithItems = {
        ...mockCart,
        branchId: "old-branch-id",
        items: [mockCartItem as CartItem],
      } as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithItems);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      branchMenuService.isItemAvailable.mockResolvedValue(true);

      await service.setBranch(mockUserId, mockBranchId);

      expect(branchMenuService.isItemAvailable).toHaveBeenCalledWith(
        mockBranchId,
        mockItemId,
      );
    });

    it("should throw BadRequestException when items unavailable at new branch", async () => {
      const cartWithItems = {
        ...mockCart,
        branchId: "old-branch-id",
        items: [mockCartItem as CartItem],
      } as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithItems);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      branchMenuService.isItemAvailable.mockResolvedValue(false);

      await expect(service.setBranch(mockUserId, mockBranchId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("setDeliveryAddress", () => {
    beforeEach(() => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should set delivery address successfully", async () => {
      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);
      orderRoutingService.routeOrder.mockResolvedValue({
        canDeliver: true,
        assignedBranch: mockBranch as Branch,
        alternativeBranches: [],
        deliveryFee: 25,
        message: "",
      } as any);

      await service.setDeliveryAddress(mockUserId, mockAddressId);

      expect(orderRoutingService.routeOrder).toHaveBeenCalledWith({
        latitude: mockAddress.latitude,
        longitude: mockAddress.longitude,
      });
      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryAddressId: mockAddressId,
          orderType: OrderType.DELIVERY,
          branchId: mockBranchId,
          deliveryFee: 25,
        }),
      );
    });

    it("should throw NotFoundException when address not found", async () => {
      addressRepository.findOne.mockResolvedValue(null);

      await expect(
        service.setDeliveryAddress(mockUserId, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when delivery not available", async () => {
      addressRepository.findOne.mockResolvedValue(mockAddress as UserAddress);
      orderRoutingService.routeOrder.mockResolvedValue({
        canDeliver: false,
        assignedBranch: undefined,
        alternativeBranches: [],
        deliveryFee: 0,
        message: "Address is outside delivery zones",
      } as any);

      await expect(
        service.setDeliveryAddress(mockUserId, mockAddressId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("setPickupTime", () => {
    beforeEach(() => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should set pickup time successfully", async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      await service.setPickupTime(mockUserId, futureDate);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledPickupTime: expect.any(Date),
        }),
      );
    });

    it("should throw BadRequestException when pickup time is in the past", async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      await expect(service.setPickupTime(mockUserId, pastDate)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should clear pickup time when no time provided", async () => {
      await service.setPickupTime(mockUserId, undefined);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledPickupTime: undefined,
        }),
      );
    });
  });

  describe("applyDiscount", () => {
    beforeEach(() => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        subtotal: 100,
      } as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should apply discount successfully", async () => {
      discountsService.findByCode.mockResolvedValue(mockDiscount as any);
      discountsService.canUseDiscount.mockResolvedValue({ canUse: true });
      discountsService.calculateDiscountAmount.mockReturnValue(10);

      await service.applyDiscount(mockUserId, "SAVE10");

      expect(discountsService.findByCode).toHaveBeenCalledWith("SAVE10");
      expect(discountsService.canUseDiscount).toHaveBeenCalledWith(
        mockDiscountId,
        mockUserId,
      );
      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedDiscounts: expect.arrayContaining([
            expect.objectContaining({
              discountId: mockDiscountId,
              code: "SAVE10",
              amount: 10,
            }),
          ]),
        }),
      );
    });

    it("should throw NotFoundException when discount code not found", async () => {
      discountsService.findByCode.mockResolvedValue(null);

      await expect(
        service.applyDiscount(mockUserId, "INVALID"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when user not eligible", async () => {
      discountsService.findByCode.mockResolvedValue(mockDiscount as any);
      discountsService.canUseDiscount.mockResolvedValue({
        canUse: false,
        reason: "Discount already used",
      });

      await expect(service.applyDiscount(mockUserId, "SAVE10")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when discount already applied", async () => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        subtotal: 100,
        appliedDiscounts: [
          {
            discountId: mockDiscountId,
            code: "SAVE10",
            type: DiscountType.PERCENTAGE,
            amount: 10,
          },
        ],
      } as Cart);
      discountsService.findByCode.mockResolvedValue(mockDiscount as any);
      discountsService.canUseDiscount.mockResolvedValue({ canUse: true });

      await expect(service.applyDiscount(mockUserId, "SAVE10")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when minimum purchase not met", async () => {
      const discountWithMinimum = {
        ...mockDiscount,
        minimumPurchase: 200,
      };
      discountsService.findByCode.mockResolvedValue(discountWithMinimum as any);
      discountsService.canUseDiscount.mockResolvedValue({ canUse: true });

      await expect(service.applyDiscount(mockUserId, "SAVE10")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("removeDiscount", () => {
    beforeEach(() => {
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should remove discount from cart", async () => {
      const cartWithDiscount = {
        ...mockCart,
        appliedDiscounts: [
          {
            discountId: mockDiscountId,
            code: "SAVE10",
            type: DiscountType.PERCENTAGE,
            amount: 10,
          },
        ],
      } as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithDiscount);

      await service.removeDiscount(mockUserId, mockDiscountId);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          appliedDiscounts: [],
        }),
      );
    });
  });

  describe("setSpecialInstructions", () => {
    it("should set special instructions on cart", async () => {
      cartRepository.findOne.mockResolvedValue(mockCart as Cart);
      cartRepository.save.mockResolvedValue(mockCart as Cart);

      await service.setSpecialInstructions(
        mockUserId,
        "Please ring the doorbell",
      );

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          specialInstructions: "Please ring the doorbell",
        }),
      );
    });
  });

  describe("recalculateTotals", () => {
    it("should calculate totals correctly", async () => {
      const cartWithItems = {
        ...mockCart,
        items: [
          {
            ...mockCartItem,
            totalPrice: 50,
            discountAmount: 0,
            deletedAt: undefined,
          },
          {
            ...mockCartItem,
            id: "item-2",
            totalPrice: 30,
            discountAmount: 5,
            deletedAt: undefined,
          },
        ],
        deliveryFee: 20,
        appliedDiscounts: [{ discountId: mockDiscountId, amount: 10 }],
      } as unknown as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithItems);
      cartRepository.save.mockResolvedValue(cartWithItems);

      const result = await service.recalculateTotals(mockUserId);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 80, // 50 + 30
          discountAmount: 15, // 5 (item) + 10 (order)
          tax: 0,
          total: 85, // 80 - 15 + 20 + 0
        }),
      );
      expect(result).toBeDefined();
    });

    it("should throw NotFoundException when cart not found", async () => {
      cartRepository.findOne.mockResolvedValue(null);

      await expect(service.recalculateTotals(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should filter out deleted items", async () => {
      const cartWithDeletedItem = {
        ...mockCart,
        items: [
          {
            ...mockCartItem,
            totalPrice: 50,
            discountAmount: 0,
            deletedAt: undefined,
          },
          {
            ...mockCartItem,
            id: "item-2",
            totalPrice: 30,
            deletedAt: new Date(),
          },
        ],
        deliveryFee: 0,
        appliedDiscounts: [],
      } as unknown as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithDeletedItem);
      cartRepository.save.mockResolvedValue(cartWithDeletedItem);

      await service.recalculateTotals(mockUserId);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          subtotal: 50, // Only the non-deleted item
        }),
      );
    });

    it("should ensure total is never negative", async () => {
      const cartWithLargeDiscount = {
        ...mockCart,
        items: [
          {
            ...mockCartItem,
            totalPrice: 50,
            discountAmount: 0,
            deletedAt: undefined,
          },
        ],
        deliveryFee: 0,
        appliedDiscounts: [{ discountId: mockDiscountId, amount: 100 }], // Discount > subtotal
      } as unknown as Cart;
      cartRepository.findOne.mockResolvedValue(cartWithLargeDiscount);
      cartRepository.save.mockResolvedValue(cartWithLargeDiscount);

      await service.recalculateTotals(mockUserId);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 0, // Should be 0, not negative
        }),
      );
    });
  });

  describe("validateCart", () => {
    beforeEach(() => {
      cartRepository.save.mockResolvedValue(mockCart as Cart);
    });

    it("should return valid when cart is ready for checkout", async () => {
      const validCart = {
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.PICKUP,
        items: [mockCartItem],
      } as unknown as Cart;
      cartRepository.findOne.mockResolvedValue(validCart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      branchMenuService.isItemAvailable.mockResolvedValue(true);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return error when cart is empty", async () => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.PICKUP,
        items: [],
      } as Cart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ error: "Cart is empty" });
    });

    it("should return error when order type not selected", async () => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: undefined,
        items: [mockCartItem],
      } as unknown as Cart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      branchMenuService.isItemAvailable.mockResolvedValue(true);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        error: "Order type not selected",
      });
    });

    it("should return error when branch not selected", async () => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: undefined,
        orderType: OrderType.PICKUP,
        items: [mockCartItem],
      } as unknown as Cart);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({ error: "Branch not selected" });
    });

    it("should return error when delivery address not selected for delivery order", async () => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.DELIVERY,
        deliveryAddressId: undefined,
        items: [mockCartItem],
      } as unknown as Cart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      branchMenuService.isItemAvailable.mockResolvedValue(true);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        error: "Delivery address not selected",
      });
    });

    it("should return warning when branch is closed", async () => {
      const closedBranch = { ...mockBranch, isOpen: false } as Branch;
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.PICKUP,
        items: [mockCartItem],
      } as unknown as Cart);
      branchRepository.findOne.mockResolvedValue(closedBranch);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      branchMenuService.isItemAvailable.mockResolvedValue(true);

      const result = await service.validateCart(mockUserId);

      expect(result.warnings).toContainEqual({
        warning: "Selected branch is currently closed",
      });
    });

    it("should return error when item no longer exists", async () => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.PICKUP,
        items: [mockCartItem],
      } as unknown as Cart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepository.findOne.mockResolvedValue(null);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        itemId: mockCartItemId,
        error: "Item no longer exists",
      });
    });

    it("should return error when item not available at branch", async () => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.PICKUP,
        items: [mockCartItem],
      } as unknown as Cart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      branchMenuService.isItemAvailable.mockResolvedValue(false);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        itemId: mockCartItemId,
        error: "Item not available at selected branch",
      });
    });

    it("should return warning when item price has changed", async () => {
      const cartItemWithOldPrice = {
        ...mockCartItem,
        unitPrice: 40, // Different from current price (item now costs 50)
        selectedVariant: undefined, // No variant selected, use base price
      } as CartItem;
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.PICKUP,
        items: [cartItemWithOldPrice],
      } as unknown as Cart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      // Mock item with number pricing that returns 50
      const itemWithNumberPrice = {
        ...mockItem,
        pricing: 50,
      } as Item;
      itemRepository.findOne.mockResolvedValue(itemWithNumberPrice);
      branchMenuService.isItemAvailable.mockResolvedValue(true);

      const result = await service.validateCart(mockUserId);

      expect(result.warnings).toContainEqual({
        itemId: mockCartItemId,
        warning: "Price changed from 40 to 50",
      });
    });

    it("should validate bundles", async () => {
      const bundleCartItem = {
        ...mockCartItem,
        itemType: "BUNDLE",
        itemId: undefined,
        bundleId: mockBundleId,
      } as CartItem;
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.PICKUP,
        items: [bundleCartItem],
      } as unknown as Cart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      bundleRepository.findOne.mockResolvedValue(mockBundle as Bundle);
      branchMenuService.isBundleAvailable.mockResolvedValue(true);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(true);
      expect(branchMenuService.isBundleAvailable).toHaveBeenCalledWith(
        mockBranchId,
        mockBundleId,
      );
    });

    it("should validate applied discounts", async () => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.PICKUP,
        items: [mockCartItem],
        appliedDiscounts: [
          {
            discountId: mockDiscountId,
            code: "SAVE10",
            type: DiscountType.PERCENTAGE,
            amount: 10,
          },
        ],
      } as unknown as Cart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      branchMenuService.isItemAvailable.mockResolvedValue(true);
      discountsService.canUseDiscount.mockResolvedValue({
        canUse: false,
        reason: "Discount expired",
      });

      const result = await service.validateCart(mockUserId);

      expect(result.warnings).toContainEqual({
        warning: 'Discount "SAVE10" is no longer valid: Discount expired',
      });
    });

    it("should update validation status on cart", async () => {
      cartRepository.findOne.mockResolvedValue({
        ...mockCart,
        branchId: mockBranchId,
        orderType: OrderType.PICKUP,
        items: [mockCartItem],
      } as unknown as Cart);
      branchRepository.findOne.mockResolvedValue(mockBranch as Branch);
      itemRepository.findOne.mockResolvedValue(mockItem as Item);
      branchMenuService.isItemAvailable.mockResolvedValue(true);

      await service.validateCart(mockUserId);

      expect(cartRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastValidatedAt: expect.any(Date),
          validationErrors: [],
        }),
      );
    });
  });
});
