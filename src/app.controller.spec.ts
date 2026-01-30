import { Test, type TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let controller: AppController;
  let appService: jest.Mocked<AppService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getHello: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getHello", () => {
    it("should return hello message from app service", () => {
      const expectedMessage = "Hello World!";
      appService.getHello.mockReturnValue(expectedMessage);

      const result = controller.getHello();

      expect(appService.getHello).toHaveBeenCalled();
      expect(result).toBe(expectedMessage);
    });

    it("should return custom message when service returns different value", () => {
      const customMessage = "Welcome to Willy's API!";
      appService.getHello.mockReturnValue(customMessage);

      const result = controller.getHello();

      expect(result).toBe(customMessage);
    });
  });
});
