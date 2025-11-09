import { Injectable } from '@nestjs/common';
import { totp } from 'otplib';
import { HashAlgorithms, KeyEncodings } from 'otplib/core';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class OtpService {
  private get secret() {
    //TOTP_SECRET=s7GTFDpVJ6GPh9Wt84p1zDsPrOzhPwaB6Ex6g9zwbb9JIE2tVkxbxme60mpdDYx4
    return this.configService.get('totpSecret') as string;
  }

  constructor(private readonly configService: ConfigService) {
    totp.options = {
      algorithm: HashAlgorithms.SHA256,
      encoding: KeyEncodings.ASCII,
      digits: 6,
      step: 240,
    };
  }

  generate(...secret: string[]) {
    return totp.generate(this.secret.concat(secret.join('')));
  }

  check(otp: string, ...secret: string[]) {
    return totp.check(otp, this.secret.concat(secret.join('')));
  }
}
