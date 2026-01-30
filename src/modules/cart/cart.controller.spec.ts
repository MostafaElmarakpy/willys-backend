import { Test, type TestingModule } from "@nestjs/testing";
import { OrderType } from "../../common/enums/OrderType";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

describe("CartController", () => {
  let controller: CartController;
  let cartService: jest.Mocked<CartService>;

  const mockUserId = "user-123";
  const mockCartId = "cart-123";
  const mockBranchId = "branch-123";
  const mockAddressId = "address-123";
  const mockItemId = "item-123";
  const mockDiscountId = "discount-123";

  const mockCart = {
    id: mockCartId,
    userId: mockUserId,
    branchId: mockBranchId,
    orderType: OrderType.DELIVERY,
    items: [],
    subtotal: 100,
    discountAmount: 10,
    deliveryFee: 20,
    tax: 0,
    total: 110,
    appliedDiscounts: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCart: jest.fn(),
            addItem: jest.fn(),
            updateItem: jest.fn(),
            removeItem: jest.fn(),
            clearCart: jest.fn(),
            setOrderType: jest.fn(),
            setBranch: jest.fn(),
            setDeliveryAddress: jest.fn(),
            setPickupTime: jest.fn(),
            setSpecialInstructions: jest.fn(),
            applyDiscount: jest.fn(),
            removeDiscount: jest.fn(),
            validateCart: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CartController>(CartController);
    cartService = module.get(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCart", () => {
    it("should return cart", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);

      const result = await controller.getCart(mockUserId);

      expect(cartService.getCart).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("Cart retrieved successfully");
    });
  });

  describe("updateCart", () => {
    it("should update order type when provided", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);
      cartService.setOrderType.mockResolvedValue(mockCart as any);

      const dto = { orderType: OrderType.PICKUP };
      const result = await controller.updateCart(mockUserId, dto);

      expect(cartService.setOrderType).toHaveBeenCalledWith(
        mockUserId,
        OrderType.PICKUP,
      );
      expect(result.message).toBe("Cart updated successfully");
    });

    it("should update branch when provided", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);
      cartService.setBranch.mockResolvedValue(mockCart as any);

      const dto = { branchId: mockBranchId };
      const result = await controller.updateCart(mockUserId, dto);

      expect(cartService.setBranch).toHaveBeenCalledWith(
        mockUserId,
        mockBranchId,
      );
      expect(result.message).toBe("Cart updated successfully");
    });

    it("should update scheduled pickup time when provided", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);
      cartService.setPickupTime.mockResolvedValue(mockCart as any);

      const dto = { scheduledPickupTime: "2024-12-25T10:00:00Z" };
      const result = await controller.updateCart(mockUserId, dto);

      expect(cartService.setPickupTime).toHaveBeenCalledWith(
        mockUserId,
        "2024-12-25T10:00:00Z",
      );
      expect(result.message).toBe("Cart updated successfully");
    });

    it("should update delivery address when provided", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);
      cartService.setDeliveryAddress.mockResolvedValue(mockCart as any);

      const dto = { deliveryAddressId: mockAddressId };
      const result = await controller.updateCart(mockUserId, dto);

      expect(cartService.setDeliveryAddress).toHaveBeenCalledWith(
        mockUserId,
        mockAddressId,
      );
      expect(result.message).toBe("Cart updated successfully");
    });

    it("should update special instructions when provided", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);
      cartService.setSpecialInstructions.mockResolvedValue(mockCart as any);

      const dto = { specialInstructions: "Please ring doorbell" };
      const result = await controller.updateCart(mockUserId, dto);

      expect(cartService.setSpecialInstructions).toHaveBeenCalledWith(
        mockUserId,
        "Please ring doorbell",
      );
      expect(result.message).toBe("Cart updated successfully");
    });

    it("should return cart without changes when no updates provided", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);

      const result = await controller.updateCart(mockUserId, {});

      expect(cartService.setOrderType).not.toHaveBeenCalled();
      expect(cartService.setBranch).not.toHaveBeenCalled();
      expect(result.message).toBe("Cart updated successfully");
    });
  });

  describe("addItem", () => {
    it("should add item to cart", async () => {
      cartService.addItem.mockResolvedValue(mockCart as any);

      const dto = { itemId: mockItemId, quantity: 2 };
      const result = await controller.addItem(mockUserId, dto);

      expect(cartService.addItem).toHaveBeenCalledWith(mockUserId, dto);
      expect(result.message).toBe("Item added to cart successfully");
    });
  });

  describe("updateItem", () => {
    it("should update cart item", async () => {
      cartService.updateItem.mockResolvedValue(mockCart as any);

      const dto = { quantity: 5 };
      const result = await controller.updateItem(mockUserId, mockItemId, dto);

      expect(cartService.updateItem).toHaveBeenCalledWith(
        mockUserId,
        mockItemId,
        dto,
      );
      expect(result.message).toBe("Cart item updated successfully");
    });
  });

  describe("removeItem", () => {
    it("should remove item from cart", async () => {
      cartService.removeItem.mockResolvedValue(mockCart as any);

      const result = await controller.removeItem(mockUserId, mockItemId);

      expect(cartService.removeItem).toHaveBeenCalledWith(
        mockUserId,
        mockItemId,
      );
      expect(result.message).toBe("Item removed from cart successfully");
    });
  });

  describe("clearCart", () => {
    it("should clear cart", async () => {
      cartService.clearCart.mockResolvedValue(mockCart as any);

      const result = await controller.clearCart(mockUserId);

      expect(cartService.clearCart).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("Cart cleared successfully");
    });
  });

  describe("setOrderType", () => {
    it("should set order type", async () => {
      cartService.setOrderType.mockResolvedValue(mockCart as any);

      const dto = { orderType: OrderType.DELIVERY };
      const result = await controller.setOrderType(mockUserId, dto);

      expect(cartService.setOrderType).toHaveBeenCalledWith(
        mockUserId,
        OrderType.DELIVERY,
      );
      expect(result.message).toBe("Order type set successfully");
    });
  });

  describe("setBranch", () => {
    it("should set branch", async () => {
      cartService.setBranch.mockResolvedValue(mockCart as any);

      const dto = { branchId: mockBranchId };
      const result = await controller.setBranch(mockUserId, dto);

      expect(cartService.setBranch).toHaveBeenCalledWith(
        mockUserId,
        mockBranchId,
      );
      expect(result.message).toBe("Branch set successfully");
    });
  });

  describe("setDeliveryAddress", () => {
    it("should set delivery address", async () => {
      cartService.setDeliveryAddress.mockResolvedValue(mockCart as any);

      const dto = { deliveryAddressId: mockAddressId };
      const result = await controller.setDeliveryAddress(mockUserId, dto);

      expect(cartService.setDeliveryAddress).toHaveBeenCalledWith(
        mockUserId,
        mockAddressId,
      );
      expect(result.message).toBe("Delivery address set successfully");
    });
  });

  describe("setPickupTime", () => {
    it("should set pickup time", async () => {
      cartService.setPickupTime.mockResolvedValue(mockCart as any);

      const dto = { scheduledPickupTime: "2024-12-25T10:00:00Z" };
      const result = await controller.setPickupTime(mockUserId, dto);

      expect(cartService.setPickupTime).toHaveBeenCalledWith(
        mockUserId,
        "2024-12-25T10:00:00Z",
      );
      expect(result.message).toBe("Pickup time set successfully");
    });
  });

  describe("applyDiscount", () => {
    it("should apply discount", async () => {
      cartService.applyDiscount.mockResolvedValue(mockCart as any);

      const dto = { code: "SAVE10" };
      const result = await controller.applyDiscount(mockUserId, dto);

      expect(cartService.applyDiscount).toHaveBeenCalledWith(
        mockUserId,
        "SAVE10",
      );
      expect(result.message).toBe("Discount applied successfully");
    });
  });

  describe("removeDiscount", () => {
    it("should remove discount", async () => {
      cartService.removeDiscount.mockResolvedValue(mockCart as any);

      const result = await controller.removeDiscount(
        mockUserId,
        mockDiscountId,
      );

      expect(cartService.removeDiscount).toHaveBeenCalledWith(
        mockUserId,
        mockDiscountId,
      );
      expect(result.message).toBe("Discount removed successfully");
    });
  });

  describe("validateCart", () => {
    it("should validate cart", async () => {
      const validationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };
      cartService.validateCart.mockResolvedValue(validationResult);

      const result = await controller.validateCart(mockUserId);

      expect(cartService.validateCart).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("Cart validation completed");
      expect(result.data).toEqual(validationResult);
    });
  });

  describe("getCartSummary", () => {
    it("should return cart summary", async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);

      const result = await controller.getCartSummary(mockUserId);

      expect(cartService.getCart).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("Cart summary retrieved");
    });
  });
});
