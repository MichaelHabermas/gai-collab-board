export type UserRole = 'owner' | 'editor' | 'viewer';

export interface IUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface IBoardMember {
  uid: string;
  role: UserRole;
  joinedAt: number;
  email?: string;
  displayName?: string;
}
