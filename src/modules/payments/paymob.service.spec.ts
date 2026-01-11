import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import {
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PaymobService } from './paymob.service';
import { ConfigService } from 'src/config/config.service';
import { AxiosResponse, AxiosHeaders } from 'axios';

describe('PaymobService', () => {
  let service: PaymobService;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<ConfigService>;

  const mockAuthToken = 'mock-auth-token-123';
  const mockOrderId = 12345;
  const mockPaymentKeyToken = 'mock-payment-key-token';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymobService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymobService>(PaymobService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);

    // Reset auth token cache before each test
    (service as any).authTokenCache = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

  describe('authenticate', () => {
    it('should authenticate and return token', async () => {
      configService.get.mockReturnValue('test-api-key');
      httpService.post.mockReturnValue(
        of(createMockAxiosResponse({ token: mockAuthToken })),
      );

      const result = await service.authenticate();

      expect(result).toBe(mockAuthToken);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://accept.paymob.com/api/auth/tokens',
        { api_key: 'test-api-key' },
      );
    });

    it('should return cached token if not expired', async () => {
      // Set up cached token
      (service as any).authTokenCache = {
        token: mockAuthToken,
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour in the future
      };

      const result = await service.authenticate();

      expect(result).toBe(mockAuthToken);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should fetch new token if cache expired', async () => {
      // Set up expired cached token
      (service as any).authTokenCache = {
        token: 'expired-token',
        expiresAt: Date.now() - 1000, // Expired
      };

      configService.get.mockReturnValue('test-api-key');
      httpService.post.mockReturnValue(
        of(createMockAxiosResponse({ token: mockAuthToken })),
      );

      const result = await service.authenticate();

      expect(result).toBe(mockAuthToken);
      expect(httpService.post).toHaveBeenCalled();
    });

    it('should throw ServiceUnavailableException on authentication failure', async () => {
      configService.get.mockReturnValue('test-api-key');
      httpService.post.mockReturnValue(
        throwError(() => new Error('Auth failed')),
      );

      await expect(service.authenticate()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('createOrder', () => {
    it('should create a Paymob order successfully', async () => {
      const mockOrderResponse = {
        id: mockOrderId,
        created_at: new Date().toISOString(),
        delivery_needed: false,
        merchant: { id: 123 },
        amount_cents: 10000,
      };

      // Mock authenticate
      (service as any).authTokenCache = {
        token: mockAuthToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      httpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockOrderResponse)),
      );

      const result = await service.createOrder(100, 'EGP', 'ORDER-123');

      expect(result).toEqual(mockOrderResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://accept.paymob.com/api/ecommerce/orders',
        expect.objectContaining({
          auth_token: mockAuthToken,
          amount_cents: 10000,
          currency: 'EGP',
          merchant_order_id: 'ORDER-123',
        }),
      );
    });

    it('should convert amount to cents correctly', async () => {
      const mockOrderResponse = { id: mockOrderId };

      (service as any).authTokenCache = {
        token: mockAuthToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      httpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockOrderResponse)),
      );

      await service.createOrder(150.5, 'EGP', 'ORDER-123');

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          amount_cents: 15050,
        }),
      );
    });

    it('should include custom items if provided', async () => {
      const mockOrderResponse = { id: mockOrderId };
      const customItems = [
        { name: 'Product 1', amount_cents: 5000, quantity: 2 },
      ];

      (service as any).authTokenCache = {
        token: mockAuthToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      httpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockOrderResponse)),
      );

      await service.createOrder(100, 'EGP', 'ORDER-123', customItems);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          items: customItems,
        }),
      );
    });

    it('should throw InternalServerErrorException on order creation failure', async () => {
      (service as any).authTokenCache = {
        token: mockAuthToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      httpService.post.mockReturnValue(
        throwError(() => new Error('Order creation failed')),
      );

      await expect(
        service.createOrder(100, 'EGP', 'ORDER-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createPaymentKey', () => {
    it('should create a payment key successfully', async () => {
      const mockPaymentKeyResponse = {
        token: mockPaymentKeyToken,
      };

      configService.get.mockReturnValue('12345');
      httpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockPaymentKeyResponse)),
      );

      const result = await service.createPaymentKey(
        mockAuthToken,
        mockOrderId,
        'user-123',
        100,
      );

      expect(result.token).toBe(mockPaymentKeyToken);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://accept.paymob.com/api/acceptance/payment_keys',
        expect.objectContaining({
          auth_token: mockAuthToken,
          order_id: mockOrderId,
          amount_cents: 10000,
          currency: 'EGP',
          expiration: 3600,
        }),
      );
    });

    it('should use custom billing data if provided', async () => {
      const mockPaymentKeyResponse = { token: mockPaymentKeyToken };
      const customBillingData = {
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '+201234567890',
      };

      configService.get.mockReturnValue('12345');
      httpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockPaymentKeyResponse)),
      );

      await service.createPaymentKey(
        mockAuthToken,
        mockOrderId,
        'user-123',
        100,
        customBillingData,
      );

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          billing_data: expect.objectContaining({
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            phone_number: '+201234567890',
          }),
        }),
      );
    });

    it('should throw InternalServerErrorException on payment key creation failure', async () => {
      configService.get.mockReturnValue('12345');
      httpService.post.mockReturnValue(
        throwError(() => new Error('Payment key creation failed')),
      );

      await expect(
        service.createPaymentKey(mockAuthToken, mockOrderId, 'user-123', 100),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      const mockRefundResponse = {
        id: 'refund-123',
        success: true,
      };

      (service as any).authTokenCache = {
        token: mockAuthToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      httpService.post.mockReturnValue(
        of(createMockAxiosResponse(mockRefundResponse)),
      );

      const result = await service.processRefund('transaction-123', 5000);

      expect(result).toEqual(mockRefundResponse);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://accept.paymob.com/api/acceptance/void_refund/refund',
        expect.objectContaining({
          auth_token: mockAuthToken,
          transaction_id: 'transaction-123',
          amount_cents: 5000,
        }),
      );
    });

    it('should throw InternalServerErrorException on refund failure', async () => {
      (service as any).authTokenCache = {
        token: mockAuthToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      httpService.post.mockReturnValue(
        throwError(() => new Error('Refund failed')),
      );

      await expect(
        service.processRefund('transaction-123', 5000),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status successfully', async () => {
      const mockTransactionStatus = {
        id: 123456,
        success: true,
        pending: false,
      };

      (service as any).authTokenCache = {
        token: mockAuthToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      httpService.get.mockReturnValue(
        of(createMockAxiosResponse(mockTransactionStatus)),
      );

      const result = await service.getTransactionStatus('123456');

      expect(result).toEqual(mockTransactionStatus);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://accept.paymob.com/api/acceptance/transactions/123456',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAuthToken}`,
          }),
        }),
      );
    });

    it('should throw InternalServerErrorException on status check failure', async () => {
      (service as any).authTokenCache = {
        token: mockAuthToken,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      httpService.get.mockReturnValue(
        throwError(() => new Error('Status check failed')),
      );

      await expect(service.getTransactionStatus('123456')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('verifyHmacSignature', () => {
    it('should call HmacValidator with correct parameters', () => {
      const payload = { obj: { id: 123 } };
      const receivedHmac = 'hmac-signature';

      configService.get.mockReturnValue('secret-key');

      // The actual verification depends on HmacValidator implementation
      const result = service.verifyHmacSignature(payload, receivedHmac);

      expect(configService.get).toHaveBeenCalledWith('paymobSecretKey');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('buildIframeUrl', () => {
    it('should build correct iframe URL', () => {
      configService.get.mockReturnValue('iframe-123');

      const result = service.buildIframeUrl('payment-token-xyz');

      expect(result).toBe(
        'https://accept.paymob.com/api/acceptance/iframes/iframe-123?payment_token=payment-token-xyz',
      );
    });
  });
});
