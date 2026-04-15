import { RowDataPacket } from 'mysql2';

export interface PlanRow extends RowDataPacket {
  id: number;
  name: string;
  duration_months: number;
  price: number;
  pt_sessions: number;
  access_hours: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}
