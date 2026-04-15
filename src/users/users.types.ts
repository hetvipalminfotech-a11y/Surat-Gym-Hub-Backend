import { UserRole, UserStatus } from '../common/enums';

export interface UserItem {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface PaginatedUsersResponse {
  users: UserItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
