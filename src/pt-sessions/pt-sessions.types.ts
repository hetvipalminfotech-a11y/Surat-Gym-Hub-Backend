import { RowDataPacket } from 'mysql2';

export interface MemberRow extends RowDataPacket {
  id: number;
  member_code: string;
  status: string;
  remaining_pt_sessions: number;
  membership_plan_id: number;
}

export interface TrainerRow extends RowDataPacket {
  id: number;
  specialization: string;
  session_rate: number;
  status: string;
}

export interface SlotRow extends RowDataPacket {
  id: number;
  trainer_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

export interface SessionRow extends RowDataPacket {
  id: number;
  session_code: string;
  member_id: number;
  trainer_id: number;
  slot_id: number;
  session_type: string;
  session_source: string;
  amount_charged: number;
  session_date: string;
  status: string;
  member_name: string;
  trainer_name: string;
}

export interface PaginatedSessionsResponse {
  sessions: SessionRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
