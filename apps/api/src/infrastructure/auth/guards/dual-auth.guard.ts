import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { User } from '../../../core/entities/user.entity';
import { UserRepository } from '../../../core/repositories/user.repository';
import { SyncFailureIndicator } from '../../health/sync-failure.indicator';
import { ClerkService, ClerkTokenPayload } from '../clerk.service';
import { ExtensionAuthService } from '../extension-auth.service';

export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * DualAuthGuard supports both extension JWTs and Clerk session tokens.
 * It tries extension auth first (faster, no JWKS lookup), then falls back to Clerk.
 * Use this guard for endpoints accessed by both the web app and the extension.
 */
@Injectable()
export class DualAuthGuard implements CanActivate {
  private readonly logger = new Logger(DualAuthGuard.name);

  public constructor(
    private readonly extensionAuthService: ExtensionAuthService,
    private readonly clerkService: ClerkService,
    private readonly userRepository: UserRepository,
    private readonly syncFailureIndicator: SyncFailureIndicator,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    // Try extension auth first (faster, no network call to JWKS)
    const extensionPayload =
      await this.extensionAuthService.verifyExtensionToken(token);

    if (extensionPayload) {
      const user = await this.userRepository.findById(extensionPayload.userId);

      if (!user) {
        this.logger.error(
          `Extension user not found: ${extensionPayload.userId}`,
        );
        throw new UnauthorizedException('User not found');
      }

      (request as AuthenticatedRequest).user = user;
      return true;
    }

    // Fall back to Clerk auth
    const clerkPayload = await this.clerkService.verifySessionToken(token);

    if (!clerkPayload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!clerkPayload.email) {
      throw new UnauthorizedException('Missing required claim: email');
    }

    try {
      const user = await this.syncUser(clerkPayload);
      this.syncFailureIndicator.recordSyncAttempt(true);
      (request as AuthenticatedRequest).user = user;
      return true;
    } catch (error) {
      this.syncFailureIndicator.recordSyncAttempt(false);
      this.logger.error('User sync failed during authentication', error);
      throw new ServiceUnavailableException(
        'Authentication service temporarily unavailable',
      );
    }
  }

  private async syncUser(payload: ClerkTokenPayload): Promise<User> {
    const storedUser = await this.userRepository.findByClerkId(payload.sub);
    const needsSync = !storedUser || this.hasChanges(storedUser, payload);

    if (needsSync) {
      this.logger.log(
        `User ${payload.sub} ${storedUser ? 'updated' : 'created'} via request sync`,
      );
      return this.userRepository.upsert({
        clerkId: payload.sub,
        email: payload.email,
        firstName: payload.firstName ?? null,
        lastName: payload.lastName ?? null,
        imageUrl: payload.imageUrl ?? null,
      });
    }

    return storedUser;
  }

  private hasChanges(user: User, payload: ClerkTokenPayload): boolean {
    return (
      user.email !== payload.email ||
      user.firstName !== (payload.firstName ?? null) ||
      user.lastName !== (payload.lastName ?? null) ||
      user.imageUrl !== (payload.imageUrl ?? null)
    );
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
