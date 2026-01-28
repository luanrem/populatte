import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import {
  CreateUserData,
  UpdateUserData,
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
}
