import { Test, type TestingModule } from "@nestjs/testing";
import { AddressesController } from "./addresses.controller";
import { AddressesService } from "./addresses.service";

describe("AddressesController", () => {
  let controller: AddressesController;
  let addressesService: jest.Mocked<AddressesService>;

  const mockUserId = "user-123";
  const mockAddressId = "address-123";

  const mockAddress = {
    id: mockAddressId,
    userId: mockUserId,
    label: "Home",
    addressLine1: "123 Main St",
    city: "Cairo",
    country: "Egypt",
    latitude: 30.0444,
    longitude: 31.2357,
    isDefault: false,
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddressesController],
      providers: [
        {
          provide: AddressesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            setDefault: jest.fn(),
            validateAddress: jest.fn(),
            revalidateAddress: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AddressesController>(AddressesController);
    addressesService = module.get(AddressesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create an address", async () => {
      const createDto = {
        label: "Home",
        addressLine1: "123 Main St",
        city: "Cairo",
        country: "Egypt",
        latitude: 30.0444,
        longitude: 31.2357,
      } as any;
      addressesService.create.mockResolvedValue(mockAddress as any);

      const result = await controller.create(mockUserId, createDto);

      expect(addressesService.create).toHaveBeenCalledWith(
        mockUserId,
        createDto,
      );
      expect(result.message).toBe("Address created successfully");
    });
  });

  describe("findAll", () => {
    it("should return all addresses for user", async () => {
      addressesService.findAll.mockResolvedValue([mockAddress] as any);

      const result = await controller.findAll(mockUserId);

      expect(addressesService.findAll).toHaveBeenCalledWith(mockUserId);
      expect(result.message).toBe("Addresses retrieved successfully");
    });

    it("should return empty array when no addresses", async () => {
      addressesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockUserId);

      expect(result.data).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("should return an address by id", async () => {
      addressesService.findOne.mockResolvedValue(mockAddress as any);

      const result = await controller.findOne(mockUserId, mockAddressId);

      expect(addressesService.findOne).toHaveBeenCalledWith(
        mockUserId,
        mockAddressId,
      );
      expect(result.message).toBe("Address retrieved successfully");
    });
  });

  describe("update", () => {
    it("should update an address", async () => {
      const updateDto = { label: "Work" } as any;
      const updatedAddress = { ...mockAddress, label: "Work" };
      addressesService.update.mockResolvedValue(updatedAddress as any);

      const result = await controller.update(
        mockUserId,
        mockAddressId,
        updateDto,
      );

      expect(addressesService.update).toHaveBeenCalledWith(
        mockUserId,
        mockAddressId,
        updateDto,
      );
      expect(result.message).toBe("Address updated successfully");
    });
  });

  describe("remove", () => {
    it("should delete an address", async () => {
      addressesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockUserId, mockAddressId);

      expect(addressesService.remove).toHaveBeenCalledWith(
        mockUserId,
        mockAddressId,
      );
      expect(result.message).toBe("Address deleted successfully");
    });
  });

  describe("setDefault", () => {
    it("should set address as default", async () => {
      const defaultAddress = { ...mockAddress, isDefault: true };
      addressesService.setDefault.mockResolvedValue(defaultAddress as any);

      const result = await controller.setDefault(mockUserId, mockAddressId);

      expect(addressesService.setDefault).toHaveBeenCalledWith(
        mockUserId,
        mockAddressId,
      );
      expect(result.message).toBe("Address set as default successfully");
    });
  });

  describe("validateAddress", () => {
    it("should validate address coordinates", async () => {
      const validationResult = {
        isValid: true,
        canDeliver: true,
        nearestBranch: { id: "branch-123", name: "Test Branch" },
        deliveryFee: 25,
      };
      addressesService.validateAddress.mockResolvedValue(
        validationResult as any,
      );

      const dto = { latitude: 30.0444, longitude: 31.2357 };
      const result = await controller.validateAddress(dto);

      expect(addressesService.validateAddress).toHaveBeenCalledWith(
        30.0444,
        31.2357,
      );
      expect(result.message).toBe("Address validation completed");
    });
  });

  describe("revalidateAddress", () => {
    it("should revalidate an existing address", async () => {
      addressesService.revalidateAddress.mockResolvedValue(mockAddress as any);

      const result = await controller.revalidateAddress(
        mockUserId,
        mockAddressId,
      );

      expect(addressesService.revalidateAddress).toHaveBeenCalledWith(
        mockUserId,
        mockAddressId,
      );
      expect(result.message).toBe("Address revalidated successfully");
    });
  });
});
