import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { User } from '../../core/entities/user.entity';
import { ClerkAuthGuard } from '../../infrastructure/auth/guards/clerk-auth.guard';
import { ExtensionAuthGuard } from '../../infrastructure/auth/guards/extension-auth.guard';
import { ExtensionAuthService } from '../../infrastructure/auth/extension-auth.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  exchangeCodeSchema,
  type ExchangeCodeRequest,
  type ExchangeCodeResponse,
  type GenerateCodeResponse,
  type MeResponse,
} from '../dto/extension-auth.dto';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

@Controller('auth')
export class ExtensionAuthController {
  private readonly CODE_EXPIRY_SECONDS = 5 * 60; // 5 minutes

  public constructor(
    private readonly extensionAuthService: ExtensionAuthService,
  ) {}

  @Post('extension-code')
  @UseGuards(ClerkAuthGuard)
  public async generateCode(
    @CurrentUser() user: User,
  ): Promise<GenerateCodeResponse> {
    const code = await this.extensionAuthService.generateCode(user.id);

    return {
      code,
      expiresIn: this.CODE_EXPIRY_SECONDS,
    };
  }

  @Post('extension-token')
  public async exchangeCode(
    @Body(new ZodValidationPipe(exchangeCodeSchema)) body: ExchangeCodeRequest,
  ): Promise<ExchangeCodeResponse> {
    const result = await this.extensionAuthService.exchangeCode(body.code);

    if (!result) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    return {
      token: result.token,
    };
  }

  @Get('extension-me')
  @UseGuards(ExtensionAuthGuard)
  public getMe(@CurrentUser() user: User): MeResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    };
  }
}
