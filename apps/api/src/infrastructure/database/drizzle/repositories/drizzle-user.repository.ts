import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import {
  CreateUserData,
  UpdateUserData,
  UpsertUserData,
  User,
} from '../../../../core/entities/user.entity';
import { UserRepository } from '../../../../core/repositories/user.repository';
import { DrizzleService } from '../drizzle.service';
import { users } from '../schema';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class DrizzleUserRepository extends UserRepository {
  public constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  public async findById(id: string): Promise<User | null> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    const row = result[0];
    return row ? UserMapper.toDomain(row) : null;
  }

  public async findByClerkId(clerkId: string): Promise<User | null> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkId))
      .limit(1);

    const row = result[0];
    return row ? UserMapper.toDomain(row) : null;
  }

  public async create(data: CreateUserData): Promise<User> {
    const result = await this.drizzle
      .getClient()
      .insert(users)
      .values({
        clerkId: data.clerkId,
        email: data.email,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        imageUrl: data.imageUrl ?? null,
      })
      .returning();

    const row = result[0];
    if (!row) {
      throw new Error('Failed to create user');
    }

    return UserMapper.toDomain(row);
  }

  public async update(clerkId: string, data: UpdateUserData): Promise<User> {
    const result = await this.drizzle
      .getClient()
      .update(users)
      .set({
        ...(data.email !== undefined && { email: data.email }),
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        updatedAt: new Date(),
      })
      .where(eq(users.clerkId, clerkId))
      .returning();

    const row = result[0];
    if (!row) {
      throw new Error(`User not found: ${clerkId}`);
    }

    return UserMapper.toDomain(row);
  }

  public async delete(clerkId: string): Promise<void> {
    await this.drizzle
      .getClient()
      .delete(users)
      .where(eq(users.clerkId, clerkId));
  }

  public async upsert(data: UpsertUserData): Promise<User> {
    const result = await this.drizzle
      .getClient()
      .insert(users)
      .values({
        clerkId: data.clerkId,
        email: data.email,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        imageUrl: data.imageUrl ?? null,
        source: 'clerk_sync',
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.clerkId,
        set: {
          email: sql`EXCLUDED.email`,
          firstName: sql`EXCLUDED.first_name`,
          lastName: sql`EXCLUDED.last_name`,
          imageUrl: sql`EXCLUDED.image_url`,
          updatedAt: sql`NOW()`,
          lastSyncedAt: sql`NOW()`,
        },
        setWhere: sql`
          ${users.email} IS DISTINCT FROM EXCLUDED.email OR
          ${users.firstName} IS DISTINCT FROM EXCLUDED.first_name OR
          ${users.lastName} IS DISTINCT FROM EXCLUDED.last_name OR
          ${users.imageUrl} IS DISTINCT FROM EXCLUDED.image_url
        `,
      })
      .returning();

    const row = result[0];
    if (!row) {
      throw new Error('Upsert failed: no row returned');
    }
    return UserMapper.toDomain(row);
  }
}
