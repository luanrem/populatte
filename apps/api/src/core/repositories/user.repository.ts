import { CreateUserData, UpdateUserData, User } from '../entities/user.entity';

export abstract class UserRepository {
  public abstract findById(id: string): Promise<User | null>;
  public abstract findByClerkId(clerkId: string): Promise<User | null>;
  public abstract create(data: CreateUserData): Promise<User>;
  public abstract update(clerkId: string, data: UpdateUserData): Promise<User>;
  public abstract delete(clerkId: string): Promise<void>;
}
