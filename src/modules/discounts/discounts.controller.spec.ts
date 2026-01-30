import { Test, type TestingModule } from "@nestjs/testing";
import { DiscountsController } from "./discounts.controller";
import { DiscountsService } from "./discounts.service";

describe("DiscountsController", () => {
  let controller: DiscountsController;
  let discountsService: jest.Mocked<DiscountsService>;

  const mockUserId = "user-123";
  const mockItemId = "item-123";
  const mockDiscountId = "discount-123";

  const mockDiscount = {
    id: mockDiscountId,
    code: "SAVE10",
    type: "percentage",
    value: 10,
    isActive: true,
    usageLimit: 100,
    usageCount: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiscountsController],
      providers: [
        {
          provide: DiscountsService,
          useValue: {
            getUserDiscounts: jest.fn(),
            getItemDiscounts: jest.fn(),
            canUseDiscount: jest.fn(),
            findOne: jest.fn(),
            calculateDiscountAmount: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DiscountsController>(DiscountsController);
    discountsService = module.get(DiscountsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getMyDiscounts", () => {
    it("should return user discounts", async () => {
      discountsService.getUserDiscounts.mockResolvedValue([mockDiscount] as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.getMyDiscounts(mockReq);

      expect(discountsService.getUserDiscounts).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("User discounts retrieved successfully");
      expect(result.data).toHaveLength(1);
    });

    it("should return empty array when no discounts", async () => {
      discountsService.getUserDiscounts.mockResolvedValue([]);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.getMyDiscounts(mockReq);

      expect(result.data).toEqual([]);
    });
  });

  describe("getItemDiscounts", () => {
    it("should return item discounts", async () => {
      discountsService.getItemDiscounts.mockResolvedValue([mockDiscount] as any);

      const result = await controller.getItemDiscounts(mockItemId);

      expect(discountsService.getItemDiscounts).toHaveBeenCalledWith(mockItemId);
      expect(result.message).toBe("Item discounts retrieved successfully");
      expect(result.data).toHaveLength(1);
    });

    it("should return empty array when no item discounts", async () => {
      discountsService.getItemDiscounts.mockResolvedValue([]);

      const result = await controller.getItemDiscounts(mockItemId);

      expect(result.data).toEqual([]);
    });
  });

  describe("validateDiscount", () => {
    it("should return eligible when discount can be used", async () => {
      discountsService.canUseDiscount.mockResolvedValue({ canUse: true });
      discountsService.findOne.mockResolvedValue(mockDiscount as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.validateDiscount(
        mockDiscountId,
        mockItemId,
        mockReq,
      );

      expect(discountsService.canUseDiscount).toHaveBeenCalledWith(
        mockDiscountId,
        mockUserId,
        mockItemId,
      );
      expect(result.message).toBe("Discount is valid");
      expect(result.data.isEligible).toBe(true);
    });

    it("should return not eligible when discount cannot be used", async () => {
      discountsService.canUseDiscount.mockResolvedValue({
        canUse: false,
        reason: "Usage limit exceeded",
      });

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.validateDiscount(
        mockDiscountId,
        mockItemId,
        mockReq,
      );

      expect(result.message).toBe("Discount validation result");
      expect(result.data.isEligible).toBe(false);
      expect((result.data as any).reason).toBe("Usage limit exceeded");
    });
  });

  describe("calculateDiscount", () => {
    it("should calculate discount when applicable", async () => {
      const originalPrice = 100;
      const quantity = 2;
      const discountAmount = 20;

      discountsService.findOne.mockResolvedValue(mockDiscount as any);
      discountsService.canUseDiscount.mockResolvedValue({ canUse: true });
      discountsService.calculateDiscountAmount.mockReturnValue(discountAmount);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.calculateDiscount(
        mockDiscountId,
        originalPrice,
        quantity,
        mockReq,
      );

      expect(discountsService.findOne).toHaveBeenCalledWith(mockDiscountId);
      expect(discountsService.canUseDiscount).toHaveBeenCalledWith(
        mockDiscountId,
        mockUserId,
      );
      expect(discountsService.calculateDiscountAmount).toHaveBeenCalledWith(
        mockDiscount,
        originalPrice,
        quantity,
      );
      expect(result.message).toBe("Discount calculated successfully");
      expect(result.data.canApply).toBe(true);
      expect((result.data as any).discountAmount).toBe(discountAmount);
      expect((result.data as any).finalPrice).toBe(originalPrice - discountAmount);
    });

    it("should return cannot apply when discount is not usable", async () => {
      discountsService.findOne.mockResolvedValue(mockDiscount as any);
      discountsService.canUseDiscount.mockResolvedValue({
        canUse: false,
        reason: "Discount expired",
      });

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.calculateDiscount(
        mockDiscountId,
        100,
        1,
        mockReq,
      );

      expect(result.message).toBe("Discount cannot be applied");
      expect(result.data.canApply).toBe(false);
      expect((result.data as any).reason).toBe("Discount expired");
    });

    it("should use default quantity of 1", async () => {
      discountsService.findOne.mockResolvedValue(mockDiscount as any);
      discountsService.canUseDiscount.mockResolvedValue({ canUse: true });
      discountsService.calculateDiscountAmount.mockReturnValue(10);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.calculateDiscount(
        mockDiscountId,
        100,
        undefined as any,
        mockReq,
      );

      expect(discountsService.calculateDiscountAmount).toHaveBeenCalledWith(
        mockDiscount,
        100,
        1,
      );
    });
  });
});
