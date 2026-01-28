export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  lastSyncedAt: Date | null;
  deletedAt: Date | null;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

export interface UpdateUserData {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

export interface UpsertUserData {
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}
