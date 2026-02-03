import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import { eq, and, isNull } from 'drizzle-orm';

import type { User } from '../../core/entities/user.entity';
import { UserRepository } from '../../core/repositories/user.repository';
import { DrizzleService } from '../database/drizzle/drizzle.service';
import {
  extensionCodes,
  type ExtensionCodeRow,
} from '../database/drizzle/schema/extension-codes.schema';
import { extensionConfig } from '../config/extension.config';

interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: Date;
}

interface ExtensionJWTPayload {
  userId: string;
}

@Injectable()
export class ExtensionAuthService {
  private readonly logger = new Logger(ExtensionAuthService.name);
  private readonly lockoutMap = new Map<string, LockoutEntry>();
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  public constructor(
    private readonly drizzleService: DrizzleService,
    private readonly userRepository: UserRepository,
    @Inject(extensionConfig.KEY)
    private readonly config: ConfigType<typeof extensionConfig>,
  ) {}

  public async generateCode(userId: string): Promise<string> {
    const db = this.drizzleService.getClient();

    // Invalidate existing codes for user by setting usedAt
    await db
      .update(extensionCodes)
      .set({ usedAt: new Date() })
      .where(
        and(eq(extensionCodes.userId, userId), isNull(extensionCodes.usedAt)),
      );

    // Generate 6-digit numeric code
    const code = this.generateSixDigitCode();

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MS);

    // Store new code
    await db.insert(extensionCodes).values({
      userId,
      code,
      expiresAt,
    });

    this.logger.log(`Generated connection code for user ${userId}`);

    return code;
  }

  public async exchangeCode(
    code: string,
  ): Promise<{ token: string; user: User } | null> {
    const db = this.drizzleService.getClient();

    // Find the code
    const result = await db
      .select()
      .from(extensionCodes)
      .where(eq(extensionCodes.code, code))
      .limit(1);

    const codeRecord: ExtensionCodeRow | undefined = result[0];

    // Check lockout for this user (if we found the code)
    if (codeRecord && this.isLockedOut(codeRecord.userId)) {
      this.logger.warn(
        `User ${codeRecord.userId} is locked out due to too many failed attempts`,
      );
      return null;
    }

    // Validate code exists, not expired, not used
    if (
      !codeRecord ||
      codeRecord.usedAt !== null ||
      codeRecord.expiresAt < new Date()
    ) {
      // Increment failed attempts if we found the code
      if (codeRecord) {
        this.incrementFailedAttempts(codeRecord.userId);
      }
      this.logger.warn(`Invalid or expired code attempt: ${code}`);
      return null;
    }

    // Mark code as used
    await db
      .update(extensionCodes)
      .set({ usedAt: new Date() })
      .where(eq(extensionCodes.id, codeRecord.id));

    // Reset failed attempts on successful exchange
    this.resetFailedAttempts(codeRecord.userId);

    // Fetch user
    const user = await this.userRepository.findById(codeRecord.userId);
    if (!user) {
      this.logger.error(`User not found for code: ${codeRecord.userId}`);
      return null;
    }

    // Sign JWT
    const token = await this.signExtensionToken(codeRecord.userId);

    this.logger.log(
      `Code exchanged successfully for user ${codeRecord.userId}`,
    );

    return { token, user };
  }

  public async verifyExtensionToken(
    token: string,
  ): Promise<ExtensionJWTPayload | null> {
    try {
      if (!this.config.jwtSecret) {
        throw new Error('Extension JWT secret is not configured');
      }

      const secret = new TextEncoder().encode(this.config.jwtSecret);
      const { payload } = await jwtVerify(token, secret);

      if (!payload.userId || typeof payload.userId !== 'string') {
        this.logger.warn('Invalid token payload: missing userId');
        return null;
      }

      return { userId: payload.userId };
    } catch (error) {
      this.logger.warn('Token verification failed', error);
      return null;
    }
  }

  private async signExtensionToken(userId: string): Promise<string> {
    if (!this.config.jwtSecret) {
      throw new Error('Extension JWT secret is not configured');
    }

    const secret = new TextEncoder().encode(this.config.jwtSecret);
    const expiry = this.parseExpiry(this.config.jwtExpiry);

    const token = await new SignJWT({ userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiry)
      .sign(secret);

    return token;
  }

  private generateSixDigitCode(): string {
    // Generate a random 6-digit number
    const min = 100000;
    const max = 999999;
    const code = Math.floor(Math.random() * (max - min + 1)) + min;
    return code.toString();
  }

  private parseExpiry(expiry: string): string | number {
    // If it's already in the format jose accepts (e.g., "30d", "24h"), return as-is
    // Otherwise, convert to seconds
    if (expiry.match(/^\d+[smhd]$/)) {
      return expiry;
    }

    // Fallback: assume seconds
    const seconds = parseInt(expiry, 10);
    return isNaN(seconds) ? '30d' : seconds;
  }

  private isLockedOut(userId: string): boolean {
    const lockout = this.lockoutMap.get(userId);
    if (!lockout) {
      return false;
    }

    // Check if lockout has expired
    if (lockout.lockedUntil < new Date()) {
      this.lockoutMap.delete(userId);
      return false;
    }

    return lockout.failedAttempts >= this.MAX_FAILED_ATTEMPTS;
  }

  private incrementFailedAttempts(userId: string): void {
    const lockout = this.lockoutMap.get(userId) ?? {
      failedAttempts: 0,
      lockedUntil: new Date(),
    };

    lockout.failedAttempts += 1;

    if (lockout.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      lockout.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION_MS);
      this.logger.warn(
        `User ${userId} locked out until ${lockout.lockedUntil.toISOString()}`,
      );
    }

    this.lockoutMap.set(userId, lockout);
  }

  private resetFailedAttempts(userId: string): void {
    this.lockoutMap.delete(userId);
  }
}
