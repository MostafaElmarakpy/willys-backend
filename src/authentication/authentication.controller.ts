import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { createSuccessResponse } from 'src/common/utils/api-response-wrapper';
import { EntityFileInterceptor } from 'src/services/upload-media/entity-file.interceptor';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { AuthenticationService } from './authentication.service';
import { ChangeEmailDto } from './dto/changeEmail.dto';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationEmailDto } from './dto/resendVerificationEmail.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { UpdateProfileDto } from './dto/updateProfile.dto';
import { VerifyEmailDto } from './dto/verifyEmail.dto';

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @Version('1')
  async login(@Body() loginDto: LoginDto) {
    const response = await this.authenticationService.login(loginDto);
    return createSuccessResponse(response);
  }

  @Post('refresh')
  @Version('1')
  async refresh(@Body() refreshDto: RefreshDto) {
    const response = await this.authenticationService.refresh(
      refreshDto.refresh_token,
    );
    return createSuccessResponse(response);
  }

  @Post('register')
  @Version('1')
  @UseInterceptors(EntityFileInterceptor('user', 'avatar'))
  async register(
    @UploadedFile() avatar: Express.Multer.File,
    @Body() registerDto: RegisterDto,
  ) {
    const response = await this.authenticationService.register(
      registerDto,
      avatar,
    );
    return createSuccessResponse(response);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @Version('1')
  async logout(@Request() req: any) {
    await this.authenticationService.logout(req);
    return createSuccessResponse([]);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @Version('1')
  async profile(@Request() req: any) {
    const response = await this.authenticationService.profile(req.user.id);
    return createSuccessResponse(response);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile')
  @Version('1')
  @UseInterceptors(EntityFileInterceptor('user', 'avatar'))
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    const response = await this.authenticationService.updateProfile(
      req.user.id,
      updateProfileDto,
      avatar,
    );
    return createSuccessResponse(response);
  }

  @Post('forgot-password')
  @Version('1')
  @Post('reset-password')
  @Version('1')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const response =
      await this.authenticationService.resetPassword(resetPasswordDto);
    return createSuccessResponse({ message: response });
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @Version('1')
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const response = await this.authenticationService.changePassword(
      req.user.id,
      changePasswordDto,
    );
    return createSuccessResponse({ message: response });
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-email')
  @Version('1')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const response =
      await this.authenticationService.verifyEmail(verifyEmailDto);
    return createSuccessResponse({ message: response });
  }

  @UseGuards(JwtAuthGuard)
  @Post('resend-verification-email')
  @Version('1')
  async resendVerificationEmail(
    @Body() resendVerificationEmailDto: ResendVerificationEmailDto,
  ) {
    const response = await this.authenticationService.resendVerificationEmail(
      resendVerificationEmailDto,
    );
    return createSuccessResponse({ message: response });
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  @Version('1')
  async changeEmail(
    @Request() req: any,
    @Body() changeEmailDto: ChangeEmailDto,
  ) {
    const response = await this.authenticationService.changeEmail(
      req.user.id,
      changeEmailDto,
    );
    return createSuccessResponse({ message: response });
  }

  @UseGuards(JwtAuthGuard)
  @Post('delete-account')
  @Version('1')
  async deleteAccount(@Request() req: any) {
    const response = await this.authenticationService.deleteAccount(
      req.user.id,
    );
    return createSuccessResponse({ message: response });
  }
}
