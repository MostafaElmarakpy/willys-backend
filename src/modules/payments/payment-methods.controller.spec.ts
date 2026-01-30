import { Test, type TestingModule } from "@nestjs/testing";
import { PaymentMethodsController } from "./payment-methods.controller";
import { PaymentMethodsService } from "./payment-methods.service";

describe("PaymentMethodsController", () => {
  let controller: PaymentMethodsController;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;

  const mockUserId = "user-123";
  const mockPaymentMethodId = "method-123";

  const mockPaymentMethod = {
    id: mockPaymentMethodId,
    userId: mockUserId,
    cardType: "visa",
    lastFourDigits: "4242",
    expiryMonth: 12,
    expiryYear: 2025,
    isDefault: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentMethodsController],
      providers: [
        {
          provide: PaymentMethodsService,
          useValue: {
            savePaymentMethod: jest.fn(),
            findUserPaymentMethods: jest.fn(),
            setDefault: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentMethodsController>(PaymentMethodsController);
    paymentMethodsService = module.get(PaymentMethodsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("savePaymentMethod", () => {
    it("should save a payment method", async () => {
      const saveDto = {
        token: "tok_visa",
        cardType: "visa",
        lastFourDigits: "4242",
      } as any;
      paymentMethodsService.savePaymentMethod.mockResolvedValue(
        mockPaymentMethod as any,
      );

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.savePaymentMethod(saveDto, mockReq);

      expect(paymentMethodsService.savePaymentMethod).toHaveBeenCalledWith(
        saveDto,
        mockUserId,
      );
      expect(result.message).toBe("Payment method saved successfully");
    });
  });

  describe("getMyPaymentMethods", () => {
    it("should return user payment methods", async () => {
      paymentMethodsService.findUserPaymentMethods.mockResolvedValue([
        mockPaymentMethod,
      ] as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.getMyPaymentMethods(mockReq);

      expect(paymentMethodsService.findUserPaymentMethods).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(result.message).toBe("Payment methods retrieved successfully");
      expect(result.data).toHaveLength(1);
    });

    it("should return empty array when no payment methods", async () => {
      paymentMethodsService.findUserPaymentMethods.mockResolvedValue([]);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.getMyPaymentMethods(mockReq);

      expect(result.data).toEqual([]);
    });
  });

  describe("setDefault", () => {
    it("should set payment method as default", async () => {
      const defaultMethod = { ...mockPaymentMethod, isDefault: true };
      paymentMethodsService.setDefault.mockResolvedValue(defaultMethod as any);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.setDefault(mockPaymentMethodId, mockReq);

      expect(paymentMethodsService.setDefault).toHaveBeenCalledWith(
        mockPaymentMethodId,
        mockUserId,
      );
      expect(result.message).toBe("Default payment method updated successfully");
    });
  });

  describe("removePaymentMethod", () => {
    it("should remove a payment method", async () => {
      paymentMethodsService.remove.mockResolvedValue(undefined);

      const mockReq = { user: { id: mockUserId } };
      const result = await controller.removePaymentMethod(
        mockPaymentMethodId,
        mockReq,
      );

      expect(paymentMethodsService.remove).toHaveBeenCalledWith(
        mockPaymentMethodId,
        mockUserId,
      );
      expect(result.message).toBe("Payment method removed successfully");
    });
  });
});
