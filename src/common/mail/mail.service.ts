import { Injectable, type OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { ConfigService } from "src/config/config.service";

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get("roundCubeHost"),
      port: Number(this.configService.get("roundCubePort")),
      secure: true,
      auth: {
        user: this.configService.get("roundCubeUser"),
        pass: this.configService.get("roundCubePassword"),
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.transporter) {
      throw new Error("Transporter not initialized");
    }

    await this.transporter.sendMail({
      from: this.configService.get("roundCubeUser"),
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }
}
