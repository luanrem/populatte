import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { ClerkService } from '../clerk.service';

export interface AuthenticatedRequest extends Request {
  user: {
    clerkId: string;
  };
}

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  public constructor(private readonly clerkService: ClerkService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    const payload = await this.clerkService.verifySessionToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    (request as AuthenticatedRequest).user = {
      clerkId: payload.sub,
    };

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
