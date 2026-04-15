import { RowDataPacket } from 'mysql2';

export interface MemberRow extends RowDataPacket {
  id: number;
  member_code: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  gender: string | null;
  health_conditions: string | null;
  emergency_contact_phone: string | null;
  membership_plan_id: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  remaining_pt_sessions: number;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface PlanRow extends RowDataPacket {
  id: number;
  name: string;
  duration_months: number;
  price: number;
  pt_sessions: number;
}

export interface PaginatedMembersResponse {
  members: MemberRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FreezeHistoryRow extends RowDataPacket {
  id: number;
  member_id: number;
  freeze_start_date: string;
  freeze_end_date: string | null;
  total_days: number | null;
  created_by: number;
  created_at: Date;
}
