import { RowDataPacket } from 'mysql2';

export interface TrainerRow extends RowDataPacket {
  id: number;
  user_id: number;
  specialization: string;
  session_rate: number;
  commission_rate: number;
  shift_start: string | null;
  shift_end: string | null;
  status: string;
  name: string;
  email: string;
}

export interface SlotRow extends RowDataPacket {
  id: number;
  trainer_id: number;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}
