import { Test, type TestingModule } from "@nestjs/testing";
import { MailService } from "./mail.service";
import { ConfigService } from "src/config/config.service";
import * as nodemailer from "nodemailer";

jest.mock("nodemailer");

describe("MailService", () => {
  let service: MailService;
  let configService: jest.Mocked<ConfigService>;

  const mockTransporter = {
    sendMail: jest.fn(),
  };

  const mockConfigValues: Record<string, string> = {
    roundCubeHost: "mail.example.com",
    roundCubePort: "465",
    roundCubeUser: "test@example.com",
    roundCubePassword: "password123",
  };

  beforeEach(async () => {
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfigValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("onModuleInit", () => {
    it("should create mail transporter with correct configuration", async () => {
      await service.onModuleInit();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: "mail.example.com",
        port: 465,
        secure: true,
        auth: {
          user: "test@example.com",
          pass: "password123",
        },
      });
    });

    it("should call configService.get for all required config values", async () => {
      await service.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith("roundCubeHost");
      expect(configService.get).toHaveBeenCalledWith("roundCubePort");
      expect(configService.get).toHaveBeenCalledWith("roundCubeUser");
      expect(configService.get).toHaveBeenCalledWith("roundCubePassword");
    });
  });

  describe("sendMail", () => {
    const mailOptions = {
      to: "recipient@example.com",
      subject: "Test Subject",
      html: "<p>Test email content</p>",
    };

    it("should send email with correct parameters", async () => {
      await service.onModuleInit();
      mockTransporter.sendMail.mockResolvedValue({ messageId: "123" });

      await service.sendMail(mailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "recipient@example.com",
        subject: "Test Subject",
        html: "<p>Test email content</p>",
      });
    });

    it("should throw error when transporter is not initialized", async () => {
      await expect(service.sendMail(mailOptions)).rejects.toThrow(
        "Transporter not initialized",
      );
    });

    it("should propagate transporter errors", async () => {
      await service.onModuleInit();
      mockTransporter.sendMail.mockRejectedValue(new Error("SMTP error"));

      await expect(service.sendMail(mailOptions)).rejects.toThrow("SMTP error");
    });

    it("should get from address from config service", async () => {
      await service.onModuleInit();
      mockTransporter.sendMail.mockResolvedValue({ messageId: "456" });

      await service.sendMail(mailOptions);

      expect(configService.get).toHaveBeenCalledWith("roundCubeUser");
    });
  });
});
