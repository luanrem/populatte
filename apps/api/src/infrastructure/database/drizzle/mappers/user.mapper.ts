import { User } from '../../../../core/entities/user.entity';
import type { UserRow } from '../schema/users.schema';

export class UserMapper {
  public static toDomain(row: UserRow): User {
    return {
      id: row.id,
      clerkId: row.clerkId,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
    };
  }
}
