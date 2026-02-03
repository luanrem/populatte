import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { User } from '../../../core/entities/user.entity';
import { UserRepository } from '../../../core/repositories/user.repository';
import { ExtensionAuthService } from '../extension-auth.service';

export interface AuthenticatedRequest extends Request {
  user: User;
}

@Injectable()
export class ExtensionAuthGuard implements CanActivate {
  private readonly logger = new Logger(ExtensionAuthGuard.name);

  public constructor(
    private readonly extensionAuthService: ExtensionAuthService,
    private readonly userRepository: UserRepository,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const payload = await this.extensionAuthService.verifyExtensionToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      this.logger.error(`User not found for token: ${payload.userId}`);
      throw new UnauthorizedException('User not found');
    }

    (request as AuthenticatedRequest).user = user;
    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
